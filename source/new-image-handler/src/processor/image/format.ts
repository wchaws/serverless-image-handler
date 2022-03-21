import * as sharp from 'sharp';
import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument, Features } from '..';

export interface FormatOpts extends IActionOpts {
  format: string;
}

export class FormatAction implements IImageAction {
  public readonly name: string = 'format';

  public validate(params: string[]): ReadOnly<FormatOpts> {
    let opt: FormatOpts = { format: '' };

    if (params.length !== 2) {
      throw new InvalidArgument('Format param error, e.g: format,jpg   (jpg,png,webp)');
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
    const isNotWebp = (opt.format !== 'webp');

    if (isNotWebp && pages && (pages > 0)) {
      ctx.image = sharp(buffer, { page: 0 });
    }

    // NOTE:  jpg,webp,png
    if (opt.format === 'jpg') {
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
  'png',
  'webp',
];