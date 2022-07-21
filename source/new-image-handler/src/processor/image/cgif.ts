import { IActionOpts, ReadOnly, Features, IProcessContext } from '..';
import { BaseImageAction } from './_base';


export interface CgifOpts extends IActionOpts {
  s?: number;
}

export class CgitAction extends BaseImageAction {
  public readonly name: string = 'cgif';

  public beforeNewContext(ctx: IProcessContext): void {
    ctx.features[Features.ReadAllAnimatedFrames] = false;
  }

  public validate(): ReadOnly<CgifOpts> {
    let opt: CgifOpts = { };
    return opt;
  }

  public async process(): Promise<void> {
  }
}