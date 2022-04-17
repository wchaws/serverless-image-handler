import * as sharp from 'sharp';
import { IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import * as is from '../../is';
import { BaseImageAction } from './_base';

export interface CircleOpts extends IActionOpts {
  r: number;
}

export class CircleAction extends BaseImageAction {
  public readonly name: string = 'circle';

  public validate(params: string[]): ReadOnly<CircleOpts> {
    let opt: CircleOpts = { r: 1 };

    if (params.length !== 2) {
      throw new InvalidArgument('Circle param error, e.g: circle,r_30');
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
          throw new InvalidArgument('Circle param \'r\' must be between 1 and 4096');
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

    const pages = metadata.pages ?? 1;
    const cx = metadata.width / 2;
    const cy = metadata.height / 2;
    const s = Math.min(metadata.width, metadata.height); // shorter side
    const r = Math.min(opt.r, s / 2); // radius
    const d = Math.min(Math.round(2 * r) + 1, s); // diameter

    const circles = Array.from({ length: pages }, (_, i) =>
      `<circle cx="${r}" cy="${r + i * d}" r="${r}" />`,
    );
    const mask = Buffer.from(`<svg viewBox="0 0 ${d} ${pages * d}">
      ${circles.join('\n')}
    </svg>`);

    const region = {
      left: Math.max(Math.round(cx - r), 0),
      top: Math.max(Math.round(cy - r), 0),
      width: d,
      height: d,
    };

    ctx.image.extract(region).composite([
      { input: mask, blend: 'dest-in' },
    ]);
  }
}