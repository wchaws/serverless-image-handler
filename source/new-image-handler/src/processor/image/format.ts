import * as sharp from 'sharp';
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
    const buffer = await ctx.image.toBuffer();
    const metadata = await sharp(buffer).metadata(); // https://github.com/lovell/sharp/issues/2959
    const pages = metadata.pages;
    const srcImgIsAnimated = !!(pages && (pages > 0));
    const notToAnimatedFormat = !['webp', 'gif'].includes(opt.format);

    if (srcImgIsAnimated && notToAnimatedFormat) {
      ctx.image = sharp(buffer, { page: 0 });
    }

    if (['jpeg', 'jpg'].includes(opt.format)) {
      ctx.image.toFormat('jpg');
    } else if (opt.format === 'png') {
      ctx.image.toFormat('png');
    } else if (opt.format === 'webp') {
      ctx.image.toFormat('webp');
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