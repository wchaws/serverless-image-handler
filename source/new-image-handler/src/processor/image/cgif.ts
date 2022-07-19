import { IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument, Features, IProcessContext } from '..';
import { BaseImageAction } from './_base';


export interface CgifOpts extends IActionOpts {
  s?: number;
}

export class CgitAction extends BaseImageAction {
  public readonly name: string = 'cgif';

  public beforeNewContext(ctx: IProcessContext): void {
    ctx.features[Features.ReadAllAnimatedFrames] = false;
  }

  public validate(params: string[]): ReadOnly<CgifOpts> {
    let opt: CgifOpts = { };
    if (params.length !== 2) {
      throw new InvalidArgument('Cut gif param error, e.g: cgif,s_1');
    }
    const [k, v] = params[1].split('_');
    if (k === 's') {
      opt.s = Number.parseInt(v, 10);
    } else {
      throw new InvalidArgument(`Unkown param: "${k}"`);
    }
    return opt;
  }

  public async process(ctx: IImageContext): Promise<void> {
    const metadata = ctx.metadata;
    if (!('gif' === ctx.metadata.format)) {
      throw new InvalidArgument('Format must be Gif');
    }
    if (!(metadata.pages)) {
      throw new InvalidArgument('Can\'t read git\'s pages');
    }
    // const opt = this.validate(params);
    // if (opt.s) {
    //   if (opt.s > metadata.pages) {
    //     throw new InvalidArgument('Bad page number');
    //   }else{
    //     ctx.metadata.pages = opt.s;
    //     const { buffer } = await ctx.bufferStore.get(ctx.uri);
    //     ctx.image = sharp(buffer, { failOnError: true, animated: false, pages: opt.s }).gif({ effort: 1 });
    //   }
    // }
  }
}