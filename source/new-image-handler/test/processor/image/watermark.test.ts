import * as sharp from 'sharp';
import { Features } from '../../../src/processor';
import { WatermarkAction } from '../../../src/processor/image/watermark';
import { mkctx } from './utils';

const testText = 'hello 世界 !';
const testImgFile = 'aws_logo.png';

const testTextbuff = Buffer.from(testText, 'utf-8');
const testImgbuff = Buffer.from(testImgFile, 'utf-8');

const base64Text = testTextbuff.toString('base64');
const base64ImgFile = testImgbuff.toString('base64');

const testTextParam = `watermark,text_${base64Text},rotate_25,g_se,t_70,color_ff9966`;
const testImgParam = `watermark,image_${base64ImgFile},rotate_25,g_nw,t_70`;
const testMixedParam = `watermark,image_${base64ImgFile},text_${base64Text},g_nw,t_20,align_2,interval_5,size_14`;

test(testTextParam, async () => {
  const ctx = await mkctx('example.jpg');

  const action = new WatermarkAction();
  await action.process(ctx, testTextParam.split(','));

  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test(testImgParam, async () => {
  const ctx = await mkctx('example.jpg');

  const action = new WatermarkAction();
  await action.process(ctx, testImgParam.split(','));

  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test(testMixedParam, async () => {
  const ctx = await mkctx('example.jpg');

  const action = new WatermarkAction();
  await action.process(ctx, testMixedParam.split(','));

  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test(`disable ${Features.ReadAllAnimatedFrames}`, async () => {
  const ctx = await mkctx('example.gif');
  const action = new WatermarkAction();
  action.beforeNewContext(ctx, testMixedParam.split(','));

  expect(ctx.features[Features.ReadAllAnimatedFrames]).toBe(false);
});