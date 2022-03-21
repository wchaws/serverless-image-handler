import * as sharp from 'sharp';
import * as path from 'path';
import { IImageContext } from '../../../src/processor/image';
import { LocalStore } from '../../../src/store';

export const fixtureStore = new LocalStore(path.join(__dirname, '../../fixtures'));

export async function mkctx(name: string): Promise<IImageContext> {
  const image = sharp((await fixtureStore.get(name)).buffer);
  return { image, bufferStore: fixtureStore, features: {} };
}