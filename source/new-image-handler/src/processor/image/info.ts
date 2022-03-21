import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument, Features } from '..';


export class InfoAction implements IImageAction {
  public readonly name: string = 'info';

  public validate(params: string[]): ReadOnly<IActionOpts> {
    if ((params.length !== 1) || (params[0] !== this.name)) {
      throw new InvalidArgument('Info param error');
    }
    return {};
  }

  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    this.validate(params);

    const metadata = await ctx.image.metadata();
    ctx.info = {
      FileSize: { value: String(metadata.size) },
      Format: { value: String(metadata.format === 'jpeg' ? 'jpg' : metadata.format) },
      ImageHeight: { value: String(metadata.pageHeight ?? metadata.height) },
      ImageWidth: { value: String(metadata.width) },
    };

    ctx.features[Features.ReturnInfo] = true;
  }
}