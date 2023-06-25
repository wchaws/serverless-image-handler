import { IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { BaseImageAction } from './_base';


export interface ThresholdOpts extends IActionOpts {
  threshold: number;
}


export class ThresholdAction extends BaseImageAction {
  public readonly name: string = 'threshold';

  public beforeProcess(ctx: IImageContext, params: string[], _: number): void {
    const opts = this.validate(params);

    if (ctx.metadata.size && (ctx.metadata.size < opts.threshold)) {
      ctx.mask.disableAll();
    }
  }

  public validate(params: string[]): ReadOnly<ThresholdOpts> {
    if (params.length !== 2) {
      throw new InvalidArgument(`Invalid ${this.name} params, incomplete param`);
    }
    const t = Number.parseInt(params[1], 10);
    if (t <= 0) {
      throw new InvalidArgument(`Invalid ${this.name} params, threshold must be greater than zero`);
    }
    return {
      threshold: t,
    };
  }

  public async process(_1: IImageContext, _2: string[]): Promise<void> {
    return Promise.resolve();
  }
}