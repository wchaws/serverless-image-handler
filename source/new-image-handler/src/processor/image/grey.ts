import { IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { BaseImageAction } from './_base';

export interface GreyOpts extends IActionOpts {
  grey: boolean;
}

export class GreyAction extends BaseImageAction {
  public readonly name: string = 'grey';

  public validate(params: string[]): ReadOnly<GreyOpts> {
    let opt: GreyOpts = { grey: false };

    if (params.length !== 2) {
      throw new InvalidArgument('Grey param error, e.g: grey,1');
    }
    if (params[1] === '1') {
      opt.grey = true;
    } else if (params[1] === '0') {
      opt.grey = false;

    } else {
      throw new InvalidArgument('Grey must be 0 or 1');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);
    if (opt.grey) {
      ctx.image.greyscale();
    }

  }
}