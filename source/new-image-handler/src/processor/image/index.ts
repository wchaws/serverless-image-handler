import * as sharp from 'sharp';
import {
  Features,
  IAction,
  InvalidArgument,
  IProcessContext,
  IProcessor,
  IProcessResponse,
} from '../../processor';
import { IBufferStore } from '../../store';
import { ActionMask } from './_base';
import { AliCDNResizeAction } from './alicdnimage';
import { AutoOrientAction } from './auto-orient';
import { BlurAction } from './blur';
import { BrightAction } from './bright';
import { CgifAction } from './cgif';
import { CircleAction } from './circle';
import { ContrastAction } from './contrast';
import { CropAction } from './crop';
import { FormatAction } from './format';
import { GreyAction } from './grey';
import { IndexCropAction } from './indexcrop';
import { InfoAction } from './info';
import { InterlaceAction } from './interlace';
import { ResizeAction } from './resize';
import { RotateAction } from './rotate';
import { RoundedCornersAction } from './rounded-corners';
import { SharpenAction } from './sharpen';
import { StripMetadataAction } from './strip-metadata';
import { WatermarkAction } from './watermark';

export interface IImageInfo {
  [key: string]: { value: string };
}
export interface IImageContext extends IProcessContext {
  image: sharp.Sharp;
  metadata: sharp.Metadata;
  info?: IImageInfo;
  needHandle?: boolean;
}

const MB = 1024 * 1024;

export class ImageProcessor implements IProcessor {
  public static getInstance(): ImageProcessor {
    if (!ImageProcessor._instance) {
      ImageProcessor._instance = new ImageProcessor();
    }
    return ImageProcessor._instance;
  }
  private static _instance: ImageProcessor;
  private readonly _actions: { [name: string]: IAction } = {};
  private _maxGifSizeMB: number = 5;
  private _maxGifPages: number = 100;

  public readonly name: string = 'image';

  private constructor() {}

  public setMaxGifSizeMB(value: number) {
    if (value > 0) {
      this._maxGifSizeMB = value;
    } else {
      console.warn(`Max gif size must > 0, but the value is ${value}`);
    }
  }

  public setMaxGifPages(value: number) {
    if (value > 0) {
      this._maxGifPages = value;
    } else {
      console.warn(`Max gif pages must > 0, but the value is ${value}`);
    }
  }

  public async newContext(
    uri: string,
    actions: string[],
    bufferStore: IBufferStore,
  ): Promise<IImageContext> {
    const ctx: IProcessContext = {
      uri,
      actions,
      mask: new ActionMask(actions),
      bufferStore,
      features: {
        [Features.AutoOrient]: true,
        [Features.ReadAllAnimatedFrames]: true,
      },
      headers: {},
    };
    // let isAliCdnImage: boolean = false;
    let thval: number = 0;
    // actions.includes('alicdnimage')
    //   ? (isAliCdnImage = true)
    //   : (isAliCdnImage = false);
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (this.name === action || !action || action === 'alicdnimage') {
        continue;
      }
      // "<action-name>,<param-1>,<param-2>,..."
      const params = action.split(',');
      console.log(`initial params is ${params}`);
      let actionname: string = '';
      // isAliCdnImage && params[0] === 'resize'
      //  ? (actionname = 'alicdnresize')
      //  : (actionname = params[0]);
      actionname = params[0];
      const act = this.action(actionname);
      if (actionname !== 'threshold' && !act) {
        throw new InvalidArgument(`Unkown action: "${actionname}"`);
      }
      if (actionname === 'threshold') {
        thval = parseInt(params[1], 10);
        if (isNaN(thval)) {
          throw new InvalidArgument('Threshold must be a number');
        }
      }
      if (actionname === 'threshold') {
        continue;
      } else {
        act.beforeNewContext.bind(act)(ctx, params, i);
      }
    }
    const { buffer, headers } = await bufferStore.get(uri);
    let image;
    let metadata;
    if (ctx.features[Features.LimitAnimatedFrames] > 0) {
      image = sharp(buffer, { failOnError: false, animated: false });
      metadata = await image.metadata();
      if (!('gif' === metadata.format)) {
        throw new InvalidArgument('Format must be Gif');
      }
      if (!metadata.pages) {
        throw new InvalidArgument("Can't read gif's pages");
      }
      const pages = Math.min(
        ctx.features[Features.LimitAnimatedFrames],
        metadata.pages,
      );
      image = sharp(buffer, {
        failOnError: false,
        animated: ctx.features[Features.ReadAllAnimatedFrames],
        pages,
      });
      metadata = await image.metadata();
    } else {
      image = sharp(buffer, {
        failOnError: false,
        animated: ctx.features[Features.ReadAllAnimatedFrames],
      });
      metadata = await image.metadata();
    }
    if ('gif' === metadata.format) {
      image.gif({ effort: 1 }); // https://github.com/lovell/sharp/issues/3176

      if (metadata.size && metadata.size > this._maxGifSizeMB * MB) {
        console.log(
          `Gif processing skipped. The image size exceeds ${this._maxGifSizeMB} MB`,
        );
        ctx.mask.disableAll();
      } else if (metadata.pages && metadata.pages > this._maxGifPages) {
        console.log(
          `Gif processing skipped. The image pages exceeds ${this._maxGifPages}`,
        );
        ctx.mask.disableAll();
      }
    }
    if ('png' === metadata.format && metadata.size && metadata.size > 5 * MB) {
      image.png({ adaptiveFiltering: true });
    }
    let isHandle: boolean = true;
    if (thval > 0 && metadata.size && metadata.size < thval) {
      console.log(
        `Image processing skipped. The image size less than the thredshold ${thval}`,
      );
      isHandle = false;
      ctx.mask.disableAll();
    }

