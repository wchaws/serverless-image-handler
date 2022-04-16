import * as sharp from 'sharp';
import { CircleAction } from '../../../src/processor/image/circle';
import { mkctx } from './utils';

test('circle,r_500', async () => {
  const ctx = await mkctx('example.jpg');

  const action = new CircleAction();
  await action.process(ctx, 'circle,r_500'.split(','));

  const { info } = await ctx.image.png().toBuffer({ resolveWithObject: true });

  expect(info.channels).toBe(4);
  expect(info.format).toBe(sharp.format.png.id);
});

test('circle,r_100', async () => {
  const ctx = await mkctx('example.jpg');

  const action = new CircleAction();
  await action.process(ctx, 'circle,r_100'.split(','));

  const { info } = await ctx.image.png().toBuffer({ resolveWithObject: true });

  expect(info.channels).toBe(4);
  expect(info.format).toBe(sharp.format.png.id);
  expect(info.width).toBe(201);
  expect(info.height).toBe(201);
});

test('quality action validate', () => {
  const action = new CircleAction();
  const param1 = action.validate('circle,r_30'.split(','));

  expect(param1).toEqual({ r: 30 });
  expect(() => {
    action.validate('circle,r_'.split(','));
  }).toThrowError(/must be between 1 and 4096/);
  expect(() => {
    action.validate('blur,xx'.split(','));
  }).toThrowError(/Unkown param/);
});
