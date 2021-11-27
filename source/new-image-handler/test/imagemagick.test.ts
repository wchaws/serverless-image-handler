import * as sharp from 'sharp';
import { convert, identify } from '../src/imagemagick';
import { fixtureStore } from './processor/image/utils';

test.skip('imagemagick convert', async () => {
  const { buffer } = await fixtureStore.get('example.jpg');
  const bufout = await convert(buffer, ['-resize', '10%']);
  const metadata = await sharp(bufout).metadata();

  expect(metadata.width).toBe(40);
  expect(metadata.height).toBe(27);
});

test.skip('imagemagick identify', async () => {
  const { buffer } = await fixtureStore.get('example.jpg');
  const bufout = await identify(buffer, ['-format', '%Q']);

  expect(bufout.toString()).toBe('82');
});