import * as sharp from 'sharp';
import { Features, IActionOpts, IProcessContext, ReadOnly } from '../../src/processor';
import { ImageProcessor } from '../../src/processor/image';
import { BaseImageAction } from '../../src/processor/image/_base';
import { ResizeAction } from '../../src/processor/image/resize';
import { StyleProcessor } from '../../src/processor/style';
import { VideoProcessor } from '../../src/processor/video';
import { MemKVStore, SharpBufferStore } from '../../src/store';
import { fixtureStore, mkctx } from './image/utils';


test('image processor singleton', () => {
  const p1 = ImageProcessor.getInstance();
  const p2 = ImageProcessor.getInstance();

  expect(p1).toBe(p2);
});

test('processor register', () => {
  class MyResizeAction extends ResizeAction {
    public readonly name: string = 'my-resize';
  }
  const p = ImageProcessor.getInstance();
  const resizeAction = new MyResizeAction();

  p.register(resizeAction);

  expect(resizeAction.name).toBe('my-resize');
  expect(p.action('my-resize') === resizeAction).toBeTruthy();
});

test('image processor test', async () => {
  const bs = new SharpBufferStore(sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  }).png());
  const ctx = await mkctx('', 'image/resize,w_100,h_100,m_fixed,limit_0/'.split('/'), bs);
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(100);
  expect(info.height).toBe(100);
});

test('image/crop,w_100,h_100/rounded-corners,r_10/format,png', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', 'image/crop,w_100,h_100/rounded-corners,r_10/format,png'.split('/'), fixtureStore);
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(100);
  expect(info.height).toBe(100);
  expect(info.channels).toBe(4);
});

test('image/resize,w_100/rounded-corners,r_10/format,png', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', 'image/resize,w_100/rounded-corners,r_10/format,png'.split('/'), fixtureStore);
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.channels).toBe(4);
});

test('image/resize,w_50/crop,w_100,h_100/rounded-corners,r_100/format,png', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', 'image/resize,w_50/crop,w_100,h_100/rounded-corners,r_100/format,png'.split('/'), fixtureStore);
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(50);
  expect(info.height).toBe(33);
  expect(info.channels).toBe(4);
});

test('example.jpg?x-oss-process=image/resize,w_50/threshold,10', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', 'image/resize,w_50/threshold,10'.split('/'), fixtureStore);
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(50);
  expect(info.height).toBe(33);
  expect(info.channels).toBe(3);
});

test('example.jpg?x-oss-process=image/resize,w_50/threshold,23000', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', 'image/resize,w_50/threshold,23000'.split('/'), fixtureStore);
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(400);
  expect(info.height).toBe(267);
  expect(info.channels).toBe(3);
});

test('image/resize,w_20/indexcrop,x_50,i_0/', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', 'image/resize,w_20/indexcrop,x_50,i_0/'.split('/'), fixtureStore);
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(20);
});

test('example.gif?x-oss-process=image/format,jpg', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.gif', 'image/format,jpg'.split('/'), fixtureStore);
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(500);
  expect(info.height).toBe(300);
  expect(info.channels).toBe(3);
});

test('example.jpg?x-oss-process=image/resize,w_200/rotate,90', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', 'image/resize,w_200/rotate,90'.split('/'), fixtureStore);
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(134);
  expect(info.height).toBe(200);
  expect(info.channels).toBe(3);
});

test('example.gif?x-oss-process=image/format,png', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.gif', 'image/format,png'.split('/'), fixtureStore);
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(ctx.features[Features.ReadAllAnimatedFrames]).toBe(false);
  expect(info.width).toBe(500);
  expect(info.height).toBe(300);
  expect(info.format).toBe('png');
});

test('autowebp: example.jpg', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', [], fixtureStore);
  ctx.features[Features.AutoWebp] = true;
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.format).toBe('webp');
});

test('autowebp: example.jpg?x-oss-process=image/format,png', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', 'image/format,png'.split('/'), fixtureStore);
  ctx.features[Features.AutoWebp] = true;
  await ImageProcessor.getInstance().process(ctx);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.format).toBe('png');
});

test.skip('example.jpg?x-oss-process=video/snapshot,t_1,f_jpg,m_fast', async () => {
  const ctx = await VideoProcessor.getInstance().newContext('example-video.mp4', 'video/snapshot,t_1,f_jpg,m_fast'.split('/'), fixtureStore);
  const { data, type } = await VideoProcessor.getInstance().process(ctx);
  const metadata = await sharp(data).metadata();

  expect(type).toBe('image/image/jpeg');
  expect(metadata.format).toBe('jpeg');
});

