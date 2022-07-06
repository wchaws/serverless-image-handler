import { IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument, Features, IProcessContext } from '..';
import { BaseImageAction } from './_base';

export interface FormatOpts extends IActionOpts {
  format: string;
}

export class FormatAction extends BaseImageAction {
  public readonly name: string = 'format';

  public beforeNewContext(ctx: IProcessContext, params: string[]): void {
    const opts = this.validate(params);
    if (['webp', 'gif'].includes(opts.format)) {
      ctx.features[Features.ReadAllAnimatedFrames] = true;
    } else {
      ctx.features[Features.ReadAllAnimatedFrames] = false;
    }
  }

  public beforeProcess(ctx: IImageContext, params: string[], index: number): void {
    const opts = this.validate(params);
    if (('gif' === ctx.metadata.format) && ('gif' === opts.format)) {
      ctx.mask.disable(index);
    }
  }

  public validate(params: string[]): ReadOnly<FormatOpts> {
    let opt: FormatOpts = { format: '' };

    if (params.length !== 2) {
      throw new InvalidArgument(`Format param error, e.g: format,jpg (${SUPPORTED_FORMAT.toString()})`);
    }
    opt.format = params[1];

    if (!SUPPORTED_FORMAT.includes(opt.format)) {
      throw new InvalidArgument(`Format must be one of ${SUPPORTED_FORMAT.toString()}`);
    }

    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    if (ctx.features[Features.AutoWebp]) {
      ctx.features[Features.AutoWebp] = false;
    }

    const opt = this.validate(params);
    if ('gif' === opt.format) {
      return; // nothing to do
    }
    if (['jpeg', 'jpg'].includes(opt.format)) {
      ctx.metadata.format = 'jpeg';
      ctx.image.jpeg();
    } else if (opt.format === 'png') {
      ctx.metadata.format = 'png';
      ctx.image.png({ effort: 2, quality: 80 });
    } else if (opt.format === 'webp') {
      ctx.metadata.format = 'webp';
      ctx.image.webp({ effort: 2, quality: 80 });
    }

  }
}

const SUPPORTED_FORMAT = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
];