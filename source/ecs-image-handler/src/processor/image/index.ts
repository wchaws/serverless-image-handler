import * as sharp from 'sharp';
import { IAction, InvalidArgument, IProcessContext, IProcessor } from '../../processor';
import { BlurAction } from './blur';
import { BrightAction } from './bright';
import { FormatAction } from './format';
import { QualityAction } from './quality';
import { ResizeAction } from './resize';
import { RotateAction } from './rotate';
import { ContrastAction } from './contrast';
import { SharpenAction } from './sharpen';
import { InterlaceAction } from './interlace';
import { AutoOrientAction } from './auto-orient';
import { GreyAction } from './grey';

export interface IImageAction extends IAction {}

export interface IImageContext extends IProcessContext {
  image: sharp.Sharp;
}
export class ImageProcessor implements IProcessor {
  public static getInstance(): ImageProcessor {
    if (!ImageProcessor._instance) {
      ImageProcessor._instance = new ImageProcessor();
    }
    return ImageProcessor._instance;
  }
  private static _instance: ImageProcessor;
  private readonly _actions: {[name: string]: IAction} = {};

  public readonly name: string = 'image';

  private constructor() {}

  public async process(ctx: IImageContext, actions: string[]): Promise<void> {
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
);