import * as sharp from 'sharp';
import { IImageContext } from '.';
import { IActionOpts, InvalidArgument, ReadOnly } from '..';
import * as is from '../../is';
import { BaseImageAction } from './_base';

export interface AliCDNResizeOpts extends IActionOpts {
  w?: number;
  h?: number;
  l?: number;
  s?: number;
  fw?: number;
  fh?: number;
  p?: number;
}

export class AliCDNResizeAction extends BaseImageAction {
  public readonly name: string = 'alicdnresize';

  public validate(params: string[]): ReadOnly<AliCDNResizeOpts> {
    const opt: AliCDNResizeOpts = {};
    console.log(`options are ${params}`);
    for (const param of params) {
      if ('alicdnresize' === param || !param) {
        continue;
      }
      const [k, v] = param.split('_');
      if (k === 'w') {
        opt.w = Number.parseInt(v, 10);
      } else if (k === 'h') {
        opt.h = Number.parseInt(v, 10);
      } else if (k === 'l') {
        opt.l = Number.parseInt(v, 10);
      } else if (k === 's') {
        opt.s = Number.parseInt(v, 10);
      } else if (k === 'fw') {
        opt.fw = Number.parseInt(v, 10);
      } else if (k === 'fh') {
        opt.fh = Number.parseInt(v, 10);
      } else if (k === 'p') {
        const p = Number.parseInt(v, 10);
        if (is.inRange(p, 1, 1000)) {
          opt.p = p;
        } else {
          throw new InvalidArgument(`Unkown p: "${v}"`);
        }
      } else {
        throw new InvalidArgument(`Unkown param: "${k}"`);
      }
    }
    return opt;
  }

  public beforeProcess(
    ctx: IImageContext,
    params: string[],
    index: number,
  ): void {
    const metadata = ctx.metadata;
    const aliopt = this.validate(params);
    if ((aliopt.fw && !aliopt.fh) || (!aliopt.fw && aliopt.fh)) {
      ctx.mask.disable(index);
    }
    if ('gif' === metadata.format) {
      const opt = buildSharpOpt(ctx, aliopt);
      const isEnlargingWidth =
        opt.width && metadata.width && opt.width > metadata.width;
      const isEnlargingHeight =
        opt.height && metadata.pageHeight && opt.height > metadata.pageHeight;
      if (isEnlargingWidth || isEnlargingHeight) {
        ctx.mask.disable(index);
      }
    }
  }

  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    let aliopt = this.validate(params);
    if (aliopt.fw && aliopt.fh) {
      ctx.image.resize(aliopt.fw, aliopt.fh);
    } else {
      const opt = buildSharpOpt(ctx, this.validate(params));
      ctx.image.resize(null, null, opt);
    }
  }
}

function buildSharpOpt(
  ctx: IImageContext,
  o: AliCDNResizeOpts,
): sharp.ResizeOptions {
  const opt: sharp.ResizeOptions = {
    width: o.w,
    height: o.h,
  };
  const metadata = ctx.metadata;
  if (!(metadata.width && metadata.height)) {
    throw new InvalidArgument("Can't read image's width and height");
  }

  if (o.p && !o.w && !o.h) {
    opt.withoutEnlargement = false;
    opt.width = Math.round(metadata.width * o.p * 0.01);
  } else {
    if (o.l) {
      if (metadata.width > metadata.height) {
        opt.width = o.l;
      } else {
        opt.height = o.l;
      }
    }
    if (o.s) {
      if (metadata.height < metadata.width) {
        opt.height = o.s;
      } else {
        opt.width = o.s;
      }
    }
  }
  return opt;
}
