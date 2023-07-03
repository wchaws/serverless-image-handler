// eslint-disable-next-line import/no-unresolved
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import * as HttpErrors from 'http-errors';
import config from './config';
import debug from './debug';
import { bufferStore, getProcessor, parseRequest } from './default';
import * as is from './is';
import { Features } from './processor';


export const handler = WrapError(async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log('event:', JSON.stringify(event));

  if (event.rawPath === '/' || event.rawPath === '/ping') {
    return resp(200, 'ok');
  } else if (event.rawPath === '/_debug') {
    console.log(JSON.stringify(debug()));
    return resp(400, 'Please check your server logs for more details!');
  }

  const accept = event.headers.Accept ?? event.headers.accept ?? '';
  const autoWebp = config.autoWebp && accept.includes('image/webp');

  console.log('autoWebp:', autoWebp);

  const bs = getBufferStore(event);
  const { uri, actions } = parseRequest(event.rawPath, event.queryStringParameters ?? {});

  if (actions.length > 1) {
    const processor = getProcessor(actions[0]);
    const context = await processor.newContext(uri, actions, bs);
    context.features[Features.AutoWebp] = autoWebp;
    const { data, type } = await processor.process(context);

    return resp(200, data, type, context.headers);
  } else {
    const { buffer, type, headers } = await bs.get(uri, bypass);

    return resp(200, buffer, type, headers);
  }
});

function bypass() {
  // NOTE: This is intended to tell CloudFront to directly access the s3 object without through API GW.
  throw new HttpErrors[403]('Please visit s3 directly');
}

function resp(code: number, body: any, type?: string, headers?: { [key: string]: any }): APIGatewayProxyResultV2 {
  const isBase64Encoded = Buffer.isBuffer(body);
  let data: string = '';
  if (isBase64Encoded) {
    data = body.toString('base64');
  } else if (is.string(body)) {
    data = body;
    type = 'text/plain';
  } else {
    data = JSON.stringify(body);
    type = 'application/json';
  }

  return {
    isBase64Encoded,
    statusCode: code,
    headers: Object.assign({ 'Content-Type': type ?? 'text/plain' }, headers),
    body: data,
  };
}

interface LambdaHandlerFn {
  (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2>;
}


function WrapError(fn: LambdaHandlerFn): LambdaHandlerFn {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    try {
      return await fn(event);
    } catch (err: any) {
      console.error(err);
      // ENOENT support
      if (err.code === 'ENOENT') {
        err.status = 404;
        err.message = 'NotFound';
      }
      const statusCode = err.statusCode ?? err.status ?? 500;
      const body = {
        status: statusCode,
        name: err.name,
        message: err.message,
      };
      return resp(statusCode, body);
    }
  };
}

const DefaultBufferStore = bufferStore();

function getBufferStore(event: APIGatewayProxyEventV2) {
  const bucket = event.headers['x-bucket'];
  if (bucket) {
    return bufferStore(bucket);
  }
  return DefaultBufferStore;
}