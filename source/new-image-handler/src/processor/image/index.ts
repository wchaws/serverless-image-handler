import * as mime from 'mime-types';
import * as sharp from 'sharp';
import { Features, IAction, InvalidArgument, IProcessContext, IProcessor, IProcessResponse } from '../../processor';
import { IBufferStore } from '../../store';
import { ActionMask } from './_base';
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

export interface IImageInfo {
  [key: string]: { value: string };
}
export interface IImageContext extends IProcessContext {
  image: sharp.Sharp;
  metadata: sharp.Metadata;
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

  public async newContext(uri: string, actions: string[], bufferStore: IBufferStore): Promise<IImageContext> {
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
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
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
      act.beforeNewContext.bind(act)(ctx, params, i);
    }
    const { buffer, headers } = await bufferStore.get(uri);
    const image = sharp(buffer, { failOnError: false, animated: ctx.features[Features.ReadAllAnimatedFrames] });
    const metadata = await image.metadata();

    if ('gif' === metadata.format) {
      image.gif({ effort: 1 }); // https://github.com/lovell/sharp/issues/3176
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
    };
  }

  public async process(ctx: IImageContext): Promise<IProcessResponse> {
    if (!ctx.image) {
      throw new InvalidArgument('Invalid image context! No "image" field.');
    }
    if (!ctx.actions) {
      throw new InvalidArgument('Invalid image context! No "actions" field.');
    }

    if (ctx.features[Features.AutoOrient]) { ctx.image.rotate(); }

    ctx.mask.forEachAction((action, _, index) => {
      if ((this.name === action) || (!action)) {
        return;
      }
      // "<action-name>,<param-1>,<param-2>,..."
      const params = action.split(',');
      const name = params[0];
      const act = this.action(name);
      if (!act) {
        throw new InvalidArgument(`Unkown action: "${name}"`);
      }
      act.beforeProcess.bind(act)(ctx, params, index);
    });
    const enabledActions = ctx.mask.filterEnabledActions();
    const nothing2do = (enabledActions.length === 1) && (this.name === enabledActions[0]);

    if (nothing2do && (!ctx.features[Features.AutoWebp])) {
      const { buffer } = await ctx.bufferStore.get(ctx.uri);
      return { data: buffer, type: ctx.metadata.format! };
    }

    for (const action of enabledActions) {
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
      return { data: data, type: (mime.lookup(info.format) || info.format) };
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


