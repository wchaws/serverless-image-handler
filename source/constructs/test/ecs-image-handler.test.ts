import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { ECSImageHandlerStack } from '../lib/constructs-stack';

test('Snapshot', () => {
  const app = new App({
    context: {
      buckets: ['bucket-0'],
      secret_arn: 'arn:aws:secretsmanager:us-east-9:123456789012:secret:test-aaabbb',
      config_json_parameter_name: 'config_json_parameter_name',
    },
  });
  const stack = new ECSImageHandlerStack(app, 'test');

  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});