    return {
      uri: ctx.uri,
      actions: ctx.actions,
      mask: ctx.mask,
      bufferStore: ctx.bufferStore,
      features: ctx.features,
      headers: Object.assign(ctx.headers, headers),
      metadata,
      image,
      needHandle: isHandle,
    };
  }

  public async process(ctx: IImageContext): Promise<IProcessResponse> {
    if (!ctx.image) {
      throw new InvalidArgument('Invalid image context! No "image" field.');
    }
    if (!ctx.actions) {
      throw new InvalidArgument('Invalid image context! No "actions" field.');
    }

    if (ctx.features[Features.AutoOrient]) {
      ctx.image.rotate();
    }

    ctx.mask.forEachAction((action, _, index) => {
      console.log(`the handle action is ${action} and ${ctx.needHandle}`);
      if (this.name === action || !action || action === 'alicdnimage') {
        return;
      }
      // "<action-name>,<param-1>,<param-2>,..."
      const params = action.split(',');
      const name = params[0];
      if (name === 'threshold') {
        return;
      }
      const act = this.action(name);
      if (!act) {
        throw new InvalidArgument(`Unkown action: "${name}"`);
      }
      act.beforeProcess.bind(act)(ctx, params, index);
    });
    const enabledActions = ctx.mask.filterEnabledActions();
    const nothing2do =
      enabledActions.length === 0 ||
      !ctx.needHandle ||
      (enabledActions.length === 1 && this.name === enabledActions[0]);

    if (nothing2do && !ctx.features[Features.AutoWebp]) {
      const { buffer } = await ctx.bufferStore.get(ctx.uri);
      return { data: buffer, type: ctx.metadata.format! };
    }

    for (const action of enabledActions) {
      if (this.name === action || !action || action === 'alicdnimage') {
        continue;
      }
      // "<action-name>,<param-1>,<param-2>,..."
      const params = action.split(',');
      console.log(`params is ${params}`);
      const name = params[0];
      if (name === 'threshold') {
        continue;
      }
      const act = this.action(name);
      if (!act) {
        throw new InvalidArgument(`Unkown action: "${name}"`);
      }
      await act.process(ctx, params);

      if (ctx.features[Features.ReturnInfo]) {
        break;
      }
    }
    if (ctx.features[Features.AutoWebp]) {
      ctx.image.webp();
    }
    if (ctx.features[Features.ReturnInfo]) {
      return { data: ctx.info, type: 'application/json' };
    } else {
      const { data, info } = await ctx.image.toBuffer({
        resolveWithObject: true,
      });
      return { data: data, type: 'image/' + info.format };
    }
  }

  public action(name: string): IAction {
    return this._actions[name];
  }

  public register(...actions: IAction[]): void {
    for (const action of actions) {
      if (!this._actions[action.name]) {
        this._actions[action.name] = action;
      }
    }
  }
}

// Register actions
ImageProcessor.getInstance().register(
  new ResizeAction(),
  new AliCDNResizeAction(),
  new BrightAction(),
  new FormatAction(),
  new BlurAction(),
  new RotateAction(),
  new ContrastAction(),
  new SharpenAction(),
  new InterlaceAction(),
  new AutoOrientAction(),
  new GreyAction(),
  new CropAction(),
  new CircleAction(),
  new IndexCropAction(),
  new RoundedCornersAction(),
  new WatermarkAction(),
  new InfoAction(),
  new CgifAction(),
  new StripMetadataAction(),
);
