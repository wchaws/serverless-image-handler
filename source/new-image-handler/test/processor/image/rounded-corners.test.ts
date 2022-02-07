import * as sharp from 'sharp';
import * as Jimp from 'jimp';
import { IImageContext } from '../../../src/processor/image';
import { RoundedCornersAction } from '../../../src/processor/image/rounded-corners';
import { fixtureStore } from './utils';

test('rounded-corner validate', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };

  const action = new RoundedCornersAction();
  await action.process(ctx, 'rounded-corners,r_100'.split(','));

  const { data, info } = await ctx.image.png().toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  expect(info.channels).toBe(4);
  expect(info.format).toBe(sharp.format.png.id);

  const pic = await Jimp.read(data);
  expect(pic.getPixelColor(0, 0)).toBe(0)
  expect(pic.getPixelColor(0, w)).toBe(0)
  expect(pic.getPixelColor(0, h)).toBe(0)
  expect(pic.getPixelColor(w, h)).toBe(0)
});

test('quality action validate', () => {
  const action = new RoundedCornersAction();
  const param1 = action.validate('rounded-corners,r_30'.split(','));

  expect(param1).toEqual({ r: 30 });
  expect(() => {
    action.validate('rounded-corners,r_'.split(','));
  }).toThrowError(/must be between 1 and 4096/);
  expect(() => {
    action.validate('blur,xx'.split(','));
  }).toThrowError(/Unkown param/);
});
