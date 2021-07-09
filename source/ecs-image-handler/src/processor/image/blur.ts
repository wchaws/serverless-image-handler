import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';

export interface BlurOpts extends IActionOpts {
  b: number;
}

export class BlurAction implements IImageAction {
  public readonly name: string = 'blur';

  public validate(params: string[]): ReadOnly<BlurOpts> {
    var opt: BlurOpts = {b: 0};

    if( params.length != 2){
      throw new InvalidArgument(`blur param error, e.g: /blur,0.8 `);
    }
    const b = parseFloat(params[1]);
    if (inRange(b, 0, 100)) {
      opt.b = b;
    } else {
      throw new InvalidArgument('Blur must be between 0 and 100');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);

    //NOTE: Ali blur config range from 0 to 100, SharpJs blur config range from 0.3 to 1000.
    const blur = (1000-0.3) *  opt.b /(100.3 - 0.3) + 0.3;
    console.log(` raw blur=${opt.b}  d=${blur} `)
    ctx.image.blur(blur)
  }
}