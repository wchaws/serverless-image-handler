import * as sharp from 'sharp';
import { Features } from '../../src/processor';
import { ImageProcessor } from '../../src/processor/image';
import { ResizeAction } from '../../src/processor/image/resize';
import { StyleProcessor } from '../../src/processor/style';
import { MemKVStore, NullStore } from '../../src/store';
import { fixtureStore } from './image/utils';


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
  const image = sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  });
  const ctx = { uri: '', image, bufferStore: new NullStore(), features: {} };
  await ImageProcessor.getInstance().process(ctx, 'image/resize,w_100,h_100,m_fixed,limit_0/'.split('/'));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(100);
  expect(info.height).toBe(100);
});

test('image/crop,w_100,h_100/rounded-corners,r_10/format,png', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', fixtureStore);
  await ImageProcessor.getInstance().process(ctx, 'image/crop,w_100,h_100/rounded-corners,r_10/format,png'.split('/'));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(100);
  expect(info.height).toBe(100);
  expect(info.channels).toBe(4);
});

test('image/resize,w_100/rounded-corners,r_10/format,png', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', fixtureStore);
  await ImageProcessor.getInstance().process(ctx, 'image/resize,w_100/rounded-corners,r_10/format,png'.split('/'));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.channels).toBe(4);
});

test('image/resize,w_50/crop,w_100,h_100/rounded-corners,r_100/format,png', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', fixtureStore);
  await ImageProcessor.getInstance().process(ctx, 'image/resize,w_50/crop,w_100,h_100/rounded-corners,r_100/format,png'.split('/'));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(50);
  expect(info.height).toBe(33);
  expect(info.channels).toBe(4);
});

test('image/resize,w_20/indexcrop,x_50,i_0/', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', fixtureStore);
  await ImageProcessor.getInstance().process(ctx, 'image/resize,w_20/indexcrop,x_50,i_0/'.split('/'));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(20);
});

test('example.gif?x-oss-process=image/format,jpg', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.gif', fixtureStore);
  await ImageProcessor.getInstance().process(ctx, 'image/format,jpg'.split('/'));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(500);
  expect(info.height).toBe(300);
  expect(info.channels).toBe(3);
});

test('example.jpg?x-oss-process=image/resize,w_200/rotate,90', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', fixtureStore);
  await ImageProcessor.getInstance().process(ctx, 'image/resize,w_200/rotate,90'.split('/'));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(134);
  expect(info.height).toBe(200);
  expect(info.channels).toBe(3);
});

test('autowebp: example.jpg', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', fixtureStore);
  ctx.features[Features.AutoWebp] = true;
  await ImageProcessor.getInstance().process(ctx, []);
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.format).toBe('webp');
});

test('autowebp: example.jpg?x-oss-process=image/format,png', async () => {
  const ctx = await ImageProcessor.getInstance().newContext('example.jpg', fixtureStore);
  ctx.features[Features.AutoWebp] = true;
  await ImageProcessor.getInstance().process(ctx, 'image/format,png'.split('/'));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.format).toBe('png');
});

test('style processor test', async () => {
  const styleStore = new MemKVStore({
    style1: { id: 'style1', style: 'image/resize,w_100,h_100,m_fixed,limit_0/' },
  });
  const p = StyleProcessor.getInstance(styleStore);
  const ctx = await p.newContext('example.jpg', fixtureStore);
  const { data } = await p.process(ctx, 'style/style1'.split('/'));
  const metadata = await sharp(data).metadata();

  expect(metadata.width).toBe(100);
  expect(metadata.height).toBe(100);
});

test('style processor test invalid style name', async () => {
  const image = sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  });
  const ctx = { uri: '', image, bufferStore: new NullStore(), features: {} };
  const styleStore = new MemKVStore({
    style1: { id: 'style1', style: 'image/resize,w_100,h_100,m_fixed,limit_0/' },
  });
  void expect(StyleProcessor.getInstance(styleStore).process(ctx, 'style/ #$ '.split('/')))
    .rejects.toThrowError(/Invalid style name/);
});

test('style processor not found', async () => {
  const image = sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  });
  const ctx = { uri: '', image, bufferStore: new NullStore(), features: {} };
  const styleStore = new MemKVStore({
    style1: { id: 'style1', style: 'image/resize,w_100,h_100,m_fixed,limit_0/' },
  });
  void expect(StyleProcessor.getInstance(styleStore).process(ctx, 'style/notfound'.split('/')))
    .rejects.toThrowError(/Style not found/);
});