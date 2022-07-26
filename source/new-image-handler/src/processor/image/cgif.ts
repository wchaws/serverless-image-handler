import { IActionOpts, ReadOnly, Features, IProcessContext, InvalidArgument } from '..';
import * as is from '../../is';
import { BaseImageAction } from './_base';


export interface CgifOpts extends IActionOpts {
  s?: number;
}

export class CgifAction extends BaseImageAction {
  public readonly name: string = 'cgif';

  public beforeNewContext(ctx: IProcessContext, params: string[]): void {
    ctx.features[Features.ReadAllAnimatedFrames] = false;
    if (params.length !== 2) {
      throw new InvalidArgument('Cut gif param error, e.g: cgif,s_1');
    }
    const [k, v] = params[1].split('_');
    if (k === 's') {
      if (!is.inRange(Number.parseInt(v, 10), 1, 1000)) {
        throw new InvalidArgument(`Unkown param: "${k}"`);
      }
      ctx.features[Features.LimitAnimatedFrames] = Number.parseInt(v, 10);
    } else {
      throw new InvalidArgument(`Unkown param: "${k}"`);
    }
  }

  public validate(): ReadOnly<CgifOpts> {
    let opt: CgifOpts = {};
    return opt;
  }

  public async process(): Promise<void> {
  }
}