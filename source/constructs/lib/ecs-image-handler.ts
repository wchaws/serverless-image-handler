import * as path from 'path';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import { Aws, CfnOutput, Construct, Duration, Stack } from '@aws-cdk/core';

const GB = 1024;

export class ECSImageHandler extends Construct {
  private originRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'ForwardAllQueryString', {
    originRequestPolicyName: `${Aws.STACK_NAME}-${Aws.REGION}-FwdAllQS`,
    queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
  });
  private cachePolicy = new cloudfront.CachePolicy(this, 'CacheAllQueryString', {
    cachePolicyName: `${Aws.STACK_NAME}-${Aws.REGION}-CacheAllQS`,
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
  });

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const buckets = getBuckets(this, 'ImageBucket');
    const secret = getSecret(this);
    const table = new dynamodb.Table(this, 'StyleTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    this.cfnOutput('StyleConfig', table.tableName, 'The DynamoDB table for processing style');

    const vpc = getOrCreateVpc(this);
    const taskSubnets = getTaskSubnets(this, vpc);
    const albFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      vpc: vpc,
      cpu: 4 * GB,
      memoryLimitMiB: 8 * GB,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      publicLoadBalancer: getEnablePublicALB(this),
      taskSubnets: {
        subnets: taskSubnets,
      },
      desiredCount: getECSDesiredCount(this),
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../new-image-handler')),
        containerPort: 8080,
        environment: Object.assign({
          REGION: Aws.REGION,
          AWS_REGION: Aws.REGION,
          VIPS_DISC_THRESHOLD: '600m', // https://github.com/lovell/sharp/issues/1851
          SRC_BUCKET: buckets[0].bucketName,
          STYLE_TABLE_NAME: table.tableName,
          SECRET_NAME: secret.secretArn,
        }, scope.node.tryGetContext('env')),
      },
    });
    albFargateService.targetGroup.configureHealthCheck({
      path: '/',
      healthyThresholdCount: 3,
    });
    albFargateService.service.autoScaleTaskCount({
      minCapacity: 8,
      maxCapacity: 20,
    }).scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
      scaleOutCooldown: Duration.seconds(10),
    });

    const taskRole = albFargateService.taskDefinition.taskRole;
    table.grantReadData(taskRole);
    for (const bkt of buckets) {

      taskRole.addToPrincipalPolicy(new iam.PolicyStatement({
        actions: [
          's3:GetObject*',
          's3:GetBucket*',
          's3:List*',
          's3:PutObject*',
          's3:Abort*',
        ],
        resources: [bkt.bucketArn, bkt.bucketArn + '/*'],
      }));
    }

    secret.grantRead(albFargateService.taskDefinition.taskRole);

    // TODO: Add restriction access to ALB
    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/restrict-access-to-load-balancer.html
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-listenerrule.html

    if (getEnableCloudFront(this)) {
      buckets.forEach((bkt, index) => {
        const bktoai = new cloudfront.OriginAccessIdentity(this, `S3Origin${index}`, {
          comment: `Identity for s3://${bkt.bucketName}`,
        });
        const bktplcy = new iam.PolicyStatement({
          resources: [bkt.arnForObjects('*')],
          actions: ['s3:GetObject'],
          principals: [bktoai.grantPrincipal],
        });
        bkt.addToResourcePolicy(bktplcy);

        this.cfnOutput(`BucketPolicy${index}`, `${JSON.stringify(bktplcy.toStatementJson())}`, `NOTICE!: Please add this statement in the bucket policy of bucket${index}: ${bkt.bucketName}`);

        this.distribution(new origins.OriginGroup({
          primaryOrigin: new origins.LoadBalancerV2Origin(
            albFargateService.loadBalancer,
            {
              protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
              customHeaders: {
                'x-bucket': bkt.bucketName,
              },
            }),
          fallbackOrigin: new origins.S3Origin(
            bkt,
            {
              originAccessIdentity: bktoai,
            }),
          fallbackStatusCodes: [403],
        }), index, `for bucket${index}: ${bkt.bucketName}`);
      });
    }
  }

  private distribution(origin: cloudfront.IOrigin, index: number, msg?: string) {
    const dist = new cloudfront.Distribution(this, `Distribution${index}`, {
      comment: `${Stack.of(this).stackName} distribution${index}`,
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: this.originRequestPolicy,
        cachePolicy: this.cachePolicy,
      },
      errorResponses: [
        { httpStatus: 500, ttl: Duration.seconds(10) },
        { httpStatus: 501, ttl: Duration.seconds(10) },
        { httpStatus: 502, ttl: Duration.seconds(10) },
        { httpStatus: 503, ttl: Duration.seconds(10) },
        { httpStatus: 504, ttl: Duration.seconds(10) },
      ],
    });

    this.cfnOutput(`DistributionUrl${index}`, `https://${dist.distributionDomainName}`, `The CloudFront distribution url${index} ${msg ?? ''}`);
  }

  private cfnOutput(id: string, value: string, description?: string) {
    const o = new CfnOutput(this, id, { value, description });
    o.overrideLogicalId(id);
    return o;
  }
}

