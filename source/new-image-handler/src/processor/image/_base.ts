import { IAction, IActionOpts, IProcessContext, ReadOnly } from '..';


export abstract class BaseImageAction implements IAction {
  public name: string = 'unknown';
  abstract validate(params: string[]): ReadOnly<IActionOpts>;
  abstract process(ctx: IProcessContext, params: string[]): Promise<void>;
  public beforeNewContext(_: IProcessContext, params: string[]): void {
    this.validate(params);
  }
}
