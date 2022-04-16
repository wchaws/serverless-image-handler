import * as sharp from 'sharp';
import { Features, IAction, InvalidArgument, IProcessContext, IProcessor, IProcessResponse } from '../../processor';
import { IBufferStore } from '../../store';
import { AutoOrientAction } from './auto-orient';
import { BlurAction } from './blur';
import { BrightAction } from './bright';
import { CircleAction } from './circle';
import { ContrastAction } from './contrast';
import { CropAction } from './crop';
import { FormatAction } from './format';
import { GreyAction } from './grey';
import { IndexCropAction } from './indexcrop';
import { InfoAction } from './info';
import { InterlaceAction } from './interlace';
import { QualityAction } from './quality';
import { ResizeAction } from './resize';
import { RotateAction } from './rotate';
import { RoundedCornersAction } from './rounded-corners';
import { SharpenAction } from './sharpen';
import { WatermarkAction } from './watermark';

export interface IImageAction extends IAction { }
export interface IImageInfo {
  [key: string]: { value: string };
}
export interface IImageContext extends IProcessContext {
  image: sharp.Sharp;
  info?: IImageInfo;
}

export class ImageProcessor implements IProcessor {
  public static getInstance(): ImageProcessor {
    if (!ImageProcessor._instance) {
      ImageProcessor._instance = new ImageProcessor();
    }
    return ImageProcessor._instance;
  }
  private static _instance: ImageProcessor;
  private readonly _actions: { [name: string]: IAction } = {};

  public readonly name: string = 'image';

  private constructor() { }

  public async newContext(uri: string, bufferStore: IBufferStore): Promise<IImageContext> {
    const { buffer } = await bufferStore.get(uri);
    return {
      uri,
      bufferStore,
      features: {},
      image: sharp(buffer, { animated: true }),
    };
  }

  public async process(ctx: IImageContext, actions: string[]): Promise<IProcessResponse> {
    if (!ctx.image) {
      throw new InvalidArgument('Invalid image context');
    }
    for (const action of actions) {
      if ((this.name === action) || (!action)) {
        continue;
      }

      // "<action-name>,<param-1>,<param-2>,..."
      const params = action.split(',');
      const name = params[0];
      const act = this.action(name);
      if (!act) {
        throw new InvalidArgument(`Unkown action: "${name}"`);
      }
      await act.process(ctx, params);

      if (ctx.features[Features.ReturnInfo]) { break; }
    }
    if (ctx.features[Features.AutoWebp]) { ctx.image.webp(); }
    if (ctx.features[Features.ReturnInfo]) {
      return { data: ctx.info, type: 'application/json' };
    } else {
      const { data, info } = await ctx.image.toBuffer({ resolveWithObject: true });
      return { data: data, type: info.format };
    }
  }

  public action(name: string): IAction {
    return this._actions[name];
  }

  public register(...actions: IImageAction[]): void {
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
  new QualityAction(),
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
);