function getOrCreateVpc(scope: Construct): ec2.IVpc {
  if (scope.node.tryGetContext('use_default_vpc') === '1' || process.env.CDK_USE_DEFAULT_VPC === '1') {
    return ec2.Vpc.fromLookup(scope, 'Vpc', { isDefault: true });
  } else if (scope.node.tryGetContext('use_vpc_id')) {
    const vpcFromLookup = ec2.Vpc.fromLookup(scope, 'Vpc', { vpcId: scope.node.tryGetContext('use_vpc_id') });
    const privateSubnetIds: string[] = scope.node.tryGetContext('subnet_ids');
    let publicSubnetIds: string[] = [];
    vpcFromLookup.publicSubnets.forEach((subnet) => {
      publicSubnetIds.push(subnet.subnetId);
    });
    const vpc = ec2.Vpc.fromVpcAttributes(scope, 'VpcFromAttributes', {
      availabilityZones: vpcFromLookup.availabilityZones,
      vpcId: vpcFromLookup.vpcId,
      publicSubnetIds: publicSubnetIds,
      privateSubnetIds: privateSubnetIds,
    });
    return vpc;
  }
  return new ec2.Vpc(scope, 'Vpc', { maxAzs: 3, natGateways: 1 });
}

function getTaskSubnets(scope: Construct, vpc: ec2.IVpc): ec2.ISubnet[] {
  const subnetIds: string[] = scope.node.tryGetContext('subnet_ids');
  let subnets: ec2.ISubnet[] = [];
  if (subnetIds) {
    subnetIds.forEach((subnetId, index) => {
      subnets.push(ec2.Subnet.fromSubnetId(scope, 'subnet' + index, subnetId));
    });
    return subnets;
  } else {
    return vpc.privateSubnets;
  }
}

function getEnablePublicALB(scope: Construct, defaultCount: boolean = true): boolean {
  const publicLoadBalancer = scope.node.tryGetContext('enable_public_alb');
  if (publicLoadBalancer === false) {
    return publicLoadBalancer;
  } else {
    return defaultCount;
  }
}

function getEnableCloudFront(scope: Construct, defaultCount: boolean = true): boolean {
  const enableCloudFront = scope.node.tryGetContext('enable_cloudfront');
  if (enableCloudFront === false) {
    return enableCloudFront;
  } else {
    return defaultCount;
  }
}

function getBuckets(scope: Construct, id: string): s3.IBucket[] {
  const buckets: string[] = scope.node.tryGetContext('buckets');
  if (!Array.isArray(buckets)) {
    throw new Error('Can\'t find context key="buckets" or the context key="buckets" is not an array of string.');
  }
  if (buckets.length < 1) {
    throw new Error('You must specify at least one bucket.');
  }

  return buckets.map((bkt: string, index: number) => s3.Bucket.fromBucketName(scope, `${id}${index}`, bkt));
}

function getSecret(scope: Construct): secretsmanager.ISecret {
  const secretArn = scope.node.tryGetContext('secret_arn');
  if (!!secretArn) {
    return secretsmanager.Secret.fromSecretAttributes(scope, 'ImportedSecret', {
      secretArn: secretArn,
    });
  } else {
    throw new Error('You must specify one secret manager arn for POST security.');
  }
}

function getECSDesiredCount(scope: Construct, defaultCount: number = 8): number {
  const desiredCount = scope.node.tryGetContext('ecs_desired_count');
  if (desiredCount) {
    return desiredCount;
  }
  return defaultCount;
}