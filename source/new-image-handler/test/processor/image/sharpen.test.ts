import * as sharp from 'sharp';
import { SharpenAction } from '../../../src/processor/image/sharpen';
import { mkctx } from './utils';

test('quality action validate', () => {
  const action = new SharpenAction();
  const param1 = action.validate('sharpen,50'.split(','));
  expect(param1).toEqual({
    sharpen: 50,
  });

  expect(() => {
    action.validate('sharpen'.split(','));
  }).toThrowError(/Sharpen param error, e.g: sharpen,100/);

  expect(() => {
    action.validate('sharpen,xx,22'.split(','));
  }).toThrowError(/Sharpen param error, e.g: sharpen,100/);


  expect(() => {
    action.validate('sharpen,22'.split(','));
  }).toThrowError(/Sharpen be between 50 and 399/);


  expect(() => {
    action.validate('contrast,49'.split(','));
  }).toThrowError(/Sharpen be between 50 and 399/);

  expect(() => {
    action.validate('contrast,400'.split(','));
  }).toThrowError(/Sharpen be between 50 and 399/);

  expect(() => {
    action.validate('contrast,100'.split(','));
  });

  expect(() => {
    action.validate('contrast,60'.split(','));
  });
});


test('quality action', async () => {
  const ctx = await mkctx('example.jpg');
  const action = new SharpenAction();
  await action.process(ctx, 'sharpen,100'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.format).toBe(sharp.format.jpeg.id);
});


test('quality action', async () => {
  const ctx = await mkctx('example.jpg');
  const action = new SharpenAction();
  await action.process(ctx, 'sharpen,60'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.format).toBe(sharp.format.jpeg.id);
});