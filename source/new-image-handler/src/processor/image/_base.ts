import { IImageContext } from '.';
import { IAction, IActionOpts, IProcessContext, ReadOnly, IActionMask } from '..';


export abstract class BaseImageAction implements IAction {
  public name: string = 'unknown';
  abstract validate(params: string[]): ReadOnly<IActionOpts>;
  abstract process(ctx: IProcessContext, params: string[]): Promise<void>;
  public beforeNewContext(_1: IProcessContext, params: string[], _3: number): void {
    this.validate(params);
  }
  public beforeProcess(_1: IImageContext, _2: string[], _3: number): void { }
}

export class ActionMask implements IActionMask {
  private readonly _masks: boolean[];

  public constructor(private readonly _actions: string[]) {
    this._masks = _actions.map(() => true);
  }

  public get length(): number {
    return this._actions.length;
  }

  private _check(index: number): void {
    if (!(0 <= index && index < this.length)) {
      throw new Error('Index out of range');
    }
  }

  public getAction(index: number): string {
    this._check(index);
    return this._actions[index];
  }

  public isEnabled(index: number): boolean {
    this._check(index);
    return this._masks[index];
  }

  public isDisabled(index: number): boolean {
    this._check(index);
    return !this._masks[index];
  }

  public enable(index: number) {
    this._check(index);
    this._masks[index] = true;
  }

  public disable(index: number) {
    this._check(index);
    this._masks[index] = false;
  }

  public disableAll() {
    for (let i = 0; i < this._masks.length; i++) {
      this._masks[i] = false;
    }
  }

  public filterEnabledActions(): string[] {
    return this._actions.filter((_, index) => this._masks[index]);
  }

  public forEachAction(cb: (action: string, enabled: boolean, index: number) => void): void {
    this._actions.forEach((action, index) => {
      cb(action, this.isEnabled(index), index);
    });
  }
}

export function split1(s: string, sep: string = ',') {
  const split = s.split(sep, 1);
  return [split[0], s.substring(split[0].length + sep.length)];
}
