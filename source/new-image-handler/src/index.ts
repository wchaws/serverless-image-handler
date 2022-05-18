import * as S3 from 'aws-sdk/clients/s3';
import * as SecretsManager from 'aws-sdk/clients/secretsmanager';
import * as HttpErrors from 'http-errors';
import * as Koa from 'koa'; // http://koajs.cn
import * as bodyParser from 'koa-bodyparser';
import * as logger from 'koa-logger';
import * as Router from 'koa-router';
import { RateLimit } from 'koa2-ratelimit';
import config from './config';
import debug from './debug';
import { bufferStore, getProcessor, parseRequest } from './default';
import { IHttpHeaders, InvalidArgument } from './processor';

const DefaultBufferStore = bufferStore();
const app = new Koa();
const router = new Router();
const ratelimit = RateLimit.middleware({
  max: config.RateLimitPerSec * 60,
  interval: { min: 1 },
  timeWait: 0,
  delayAfter: 0,
});

app.use(logger());
app.use(errorHandler());
app.use(bodyParser());

router.post('/images', async (ctx) => {
  console.log('post request body=', ctx.request.body);

  const opt = await validatePostRequest(ctx);
  console.log(opt);
  ctx.path = opt.sourceObject;
  ctx.query['x-oss-process'] = opt.params;
  ctx.headers['x-bucket'] = opt.sourceBucket;

  const { data, type } = await ossprocess(ctx);
  if (type !== 'json') {
    // TODO: Do we need to abstract this with IBufferStore?
    const _s3: S3 = new S3({ region: config.region });
    await _s3.putObject({
      Bucket: opt.targetBucket,
      Key: opt.targetObject,
      Body: data,
    }).promise();

    ctx.body = `saved result to s3://${opt.targetBucket}/${opt.targetObject}`;
  }
});

router.get(['/', '/ping'], async (ctx) => {
  ctx.body = 'ok';
});

router.get(['/debug', '/_debug'], async (ctx) => {
  ctx.status = 400;
  ctx.body = debug();
});

router.get('/(.*)', ratelimit, async (ctx) => {
  const { data, type, headers } = await ossprocess(ctx, bypass);
  ctx.body = data;
  ctx.type = type;
  ctx.set(headers);
});

app.use(router.routes());
app.use(router.allowedMethods);

app.on('error', (err: Error) => {
  const msg = err.stack || err.toString();
  console.error(`\n${msg.replace(/^/gm, '  ')}\n`);
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log('Config:', config);
});

function errorHandler(): Koa.Middleware<Koa.DefaultState, Koa.DefaultContext, any> {
  return async (ctx, next) => {
    try {
      await next();
    } catch (err: any) {
      // ENOENT support
      if (err.code === 'ENOENT') {
        err.status = 404;
        err.message = 'NotFound';
      }
      ctx.status = err.statusCode || err.status || 500;
      ctx.body = {
        status: err.status,
        name: err.name,
        message: err.message,
      };

      ctx.app.emit('error', err, ctx);
    }
  };
}

function getBufferStore(ctx: Koa.ParameterizedContext) {
  const bucket = ctx.headers['x-bucket'];
  if (bucket) {
    return bufferStore(bucket.toString());
  }
  return DefaultBufferStore;
}


async function ossprocess(ctx: Koa.ParameterizedContext, beforeGetFn?: () => void):
Promise<{ data: any; type: string; headers: IHttpHeaders }> {
  const { uri, actions } = parseRequest(ctx.path, ctx.query);
  const bs = getBufferStore(ctx);
  if (actions.length > 1) {
    const processor = getProcessor(actions[0]);
    const context = await processor.newContext(uri, actions, bs);
    const { data, type } = await processor.process(context);
    return { data, type, headers: context.headers };
  } else {
    const { buffer, type, headers } = await bs.get(uri, beforeGetFn);
    return { data: buffer, type: type, headers: headers };
  }
}

async function validatePostRequest(ctx: Koa.ParameterizedContext) {
  // Fox edited in 2022/04/25: enhance the security of the post requests
  const authHeader = ctx.get('X-Client-Authorization');
  const secretHeader = await getHeaderFromSecretsManager();

  if (authHeader !== secretHeader) {
    throw new InvalidArgument('Invalid post header.');
  }

  const body = ctx.request.body;
  if (!body) {
    throw new InvalidArgument('Empty post body.');
  }
  const valid = body.params
    && body.sourceBucket
    && body.sourceObject
    && body.targetBucket
    && body.targetObject;
  if (!valid) {
    throw new InvalidArgument('Invalid post body.');
  }
  return {
    params: body.params,
    sourceBucket: body.sourceBucket,
    sourceObject: body.sourceObject,
    targetBucket: body.targetBucket,
    targetObject: body.targetObject,
  };
}

function bypass() {
  // NOTE: This is intended to tell CloudFront to directly access the s3 object.
  throw new HttpErrors[403]('Please visit s3 directly');
}

// Create a Secrets Manager client
const smclient = new SecretsManager({
  region: config.region,
});

async function getSecretFromSecretsManager() {
  // Load the AWS SDK
  const secretName = config.secretName;
  return smclient.getSecretValue({ SecretId: secretName }).promise();
}

async function getHeaderFromSecretsManager() {
  const secret = await getSecretFromSecretsManager();
  const secretString = secret.SecretString!;
  const keypair = JSON.parse(secretString);
  return keypair['X-Client-Authorization'];
}