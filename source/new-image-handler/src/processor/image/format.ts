import * as sharp from 'sharp';
import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';

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
    if (ctx.features && ctx.features.autoWebp) {
      ctx.features.autoWebp = false;
    }

    const opt = this.validate(params);
    const metadata = await sharp(await ctx.image.toBuffer()).metadata(); // https://github.com/lovell/sharp/issues/2959
    const pageHeight = metadata.pageHeight;
    const isNotWebp = (opt.format !== 'webp');

    if (isNotWebp && pageHeight && (pageHeight > 0)) {
      if (!metadata.width) {
        throw new InvalidArgument('Can\'t read image\'s width and height');
      }
      ctx.image.extract({
        top: 0,
        left: 0,
        width: metadata.width,
        height: pageHeight,
      });
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