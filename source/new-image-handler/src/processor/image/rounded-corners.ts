import * as sharp from 'sharp';
import { IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import * as is from '../../is';
import { BaseImageAction } from './_base';

export interface RoundedCornersOpts extends IActionOpts {
  r: number;
}

export class RoundedCornersAction extends BaseImageAction {
  public readonly name: string = 'rounded-corners';

  public validate(params: string[]): ReadOnly<RoundedCornersOpts> {
    let opt: RoundedCornersOpts = { r: 1 };

    if (params.length !== 2) {
      throw new InvalidArgument('RoundedCorners param error, e.g: rounded-corners,r_30');
    }

    for (const param of params) {
      if ((this.name === param) || (!param)) {
        continue;
      }
      const [k, v] = param.split('_');
      if (k === 'r') {
        const r = Number.parseInt(v, 10);
        if (is.inRange(r, 1, 4096)) {
          opt.r = r;
        } else {
          throw new InvalidArgument('RoundedCorners param \'r\' must be between 1 and 4096');
        }
      } else {
        throw new InvalidArgument(`Unkown param: "${k}"`);
      }
    }

    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);
    const metadata = await sharp(await ctx.image.toBuffer()).metadata(); // https://github.com/lovell/sharp/issues/2959
    if (!(metadata.width && metadata.height)) {
      throw new InvalidArgument('Can\'t read image\'s width and height');
    }

    const w = metadata.width;
    const h = metadata.height;
    const pages = metadata.pages ?? 1;
    const rects = Array.from({ length: pages }, (_, i) =>
      `<rect y="${i * h}" width="${w}" height="${h}" rx="${opt.r}" />`,
    );
    const mask = Buffer.from(`<svg viewBox="0 0 ${w} ${pages * h}">
      ${rects.join('\n')}
    </svg>`);

    ctx.image.composite([
      { input: mask, blend: 'dest-in' },
    ]);
  }
}