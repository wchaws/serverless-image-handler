import { AliCDNResizeAction } from '../../../src/processor/image/alicdnimage';
import { mkctx } from './utils';

test('alicdnresize,fw_800,fh_400', async () => {
  const ctx = await mkctx('example.jpg');

  const action = new AliCDNResizeAction();
  await action.process(ctx, 'alicdnresize,fw_800,fh_400'.split(','));

  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(800);
  expect(info.height).toBe(400);
});

test('alicdnresize,l_100', async () => {
  const ctx = await mkctx('example.jpg');

  const action = new AliCDNResizeAction();
  await action.process(ctx, 'alicdnresize,l_100'.split(','));

  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(100);
  expect(info.height).toBe(67);
});
