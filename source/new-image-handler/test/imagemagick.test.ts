import * as sharp from 'sharp';
import { convert } from '../src/imagemagick';
import { fixtureStore } from './processor/image/utils';

test.skip('imagemagick', async () => {
  const { buffer } = await fixtureStore.get('example.jpg');
  const bufout = await convert(buffer, ['-resize', '10%']);
  const metadata = await sharp(bufout).metadata();

  expect(metadata.width).toBe(40);
  expect(metadata.height).toBe(27);
});