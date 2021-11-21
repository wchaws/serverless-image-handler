import * as os from 'os';
import * as Benchmark from 'benchmark';
import * as sharp from 'sharp';
import { convert } from '../../src/imagemagick';
import { fixtureStore } from '../processor/image/utils';

sharp.simd(true);
sharp.cache(false);
sharp.concurrency(os.cpus().length);

const suite = new Benchmark.Suite('sharp vs imagemagick');

suite
  .add('sharp', {
    defer: true,
    fn: async (deferred: any) => {
      const image = sharp((await fixtureStore.get('example.jpg')).buffer);
      image
        .resize(200, 200, { fit: 'inside' })
        .blur(3)
        .jpeg({ quality: 80 });

      await image.toBuffer();

      deferred.resolve();
    },
  })
  .add('imagemagick', {
    defer: true,
    fn: async (deferred: any) => {
      const buffer = (await fixtureStore.get('example.jpg')).buffer;

      await convert(buffer, [
        '-resize', '200x200',
        '-blur', '3x3',
        '-quality', '80',
      ]);

      deferred.resolve();
    },
  })
  .on('complete', () => {
    suite.each((each: Benchmark) => {
      console.log(each.name,
        precision(each.stats.mean * 1000) + ' ms',
        precision(each.hz) + ' ops/sec',
        each.stats.sample.length + ' samples');
    });
    console.log('Fastest is ' + suite.filter('fastest').map('name'));
  })
  .run({ async: true });


function precision(v: number) {
  return Math.round(v * 100) / 100;
}