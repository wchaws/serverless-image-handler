import * as S3 from 'aws-sdk/clients/s3';
import * as HttpErrors from 'http-errors';
import * as Koa from 'koa'; // http://koajs.cn
import * as bodyParser from 'koa-bodyparser';
import * as logger from 'koa-logger';
import * as Router from 'koa-router';
import config from './config';
import debug from './debug';
import { bufferStore, getProcessor, parseRequest } from './default';
import { IHttpHeaders, InvalidArgument } from './processor';

const DefaultBufferStore = bufferStore();
const app = new Koa();
const router = new Router();

app.use(logger());
app.use(errorHandler());
app.use(bodyParser());

router.post('/images', async (ctx) => {
  console.log('post request body=', ctx.request.body);

  const opt = validatePostRequest(ctx);
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

router.get('/(.*)', async (ctx) => {
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

interface PostBody {
  params: string;
  sourceBucket: string;
  sourceObject: string;
  targetBucket: string;
  targetObject: string;
}

function validatePostRequest(ctx: Koa.ParameterizedContext): PostBody {
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