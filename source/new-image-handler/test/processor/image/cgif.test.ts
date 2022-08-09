import * as sharp from 'sharp';
import { CgifAction } from '../../../src/processor/image/cgif';
import { mkctx } from './utils';


test('cgif,s_5', async () => {
  const ctx = await mkctx('example.gif');
  const action = new CgifAction();
  await action.beforeNewContext(ctx, 'cgif,s_5'.split(','));
  const { info } = await ctx.image.gif().toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.gif.id);
});

test('cgif beforeNewContext', async () => {
  const ctx = await mkctx('example.gif');
  const action = new CgifAction();

  expect(() => {
    action.beforeNewContext(ctx, 'cgif,s'.split(','));
  }).toThrowError(/Unkown param: \"s\"/);

  expect(() => {
    action.beforeNewContext(ctx, 'cgif,s_d'.split(','));
  }).toThrowError(/Unkown param: \"s\"/);

  expect(() => {
    action.beforeNewContext(ctx, 'cgif'.split(','));
  }).toThrowError(/Cut gif param error, e.g: cgif,s_1/);
});