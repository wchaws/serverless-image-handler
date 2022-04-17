import * as sharp from 'sharp';
import { InterlaceAction } from '../../../src/processor/image/interlace';
import { mkctx } from './utils';

test('Interlace action validate', () => {
  const action = new InterlaceAction();
  const param1 = action.validate('interlace,1'.split(','));
  expect(param1).toEqual({
    interlace: true,
  });

  expect(() => {
    action.validate('interlace'.split(','));
  }).toThrowError(/Interlace param error, e.g: interlace,1/);

  expect(() => {
    action.validate('interlace,xx,22'.split(','));
  }).toThrowError(/Interlace param error, e.g: interlace,1/);

  expect(() => {
    action.validate('interlace,ab'.split(','));
  }).toThrowError(/Interlace must be 0 or 1/);

  expect(() => {
    action.validate('interlace,-3'.split(','));
  }).toThrowError(/Interlace must be 0 or 1/);

  expect(() => {
    action.validate('interlace,3'.split(','));
  }).toThrowError(/Interlace must be 0 or 1/);

});


test('interlace,1', async () => {
  const ctx = await mkctx('example.jpg');
  const action = new InterlaceAction();
  await action.process(ctx, 'interlace,1'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});


test('interlace,0', async () => {
  const ctx = await mkctx('example.jpg');
  const action = new InterlaceAction();
  await action.process(ctx, 'interlace,0'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test('interlace,1 for gif', async () => {
  const ctx = await mkctx('example.gif');
  const action = new InterlaceAction();
  await action.process(ctx, 'interlace,1'.split(','));
  const { data, info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.format).toBe(sharp.format.gif.id);

  const metadata = await sharp(data, { animated: true }).metadata();
  expect(metadata.pages).toBe(3);
});