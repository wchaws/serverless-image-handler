import { encode } from 'html-entities';
import * as sharp from 'sharp';
import { IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument, Features, IProcessContext } from '..';
import * as is from '../../is';
import { BaseImageAction, split1 } from './_base';


export interface WatermarkOpts extends IActionOpts {
  text: string;
  t: number; // 不透明度
  g: string; // 位置
  fill: boolean; // 文字是否重复
  rotate: number; // 文字旋转角度
  size: number; // 文字大小
  color: string; // 文字颜色
  image: string; // img 水印URL
  auto: boolean; // 自动调整水印图片大小以适应背景
  x?: number; // 图文水印的x位置
  y?: number; // 图文水印的y位置
  voffset: number; // 图文水印的居中时候的偏移位置
  order: number; // 图文混排中，文字图片的先后顺序
  interval: number; // 图文混排中，图片和文字间隔
  align: number; // 图文混排中，图片和文字对其方式
  type: string; // 字体
  shadow: number;
  halo: string; // shadow 颜色
}

interface WatermarkPosOpts extends IActionOpts {
  x?: number;
  y?: number;
}

interface WatermarkMixedGravityOpts extends IActionOpts {
  imgGravity: string;
  textGravity: string;
}

export class WatermarkAction extends BaseImageAction {
  public readonly name: string = 'watermark';

  public beforeNewContext(ctx: IProcessContext, params: string[]): void {
    this.validate(params);
    ctx.features[Features.ReadAllAnimatedFrames] = false;
  }

