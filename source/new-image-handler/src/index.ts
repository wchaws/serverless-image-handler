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

config.isProd = true;
const DefaultBufferStore = bufferStore();
const app = new Koa();
const router = new Router();

// Error handler
app.use(async (ctx, next) => {
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
});

app.use(logger())
app.use(bodyParser());

router.post('/images', async (ctx) => {

  console.log('post reqeust is: ', ctx, ctx.request.body);
  postBodySanityCheck(ctx);

  // Move parameters from POST body to URL path
  ctx.path = ctx.request.body.sourceObj;
  ctx.query['x-oss-process'] = ctx.request.body.params; 

  const dataAndType = await processRequest(ctx);
  if(dataAndType.type == "text"){
    ctx.body = dataAndType.data;

  }else{ // It is buffer in data
    const _s3: S3 = new S3({ region: config.region });
    await _s3.putObject({
      Bucket: ctx.request.body.targetBkt,
      Key: ctx.request.body.targetObj,
      Body: dataAndType.data 
    }).promise();
  }
  ctx.status = 200;
  console.log("Saved to s3 at: ", ctx.request.body.targetBkt, ctx.request.body.targetObj);
})

router.get('/(.*)', async (ctx) => {

  // console.log("get",ctx, next)
  const dataAndType = await processRequest(ctx);
  if(dataAndType.type == "text"){
    ctx.body = dataAndType.data;

  }else{ // It is buffer in data
    ctx.body = dataAndType.data;
    ctx.type = dataAndType.type;
  }
})
   
app.use(router.routes());
app.use(router.allowedMethods);

// Main handler
// app.use(async ctx => {
// });

app.on('error', (err: Error) => {
  const msg = err.stack || err.toString();
  console.error(`\n${msg.replace(/^/gm, '  ')}\n`);
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

function getBufferStore(ctx: Koa.ParameterizedContext) {
  const bucket = ctx.headers['x-bucket'];
  if (bucket) {
    return bufferStore(bucket.toString());
  }
  return DefaultBufferStore;
}

async function processRequest(ctx: Koa.ParameterizedContext): Promise<{ data: any; type: string}> {
  console.log('get', ctx.method)
  if ('/' === ctx.path || '/ping' === ctx.path) {
    ctx.body = 'ok';
  } else if ('/debug' === ctx.path) {
    ctx.body = debug();
  } else {
    console.log("request path and query:", ctx.path, (ctx.query['x-oss-process'] as string) ?? '');
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
        return { data: imagectx.info, type: 'text' };
      } else {
        const { data, info } = await imagectx.image.toBuffer({ resolveWithObject: true });
  
        return { data: data, type: info.format };
      }
    } else {
      const { buffer, type } = await bs.get(uri);
      return { data: buffer, type: type };
    } 
  }
  return {data:"debug|ping", type:"default"};
}

// async function imageToS3ResponseProcesser ( ctx : Koa.ParameterizedContext, imagectx: IImageContext ){
//   const { data, info } = await imagectx.image.toBuffer({ resolveWithObject: true });
//   ctx.body = data;
//   ctx.type = info.format;
// }

// async function directToS3ResponseProcesser ( ctx : Koa.ParameterizedContext, bs: IBufferStore, uri:string ){
//   const { buffer, type } = await bs.get(uri, bypass);

//   ctx.body = buffer;
//   ctx.type = type;
//   console.log("buffer set...")
// }

function postBodySanityCheck (ctx : Koa.ParameterizedContext ){
  const valid = ctx.request.body.sourceBkt  && ctx.request.body.sourceObj && ctx.request.body.targetBkt && ctx.request.body.targetObj;

  if(!valid){
    throw new InvalidArgument('Requre sourceBkt, targetBkt, sourceObj, targetObj');
  }

}