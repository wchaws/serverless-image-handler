import * as path from 'path';
import * as sharp from 'sharp';
import { IImageContext } from '../../../src/processor/image';
import { IBufferStore, LocalStore } from '../../../src/store';

export const fixtureStore = new LocalStore(path.join(__dirname, '../../fixtures'));

export async function mkctx(name: string, actions?: string[], bufferStore?: IBufferStore): Promise<IImageContext> {
  if (!bufferStore) {
    bufferStore = fixtureStore;
  }
  const image = sharp((await bufferStore.get(name)).buffer, {
    animated: (name.endsWith('.gif') || name.endsWith('.webp')),
  });
  return { uri: name, actions: actions ?? [], image, bufferStore, features: {}};
}