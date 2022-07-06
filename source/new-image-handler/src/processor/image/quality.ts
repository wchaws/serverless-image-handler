import * as sharp from 'sharp';
import { IImageContext } from '.';
import { IActionOpts, InvalidArgument, ReadOnly } from '..';
import * as is from '../../is';
import { BaseImageAction } from './_base';
import * as jpeg from './jpeg';


const JPG = 'jpg';
const JPEG = sharp.format.jpeg.id;
const WEBP = sharp.format.webp.id;

export interface QualityOpts extends IActionOpts {
  q?: number;
  Q?: number;
}

export class QualityAction extends BaseImageAction {
  public readonly name: string = 'quality';

  public beforeProcess(ctx: IImageContext, _2: string[], index: number): void {
    if ('gif' === ctx.metadata.format) {
      ctx.mask.disable(index);
    }
  }

  public validate(params: string[]): ReadOnly<QualityOpts> {
    const opt: QualityOpts = {};
    for (const param of params) {
      if ((this.name === param) || (!param)) {
        continue;
      }
      const [k, v] = param.split('_');
      if (k === 'q') {
        const q = Number.parseInt(v, 10);
        if (is.inRange(q, 1, 100)) {
          opt.q = q;
        } else {
          throw new InvalidArgument('Quality must be between 1 and 100');
        }
      } else if (k === 'Q') {
        const Q = Number.parseInt(v, 10);
        if (is.inRange(Q, 1, 100)) {
          opt.Q = Q;
        } else {
          throw new InvalidArgument('Quality must be between 1 and 100');
        }
      } else {
        throw new InvalidArgument(`Unkown param: "${k}"`);
      }
    }
    return opt;
  }
  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);
    const metadata = ctx.metadata; // If the format is changed before.
    if (JPEG === metadata.format || JPG === metadata.format) {
      let q = 72;
      if (opt.q) {
        const buffer = await ctx.image.toBuffer();
        const estq = jpeg.decode(buffer).quality;
        q = Math.round(estq * opt.q / 100);
      } else if (opt.Q) {
        q = opt.Q;
      }
      ctx.image.jpeg({ quality: q });
    } else if (WEBP === metadata.format) {
      ctx.image.webp({ quality: (opt.q ?? opt.Q) });
    }
  }
}