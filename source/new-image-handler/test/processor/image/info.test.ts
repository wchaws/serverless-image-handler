import { Features } from '../../../src/processor';
import { InfoAction } from '../../../src/processor/image/info';
import { mkctx } from './utils';

test('info action validate', () => {
  const action = new InfoAction();

  expect(() => {
    action.validate('info,-1'.split(','));
  }).toThrowError(/Info param error/);

  expect(() => {
    action.validate('infox'.split(','));
  }).toThrowError(/Info param error/);

  expect(() => {
    action.validate('info'.split(','));
  }).not.toThrowError(/Info param error/);
});

test('info action', async () => {
  const ctx = await mkctx('example.jpg');
  const action = new InfoAction();
  await action.process(ctx, 'info'.split(','));

  expect(ctx.features[Features.ReturnInfo]).toBeTruthy();
  expect(ctx.info).toEqual({
    FileSize: { value: '21839' },
    Format: { value: 'jpg' },
    ImageHeight: { value: '267' },
    ImageWidth: { value: '400' },
  });
});

test('info action on gif', async () => {
  const ctx = await mkctx('example.gif');
  const action = new InfoAction();
  await action.process(ctx, 'info'.split(','));

  expect(ctx.features[Features.ReturnInfo]).toBeTruthy();
  expect(ctx.info).toEqual({
    FileSize: { value: '21957' },
    Format: { value: 'gif' },
    ImageHeight: { value: '300' },
    ImageWidth: { value: '500' },
  });
});