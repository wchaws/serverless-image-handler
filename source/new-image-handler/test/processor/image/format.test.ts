import * as sharp from 'sharp';
import { Features } from '../../../src/processor';
import { FormatAction } from '../../../src/processor/image/format';
import { mkctx } from './utils';

test('format action validate', () => {
  const action = new FormatAction();
  const param1 = action.validate('format,jpg'.split(','));
  expect(param1).toEqual({
    format: 'jpg',
  });

  expect(() => {
    action.validate('format'.split(','));
  }).toThrowError(/Format param error, e.g: format,jpg/);


  expect(() => {
    action.validate('format,jpg,png'.split(','));
  }).toThrowError(/Format param error, e.g: format,jpg/);

  expect(() => {
    action.validate('format,abc'.split(','));
  }).toThrowError(/Format must be one of/);


  expect(() => {
    action.validate('format,12'.split(','));
  }).toThrowError(/Format must be one of/);

});


test('format action', async () => {
  const ctx = await mkctx('example.jpg');
  const action = new FormatAction();
  await action.process(ctx, 'format,png'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.png.id);
});

test('format action', async () => {
  const ctx = await mkctx('example.jpg');
  const action = new FormatAction();
  await action.process(ctx, 'format,webp'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.webp.id);
});

test('format action', async () => {
  const ctx = await mkctx('example.jpg');
  const action = new FormatAction();
  await action.process(ctx, 'format,jpg'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test('format,jpeg', async () => {
  const ctx = await mkctx('example.jpg');
  const action = new FormatAction();
  await action.process(ctx, 'format,jpeg'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test('format,gif', async () => {
  const ctx = await mkctx('example.gif');
  const action = new FormatAction();
  await action.process(ctx, 'format,gif'.split(','));
  const { info, data } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.format).toBe(sharp.format.gif.id);

  const metadata = await sharp(data, { animated: true }).metadata();
  expect(metadata.pages).toBe(3);
});

test(`format,png disable ${Features.ReadAllAnimatedFrames}`, async () => {
  const ctx = await mkctx('example.gif');
  const action = new FormatAction();
  action.beforeNewContext(ctx, 'format,png'.split(','));
  expect(ctx.features[Features.ReadAllAnimatedFrames]).toBe(false);
  action.beforeNewContext(ctx, 'format,jpg'.split(','));
  expect(ctx.features[Features.ReadAllAnimatedFrames]).toBe(false);
  action.beforeNewContext(ctx, 'format,jpeg'.split(','));
  expect(ctx.features[Features.ReadAllAnimatedFrames]).toBe(false);
});


test(`format,png enable ${Features.ReadAllAnimatedFrames}`, async () => {
  const ctx = await mkctx('example.gif');
  const action = new FormatAction();
  action.beforeNewContext(ctx, 'format,gif'.split(','));
  expect(ctx.features[Features.ReadAllAnimatedFrames]).toBe(true);
  action.beforeNewContext(ctx, 'format,webp'.split(','));
  expect(ctx.features[Features.ReadAllAnimatedFrames]).toBe(true);
});