test('example.jpg?x-oss-process=image/fake/info', async () => {
  const mockValidate = jest.fn<{}, any[]>();
  const mockProcess = jest.fn<void, any[]>();

  class FakeAction extends BaseImageAction {
    public name: string = 'fake';
    validate(params: string[]): ReadOnly<IActionOpts> {
      return mockValidate(params);
    }
    process(ctx: IProcessContext, params: string[]): Promise<void> {
      return Promise.resolve(mockProcess(ctx, params));
    }
  }

  ImageProcessor.getInstance().register(new FakeAction());

  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', 'image/fake/info'.split('/'), fixtureStore);
  const { data, type } = await ImageProcessor.getInstance().process(ctx);

  expect(type).toBe('application/json');
  expect(data).toEqual({
    FileSize: { value: '21839' },
    Format: { value: 'jpg' },
    ImageHeight: { value: '267' },
    ImageWidth: { value: '400' },
  });
  expect(mockProcess).not.toBeCalled();

});

test('style processor test', async () => {
  const styleStore = new MemKVStore({
    style1: { id: 'style1', style: 'image/resize,w_100,h_100,m_fixed,limit_0/' },
  });
  const p = StyleProcessor.getInstance(styleStore);
  const ctx = await p.newContext('example.jpg', 'style/style1'.split('/'), fixtureStore);
  const { data } = await p.process(ctx);
  const metadata = await sharp(data).metadata();

  expect(metadata.width).toBe(100);
  expect(metadata.height).toBe(100);
});

test('style processor test invalid style name', async () => {
  const bs = new SharpBufferStore(sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  }).png());
  const ctx = await mkctx('', 'style/ #$ '.split('/'), bs);
  const styleStore = new MemKVStore({
    style1: { id: 'style1', style: 'image/resize,w_100,h_100,m_fixed,limit_0/' },
  });
  void expect(StyleProcessor.getInstance(styleStore).process(ctx))
    .rejects.toThrowError(/Invalid style name/);
});

test('style processor not found', async () => {
  const bs = new SharpBufferStore(sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  }).png());
  const ctx = await mkctx('', 'style/notfound'.split('/'), bs);
  const styleStore = new MemKVStore({
    style1: { id: 'style1', style: 'image/resize,w_100,h_100,m_fixed,limit_0/' },
  });
  void expect(StyleProcessor.getInstance(styleStore).process(ctx))
    .rejects.toThrowError(/Style not found/);
});

test('f.jpg?x-oss-process=image/resize,w_100/', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('f.jpg', 'image/resize,w_100/'.split('/'), fixtureStore);
  const { data, type } = await ImageProcessor.getInstance().process(ctx);
  const metadata = await sharp(data).metadata();

  expect(type).toBe('image/jpeg');
  expect(metadata.width).toBe(100);
  expect(metadata.height).toBe(127);
});

test('f.jpg?x-oss-process=image/resize,w_100/auto-orient,0', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('f.jpg', 'image/resize,w_100/auto-orient,0'.split('/'), fixtureStore);
  const { data, type } = await ImageProcessor.getInstance().process(ctx);
  const metadata = await sharp(data).metadata();

  expect(type).toBe('image/jpeg');
  expect(metadata.width).toBe(100);
  expect(metadata.height).toBe(78);
  expect(ctx.headers['Last-Modified']).toBe('Wed, 21 Oct 2014 07:28:00 GMT');
});

test('f.jpg?x-oss-process=image/strip-metadata', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('f.jpg', 'image/strip-metadata'.split('/'), fixtureStore);
  const { data } = await ImageProcessor.getInstance().process(ctx);
  const metadata = await sharp(data).metadata();

  expect(ctx.metadata.exif).not.toBeUndefined();
  expect(metadata.exif).toBeUndefined();
});

test('f.jpg?x-oss-process=image/resize,w_100/auto-orient,1', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('f.jpg', 'image/resize,w_100/auto-orient,1'.split('/'), fixtureStore);
  const { data, type } = await ImageProcessor.getInstance().process(ctx);
  const metadata = await sharp(data).metadata();

  expect(type).toBe('image/jpeg');
  expect(metadata.width).toBe(100);
  expect(metadata.height).toBe(128);
});

test('example.gif?x-oss-process=image/cgif,s_2', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.gif', 'image/cgif,s_2'.split('/'), fixtureStore);
  const { data } = await ImageProcessor.getInstance().process(ctx);
  const metadata = await sharp(data).metadata();
  expect(metadata.pages).toBe(2);
});

test('example.gif?x-oss-process=image/cgif,s_100', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.gif', 'image/cgif,s_100'.split('/'), fixtureStore);
  const { data } = await ImageProcessor.getInstance().process(ctx);
  const metadata = await sharp(data).metadata();
  expect(metadata.pages).toBe(3);
});