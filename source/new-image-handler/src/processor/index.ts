import * as HttpErrors from 'http-errors';
import { IBufferStore } from '../store';

/**
 * A utility to make an object immutable.
 */
export type ReadOnly<T> = {
  readonly [K in keyof T]: ReadOnly<T[K]>;
}

export interface IActionMask {
  readonly length: number;
  getAction(index: number): string;
  isEnabled(index: number): boolean;
  isDisabled(index: number): boolean;
  enable(index: number): void;
  disable(index: number): void;
  disableAll(): void;
  filterEnabledActions(): string[];
  forEachAction(cb: (action: string, enabled: boolean, index: number) => void): void;
}

/**
 * Context object for processor.
 */
export interface IProcessContext {
  /**
   * The context uri. e.g. 'a/b/example.jpg'
   */
  readonly uri: string;

  /**
   * The actions. e.g 'image/resize,w_100/format,png'.split('/')
   */
  readonly actions: string[];

  readonly mask: IActionMask;

  /**
   * A abstract store to get file data.
   * It can either get from s3 or local filesystem.
   */
  readonly bufferStore: IBufferStore;

  /**
   * Feature flags.
   */
  readonly features: { [key: string]: any };

  readonly headers: IHttpHeaders;
}

export interface IHttpHeaders {
  [key: string]: any;
}

export interface IProcessResponse {
  readonly data: any;
  readonly type: string;
}

/**
 * Processor interface.
 */
export interface IProcessor {

  /**
   * The name of the processor.
   */
  readonly name: string;

  /**
   * Register action handlers for the processor.
   *
   * @param actions the action handlers
   */
  register(...actions: IAction[]): void;

  /**
   * Create a new context.
   * @param uri e.g. 'a/b/example.jpg'
   * @param actions e.g. 'image/resize,w_100/format,png'.split('/')
   * @param bufferStore
   */
  newContext(uri: string, actions: string[], bufferStore: IBufferStore): Promise<IProcessContext>;

  /**
   * Process each actions with a context.
   *
   * For example:
   *
   * ```ts
   * const bs = new SharpBufferStore(sharp({
   *   create: {
   *     width: 50,
   *     height: 50,
   *     channels: 3,
   *     background: { r: 255, g: 0, b: 0 },
   *   },
   * }).png());
   * const ctx = ImageProcessor.getInstance().newContext('example.jpg', 'image/resize,w_100,h_100,m_fixed,limit_0/'.split('/'));
   * await ImageProcessor.getInstance().process(ctx);
   * ```
   *
   * @param ctx the context
   */
  process(ctx: IProcessContext): Promise<IProcessResponse>;
}

/**
 * An interface of action options.
 */
export interface IActionOpts { }

/**
 * An interface of action.
 */
export interface IAction {

  /**
   * The name of the action.
   */
  readonly name: string;

  /**
   * Validate parameters and return an action option object.
   * Throw an error if it's invalid.
   *
   * For example:
   *
   * ```ts
   * action.validate('resize,m_mfit,h_100,w_100,,'.split(',');
   * ````
   *
   * @param params the parameters
   */
  validate(params: string[]): ReadOnly<IActionOpts>;

  /**
   * Process the action with the given parameters.
   *
   * For example:
   *
   * ```ts
   * action.process(ctx, 'resize,w_10,h_10'.split(','));
   * ```
   *
   * @param ctx the context
   * @param params the parameters
   */
  process(ctx: IProcessContext, params: string[]): Promise<void>;

  /**
   * This function is called before processor new context.
   *
   * @param ctx the context
   * @param params the parameters
   */
  beforeNewContext(ctx: IProcessContext, params: string[], index: number): void;

  beforeProcess(ctx: IProcessContext, params: string[], index: number): void;
}

/**
 * Invalid argument error (HTTP 400).
 */
export class InvalidArgument extends HttpErrors[400] { }


export enum Features {
  AutoWebp = 'auto-webp',
  AutoOrient = 'auto-orient',
  ReturnInfo = 'return-info',
  ReadAllAnimatedFrames = 'read-all-animated-frames',
  LimitAnimatedFrames = 0,
}