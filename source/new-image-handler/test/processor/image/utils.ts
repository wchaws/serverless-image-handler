import * as path from 'path';
import * as sharp from 'sharp';
import { IImageContext } from '../../../src/processor/image';
import { ActionMask } from '../../../src/processor/image/_base';
import { IBufferStore, LocalStore } from '../../../src/store';

export const fixtureStore = new LocalStore(path.join(__dirname, '../../fixtures'));

export async function mkctx(name: string, actions?: string[], bufferStore?: IBufferStore): Promise<IImageContext> {
  if (!bufferStore) {
    bufferStore = fixtureStore;
  }
  const image = sharp((await bufferStore.get(name)).buffer, {
    animated: (name.endsWith('.gif') || name.endsWith('.webp')),
  });

  const actions2 = actions ?? [];
  const mask = new ActionMask(actions2);
  return { uri: name, actions: actions2, mask, image, bufferStore, features: {}, headers: {}, metadata: await image.metadata() };
}