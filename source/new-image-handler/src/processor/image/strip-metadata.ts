import { ReadOnly, IActionOpts, IProcessContext } from '..';
import { BaseImageAction } from './_base';

export class StripMetadataAction extends BaseImageAction {
  public readonly name: string = 'strip-metadata';

  validate(_: string[]): ReadOnly<IActionOpts> {
    return {};
  }
  process(_1: IProcessContext, _2: string[]): Promise<void> {
    return Promise.resolve();
  }
}