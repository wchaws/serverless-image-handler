// import * as sharp from 'sharp';
import { ThresholdAction } from '../../../src/processor/image/threshold';
import { mkctx } from './utils';

test(`${ThresholdAction.name} action validate`, () => {
  const action = new ThresholdAction();
  const param = action.validate('threshold,100'.split(','));
  expect(param.threshold).toBe(100);

  expect(() => {
    action.validate('threshold'.split(','));
  }).toThrow(/Invalid/);

  expect(() => {
    action.validate('threshold,-1'.split(','));
  }).toThrow(/Invalid.*greater than zero/);

});


test(`${ThresholdAction.name} beforeProcess mask disabled`, async () => {
  const ctx = await mkctx('example.jpg', ['threshold,23000']);
  const action = new ThresholdAction();

  await action.beforeProcess(ctx, 'threshold,23000'.split(','), 0);
  expect(ctx.mask.isDisabled(0)).toBeTruthy();
});


test(`${ThresholdAction.name} beforeProcess mask enabled`, async () => {
  const ctx = await mkctx('example.jpg', ['threshold,100']);
  const action = new ThresholdAction();

  await action.beforeProcess(ctx, 'threshold,100'.split(','), 0);
  expect(ctx.mask.isEnabled(0)).toBeTruthy();
});