  public validate(params: string[]): ReadOnly<WatermarkOpts> {
    const opt: WatermarkOpts = {
      text: '',
      t: 100,
      g: 'southeast',
      fill: false,
      rotate: 0,
      size: 40,
      color: '000000',
      image: '',
      auto: false,
      order: 0,
      x: 5,
      y: 5,
      voffset: 0,
      interval: 0,
      align: 0,
      type: 'FZHei-B01',
      shadow: 0,
      halo: '000000',
    };

    for (const param of params) {
      if ((this.name === param) || (!param)) {
        continue;
      }
      const [k, v] = split1(param, '_');
      if (k === 'text') {
        if (v) {
          const buff = Buffer.from(v, 'base64url');
          opt.text = buff.toString('utf-8');
        }
      } else if (k === 'image') {
        if (v) {
          const buff = Buffer.from(v, 'base64url');
          opt.image = buff.toString('utf-8');
        }
      } else if (k === 't') {
        opt.t = Number.parseInt(v, 10);
      } else if (k === 'x') {
        opt.x = Number.parseInt(v, 10);
        if (opt.x < 0 || opt.x > 4096) {
          throw new InvalidArgument('Watermark param \'x\' must be between 0 and 4096');
        }
      } else if (k === 'y') {
        opt.y = Number.parseInt(v, 10);
        if (opt.y < 0 || opt.y > 4096) {
          throw new InvalidArgument('Watermark param \'y\' must be between 0 and 4096');
        }
      } else if (k === 'voffset') {
        opt.voffset = Number.parseInt(v, 10);
        if (opt.voffset < -1000 || opt.voffset > 1000) {
          throw new InvalidArgument('Watermark param \'voffset\' must be between -1000 and 1000');
        }
      } else if (k === 'order') {
        opt.order = Number.parseInt(v, 10);
      } else if (k === 'interval') {
        opt.interval = Number.parseInt(v, 10);
        if (opt.interval < 0 || opt.interval > 1000) {
          throw new InvalidArgument('Watermark param \'interval\' must be between 0 and 1000');
        }
      } else if (k === 'align') {
        opt.align = Number.parseInt(v, 10);
      } else if (k === 'g') {
        opt.g = this.gravityConvert(v);
      } else if (k === 'size') {
        const size = Number.parseInt(v, 10);
        opt.size = size;
        if (opt.size < 0 || opt.size > 1000) {
          throw new InvalidArgument('Watermark param \'size\' must be between 0 and 4096');
        }
      } else if (k === 'fill') {
        if (v && (v === '0' || v === '1')) {
          opt.fill = (v === '1');
        } else {
          throw new InvalidArgument('Watermark param \'fill\' must be 0 or 1');
        }
      } else if (k === 'auto') {
        if (v && (v === '0' || v === '1')) {
          opt.auto = (v === '1');
        } else {
          throw new InvalidArgument('Watermark param \'auto\' must be 0 or 1');
        }
      } else if (k === 'rotate') {
        const rotate = Number.parseInt(v, 10);
        if (0 <= rotate && 360 >= rotate) {
          if (rotate === 360) {
            opt.rotate = 0;
          } else {
            opt.rotate = rotate;
          }
        } else {
          throw new InvalidArgument('Watermark param \'rotate\' must be between 0 and 360');
        }

      } else if (k === 'color') {
        opt.color = v;
      } else if (k === 'type') {
        if (v) {
          const buff = Buffer.from(v, 'base64url');
          opt.type = buff.toString('utf-8');
        }
      } else if (k === 'shadow') {
        const shadow = Number.parseInt(v, 10);
        if (is.inRange(shadow, 0, 100)) {
          opt.shadow = shadow;
        } else {
          throw new InvalidArgument('Watermark param \'shadow\' must be between 0 and 100');
        }
      } else if (k === 'halo') {
        opt.halo = v;
      } else {
        throw new InvalidArgument(`Unkown param: "${k}"`);
      }
    }
    if (!opt.text && !opt.image) {
      throw new InvalidArgument('Watermark param \'text\' and \'image\' should not be empty at the same time');
    }

    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);
    if (opt.text && opt.image) {
      await this.mixedWaterMark(ctx, opt);
    } else if (opt.text) {
      await this.textWaterMark(ctx, opt);
    } else {
      await this.imgWaterMark(ctx, opt);
    }
  }

  async textWaterMark(ctx: IImageContext, opt: WatermarkOpts): Promise<void> {
    const overlapImg = await this.textImg(opt);

    await this.compositeImg(ctx, overlapImg, opt);

  }

  async imgWaterMark(ctx: IImageContext, opt: WatermarkOpts): Promise<void> {
    const bs = ctx.bufferStore;

    const watermarkImgBuffer = (await bs.get(opt.image)).buffer;
    let watermarkImg = sharp(watermarkImgBuffer).png();

    await this.compositeImg(ctx, watermarkImg, opt);
  }

  async compositeImg(ctx: IImageContext, watermarkImg: sharp.Sharp, opt: WatermarkOpts, double_auto: Boolean = false): Promise<void> {

    if (0 < opt.rotate) {
      if (double_auto) {
        watermarkImg = await this.autoResize(ctx, watermarkImg, opt);
      }

      watermarkImg = watermarkImg.rotate(opt.rotate, { background: '#00000000' });
    }

    // auto scale warkmark size
    watermarkImg = await this.autoResize(ctx, watermarkImg, opt);

    const metadata = withNormalSize(ctx.metadata);
    const markMetadata = await watermarkImg.metadata();

    const pos = this.calculateImgPos(opt, metadata, markMetadata);

    const overlay = await this.extraImgOverlay(watermarkImg, opt, pos);
    ctx.image.composite([overlay]);
  }

  async mixedWaterMark(ctx: IImageContext, opt: WatermarkOpts): Promise<void> {
    const bs = ctx.bufferStore;

    const txtImg = (await this.textImg(opt)).png();
    const txtMeta = await txtImg.metadata();

    const txtW = txtMeta.width ? txtMeta.width : 0;
    const txtH = txtMeta.height ? txtMeta.height : 0;

    const txtbt = await txtImg.toBuffer();

    const watermarkImgBuffer = (await bs.get(opt.image)).buffer;
    const watermarkImg = sharp(watermarkImgBuffer).png();
    const imgMetadata = await watermarkImg.metadata();
    const imgW = imgMetadata.width ? imgMetadata.width : 0;
    const imgH = imgMetadata.height ? imgMetadata.height : 0;

    const gravityOpt = this.calculateMixedGravity(opt);
    const wbt = await watermarkImg.toBuffer();

    const expectedWidth = txtW + imgW + opt.interval;
    const expectedHeight = Math.max(txtH, imgH);

    let overlapImg = sharp({
      create: {
        width: expectedWidth,
        height: expectedHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite([{ input: txtbt, gravity: gravityOpt.textGravity }, { input: wbt, gravity: gravityOpt.imgGravity }]);

    await this.compositeImg(ctx, overlapImg, opt, true);
  }

  gravityConvert(param: string): string {
    if (['north', 'west', 'east', 'south', 'center', 'centre', 'southeast', 'southwest', 'northwest'].includes(param)) {
      return param;
    } else if (param === 'se') {
      return 'southeast';
    } else if (param === 'sw') {
      return 'southwest';
    } else if (param === 'nw') {
      return 'northwest';
    } else if (param === 'ne') {
      return 'northeast';
    } else {
      throw new InvalidArgument('Watermark param \'g\' must be in \'north\', \'west\', \'east\', \'south\', \'center\', \'centre\', \'southeast\', \'southwest\', \'northwest\'');
    }
  }

  async textImg(opt: WatermarkOpts): Promise<sharp.Sharp> {
    const safetext = encode(opt.text);
    const o = sharp({
      text: {
        text: `<span size="${opt.size}pt" foreground="#${opt.color}">${safetext}</span>`,
        align: 'center',
        rgba: true,
        dpi: 72,
      },
    });
    if (opt.shadow === 0) {
      return o;
    }

    const meta = await o.metadata();
    const offset = 2;
    let expectedWidth = offset;
    let expectedHeight = offset;
    if (meta.width && meta.height) {
      expectedWidth += meta.width;
      expectedHeight += meta.height;
    }


    const shadow = sharp({
      text: {
        text: `<span size="${opt.size}pt" foreground="#${opt.halo}">${safetext}</span>`,
        align: 'center',
        rgba: true,
        dpi: 72,
      },
    });

    const oBuffer = await o.png().toBuffer();
    const opacity = opt.shadow / 100;
    const copy = await shadow.png().ensureAlpha(opacity).toBuffer();

    const u = await sharp({
      create: {
        width: expectedWidth,
        height: expectedHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite([{ input: copy, left: offset, top: offset }]).png().toBuffer();

    const bt = sharp(u).png().composite([{ input: oBuffer, gravity: 'northwest' }]);

    return sharp(await bt.toBuffer()).png();
  }

  calculateImgPos(opt: WatermarkOpts, metadata: sharp.Metadata, markMetadata: sharp.Metadata): WatermarkPosOpts {
    return this.calculatePos(opt, metadata.width, metadata.height, markMetadata.width, markMetadata.height);
  }

  calculatePos(opt: WatermarkOpts, sourceW?: number, sourceH?: number, markW?: number, markH?: number): WatermarkPosOpts {
    let imgX = undefined;
    let imgY = undefined;
    if (markW && sourceW && markH && sourceH) {
      if (['east', 'west', 'center'].includes(opt.g)) {
        imgY = Math.round((sourceH - markH) / 2) + opt.voffset;
      } else {
        const checkY = opt.y ? opt.y : 0;
        if (opt.g.startsWith('south')) {
          imgY = sourceH - markH - checkY;
        } else {
          imgY = checkY;
        }
      }
      if (['north', 'south'].includes(opt.g)) {
        imgX = Math.round((sourceW - markW) / 2);
        if (!imgY) {
          if (opt.g === 'north') {
            imgY = 0;
          } else {
            imgY = sourceH - markH;
          }
        }
      } else {
        const checkX = opt.x ? opt.x : 0;
        if (opt.g.endsWith('east')) {
          imgX = sourceW - markW - checkX;
        } else if (opt.g === 'center') {
          imgX = Math.round((sourceW - markW) / 2);
        } else {
          imgX = checkX;
        }
      }
    }
    return {
      x: imgX,
      y: imgY,
    };
  }

  calculateMixedGravity(opt: WatermarkOpts): WatermarkMixedGravityOpts {
    let imgGravity = 'west';
    let txtGravity = 'east';
    if (opt.order === 1) {
      if (opt.align === 1) {
        imgGravity = 'east';
        txtGravity = 'west';
      } else if (opt.align === 2) {
        imgGravity = 'southeast';
        txtGravity = 'southwest';
      } else {
        imgGravity = 'northeast';
        txtGravity = 'northwest';
      }
    } else {
      if (opt.align === 1) {
        imgGravity = 'west';
        txtGravity = 'east';
      } else if (opt.align === 2) {
        imgGravity = 'southwest';
        txtGravity = 'southeast';
      } else {
        imgGravity = 'northwest';
        txtGravity = 'northeast';
      }
    }
    return {
      imgGravity: imgGravity,
      textGravity: txtGravity,
    };
  }

  async autoResize(ctx: IImageContext, mark: sharp.Sharp, opt: WatermarkOpts): Promise<sharp.Sharp> {
    mark = sharp(await mark.png().toBuffer());
    const mmeta = await mark.metadata();
    const metadata = withNormalSize(ctx.metadata);
    if (!mmeta.width || !metadata.width || !mmeta.height || !metadata.height) {
      throw new Error('failed to get width or height in metadata!');
    }
    if (opt.auto) {
      // renew a sharp object, otherwise the metadata is not right after rotate, resize etc.

      let wratio = 1;
      let hratio = 1;
      let needResize = false;

      if (mmeta.width > metadata.width) {
        wratio = (metadata.width - 5) / mmeta.width;
        needResize = true;
      }
      if (mmeta.height > metadata.height) {
        hratio = (metadata.height - 5) / mmeta.height;
        needResize = true;
      }

      if (needResize && mmeta.height && mmeta.width) {
        const change = Math.min(wratio, hratio);
        const w = Math.floor(mmeta.width * change);
        const h = Math.floor(mmeta.height * change);
        mark = sharp(await mark.resize(w, h).png().toBuffer());
      }
    } else {
      let needCrop = false;
      let left = 0;
      let top = 0;

      let width = mmeta.width;
      let height = mmeta.height;
      const px = opt.x ? opt.x : 0;
      const py = opt.y ? opt.y : 0;

      if (mmeta.width > metadata.width) {
        if (opt.g.endsWith('west')) {
          left = 0;
          width = metadata.width - px;
        } else if (opt.g.endsWith('east')) {
          left = mmeta.width + px - metadata.width;
          width = metadata.width - px;
        } else {
          left = Math.floor((mmeta.width - metadata.width) / 2);
          width = metadata.width;
        }
        needCrop = true;
      }
      // 'north', 'south'
      if (mmeta.height > metadata.height) {
        if (opt.g.startsWith('north')) {
          top = 0;
          height = metadata.height - py;
        } else if (opt.g.startsWith('south')) {
          top = mmeta.height + py - metadata.height;
          height = metadata.height - py;
        } else {
          top = Math.floor((mmeta.height - metadata.height) / 2);
          height = metadata.height;
        }
        needCrop = true;
      }
      if (needCrop) {
        mark = sharp(await mark.extract({ left: left, top: top, width: width, height: height }).png().toBuffer());
      }

    }
    return mark;
  }

  async extraImgOverlay(markImg: sharp.Sharp, opt: WatermarkOpts, pos?: WatermarkPosOpts): Promise<sharp.OverlayOptions> {

    if (opt.t < 100) {
      markImg = markImg.convolve({
        width: 3,
        height: 3,
        kernel: [
          0, 0, 0,
          0, opt.t / 100, 0,
          0, 0, 0,
        ],
      });
    }
    const bt = await markImg.png().toBuffer();
    const overlay: sharp.OverlayOptions = { input: bt, tile: opt.fill, gravity: opt.g };

    if (pos) {
      overlay.top = pos.y;
      overlay.left = pos.x;
    }


    return overlay;
  }
}

function withNormalSize(metadata: sharp.Metadata): sharp.Metadata {
  const o = Object.assign({}, metadata);
  if ((metadata.orientation || 0) >= 5) {
    [o.width, o.height] = [o.height, o.width];
  }
  return o;
}
