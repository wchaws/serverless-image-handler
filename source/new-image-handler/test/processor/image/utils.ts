import * as path from 'path';
import * as sharp from 'sharp';
import { IImageContext } from '../../../src/processor/image';
import { LocalStore } from '../../../src/store';

export const fixtureStore = new LocalStore(path.join(__dirname, '../../fixtures'));

export async function mkctx(name: string, sharpOpts?: sharp.SharpOptions): Promise<IImageContext> {
  const image = sharp((await fixtureStore.get(name)).buffer, sharpOpts);
  return { uri: name, image, bufferStore: fixtureStore, features: {} };
}