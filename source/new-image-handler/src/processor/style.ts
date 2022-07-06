import { IAction, InvalidArgument, IProcessContext, IProcessor, IProcessResponse } from '.';
import * as is from '../is';
import { IBufferStore, IKVStore, MemKVStore } from '../store';
import { ActionMask } from './image/_base';
import { ImageProcessor } from './image/index';
import { VideoProcessor } from './video';


const PROCESSOR_MAP: { [key: string]: IProcessor } = {
  [ImageProcessor.getInstance().name]: ImageProcessor.getInstance(),
  [VideoProcessor.getInstance().name]: VideoProcessor.getInstance(),
};


export class StyleProcessor implements IProcessor {
  public static getInstance(kvstore?: IKVStore): StyleProcessor {
    if (!StyleProcessor._instance) {
      StyleProcessor._instance = new StyleProcessor();
    }
    if (kvstore) {
      StyleProcessor._instance._kvstore = kvstore;
    }
    return StyleProcessor._instance;
  }
  private static _instance: StyleProcessor;

  public readonly name: string = 'style';
  private _kvstore: IKVStore = new MemKVStore({});

  private constructor() { }

  public async newContext(uri: string, actions: string[], bufferStore: IBufferStore): Promise<IProcessContext> {
    return Promise.resolve({
      uri,
      actions,
      mask: new ActionMask(actions),
      bufferStore,
      headers: {},
      features: {},
    });
  }

  // e.g. https://Host/ObjectName?x-oss-process=style/<StyleName>
  public async process(ctx: IProcessContext): Promise<IProcessResponse> {
    if (ctx.actions.length !== 2) {
      throw new InvalidArgument('Invalid style!');
    }
    const stylename = ctx.actions[1];
    if (!stylename.match(/^[\w\-_\.]{1,63}$/)) {
      throw new InvalidArgument('Invalid style name!');
    }
    // {
    //   "id": "stylename",
    //   "style": "image/resize,w_100,h_100"
    // }
    const { style } = await this._kvstore.get(stylename);
    const param = style; // e.g. image/resize,w_100,h_100,m_fixed,limit_0/
    if (is.string(param)) {
      const acts = param.split('/').filter((x: any) => x);
      const processor = PROCESSOR_MAP[acts[0]];
      if (!processor) {
        throw new InvalidArgument('Can Not find processor');
      }
      const context = await processor.newContext(ctx.uri, acts, ctx.bufferStore);
      return processor.process(context);
    } else {
      throw new InvalidArgument('Style not found');
    }
  }

  public register(..._: IAction[]): void { }
}
