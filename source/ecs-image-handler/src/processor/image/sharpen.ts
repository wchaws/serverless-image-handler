import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';

export interface SharpenOpts extends IActionOpts {
  sharpen: number;
}

export class SharpenAction implements IImageAction {
  public readonly name: string = 'sharpen';

  public validate(params: string[]): ReadOnly<SharpenOpts> {
    var opt: SharpenOpts = {sharpen: 0};

    if( params.length != 2){
      throw new InvalidArgument(`Sharpen param error, e.g: /sharpen,1 `);
    }
    const s = parseInt(params[1]);
    if (inRange(s, 0, 1)) {
      opt.sharpen = s;
    } else {
      throw new InvalidArgument('Sharpen must be 0 or 1');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);

    //NOTE: Ali bright config range from 50 to 399, default 100 
    // SharpJs bright config range from  0.01 to 10000
 

    if(opt.sharpen == 1){
      ctx.image.sharpen(50) 
    }
    
  }
}