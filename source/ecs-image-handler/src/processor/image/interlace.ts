import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';

export interface InterlaceOpts extends IActionOpts {
  sharpen: number;
}

export class InterlaceAction implements IImageAction {
  public readonly name: string = 'interlace';

  public validate(params: string[]): ReadOnly<InterlaceOpts> {
    var opt: InterlaceOpts = {sharpen: 0};

    if( params.length != 2){
      throw new InvalidArgument(`Interlace param error, e.g: /interlace,1 `);
    }
    const s = parseInt(params[1]);
    if (inRange(s, 0, 1)) {
      opt.sharpen = s;
    } else {
      throw new InvalidArgument('Interlace must be 0 or 1');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);
    if(opt.sharpen == 1){
      ctx.image.jpeg({"progressive": true})
    }
    
  }
}