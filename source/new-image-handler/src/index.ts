import * as Koa from 'koa'; // http://koajs.cn
import * as Router from 'koa-router';
import * as bodyParser from 'koa-bodyparser';
import * as logger from 'koa-logger';
import * as sharp from 'sharp';
import config from './config';
import debug from './debug';
import { bufferStore, getProcessor, parseRequest } from './default';
import { InvalidArgument, Features } from './processor';
import { IImageContext } from './processor/image';
import * as S3 from 'aws-sdk/clients/s3';

const DefaultBufferStore = bufferStore();
const app = new Koa();
const router = new Router();

app.use(logger())
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
    console.log(ctx.body);
  }
});

router.get(['/', '/ping'], async (ctx) => {
  ctx.body = 'ok';
});

router.get(['/debug', '/_debug'], async (ctx) => {
  ctx.body = debug();
});

router.get('/(.*)', async (ctx) => {
  const { data, type } = await ossprocess(ctx);
  ctx.body = data;
  ctx.type = type;
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

async function ossprocess(ctx: Koa.ParameterizedContext): Promise<{ data: any; type: string; }> {
  const { uri, actions } = parseRequest(ctx.path, ctx.query);
  const bs = getBufferStore(ctx);
  if (actions.length > 1) {
    const processor = getProcessor(actions[0]);
    const { buffer } = await bs.get(uri);
    const imagectx: IImageContext = {
      image: sharp(buffer, { animated: true }),
      bufferStore: bs,
      features: {},
    };
    await processor.process(imagectx, actions);

    if (imagectx.features[Features.ReturnInfo]) {
      return { data: imagectx.info, type: 'json' };
    } else {
      const { data, info } = await imagectx.image.toBuffer({ resolveWithObject: true });
      return { data: data, type: info.format };
    }
  } else {
    const { buffer, type } = await bs.get(uri);
    return { data: buffer, type: type };
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
  }
}
