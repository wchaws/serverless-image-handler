import * as child_process from 'child_process';
import * as AWS from 'aws-sdk';
import { IAction, InvalidArgument, IProcessContext, IProcessor, IProcessResponse, IActionOpts, ReadOnly } from '.';
import * as is from '../is';
import { IBufferStore } from '../store';

const s3 = new AWS.S3();

export interface VideoOpts extends IActionOpts {
  t: number; // 指定截图时间, 单位：s
  f: string; // 指定输出图片的格式, jpg和png
  m: string; // 指定截图模式，不指定则为默认模式，根据时间精确截图。如果指定为fast，则截取该时间点之前的最近的一个关键帧。
  o: string; // 输出格式
}

export class VideoProcessor implements IProcessor {
  public static getInstance(): VideoProcessor {
    if (!VideoProcessor._instance) {
      VideoProcessor._instance = new VideoProcessor();
    }
    return VideoProcessor._instance;
  }
  private static _instance: VideoProcessor;

  public readonly name: string = 'video';

  private constructor() { }

  public async newContext(uri: string, actions: string[], bufferStore: IBufferStore): Promise<IProcessContext> {
    return Promise.resolve({
      uri,
      actions,
      bufferStore,
      features: {},
    });
  }

  public validate(params: string[]): ReadOnly<VideoOpts> {
    let opt: VideoOpts = {
      t: 1,
      f: 'jpg',
      m: 'fast',
      o: 'image/jpeg',
    };

    for (const param of params) {
      if (('snapshot' === param) || (!param)) {
        continue;
      }
      const [k, v] = param.split('_');
      if (k === 't') {
        if (v) {
          opt.t = Number(v) / 1000;
        }
      } else if (k === 'f') {
        if (v) {
          if (v === 'jpg') {
            opt.f = 'mjpeg';
            opt.o = 'image/jpeg';
          } else if (v === 'png') {
            opt.f = v;
            opt.o = 'image/png';
          } else {
            throw new InvalidArgument(`Unkown video snapshot format param: "${v}", must be jpg/png`);
          }
        }
      } else if (k === 'm') {
        if (v) {
          if (v !== 'fast') {
            throw new InvalidArgument(`Unkown video snapshot model param: "${v}", must be fast`);
          }
        }
      } else {
        throw new InvalidArgument(`Unkown param: "${k}"`);
      }
    }
    return opt;
  }


  // e.g. https://Host/ObjectName?x-oss-process=style/<StyleName>
  public async process(ctx: IProcessContext): Promise<IProcessResponse> {
    if (!ctx.actions) {
      throw new InvalidArgument('Invalid video context! No "actions" field.');
    }

    if (ctx.actions.length !== 2) {
      throw new InvalidArgument('Invalid video request!');
    }
    const action = ctx.actions[1];
    if (is.string(action)) {
      const params = action.split(',');
      const actionName = params[0];
      if (actionName !== 'snapshot') {
        throw new InvalidArgument('Invalid video action name!');
      }

      if (params.length !== 4) {
        throw new InvalidArgument('Invalid video request! Params .e.g ?x-oss-process=video/snapshot,t_1,f_jpg,m_fast');
      }
      const opt = this.validate(params);
      const s3PresignUrl = _getS3PresignUrl(ctx.uri);
      const data = await _videoScreenShot('ffmpeg', ['-i', s3PresignUrl, '-ss', opt.t.toString(), '-vframes', '1', '-c:v', opt.f, '-f', 'image2pipe', '-']);
      return { data: data, type: opt.o };
    } else {
      return { data: '{}', type: 'application/json' };
    }
  }

  public register(..._: IAction[]): void { }
}

function _getS3PresignUrl(uri: String) {
  const s3Info = uri.split('*');
  const bucket = s3Info[0];
  const objectKey = s3Info[1];
  const url = s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: objectKey,
    Expires: 1200,
  });
  return url;
}


const MAX_BUFFER = 1024 * 1024;
function _videoScreenShot(cmd: string, args: readonly string[]) {
  const child = child_process.spawn(cmd, args);

  return new Promise<Buffer>((resolve, reject) => {
    const _stdout: any[] = [];
    let stdoutLen = 0;

    let killed = false;
    let exited = false;
    let ex: Error | null = null;

    function exithandler(code: number | null, signal: NodeJS.Signals | null) {
      if (exited) { return; }
      exited = true;

      // merge chunks
      const stdout = Buffer.concat(_stdout);

      if (!ex && code === 0 && signal === null) {
        resolve(stdout);
        return;
      }

      const _cmd = cmd + args.join(' ');

      if (!ex) {
        // eslint-disable-next-line no-restricted-syntax
        ex = new Error('Command failed: ' + _cmd + '\n');
        (ex as any).killed = child.killed || killed;
        (ex as any).code = code;
        (ex as any).signal = signal;
      }
      (ex as any).cmd = _cmd;
      reject(ex);
    }

    function errorhandler(e: Error) {
      ex = e;
      if (child.stdout) {
        child.stdout.destroy();
      }
      if (child.stderr) {
        child.stderr.destroy();
      }
      exithandler(null, null);
    }

    function kill() {
      if (child.stdout) {
        child.stdout.destroy();
      }
      if (child.stderr) {
        child.stderr.destroy();
      }

      killed = true;
      try {
        child.kill('SIGTERM');
      } catch (e) {
        ex = e as Error;
        exithandler(null, null);
      }
    }

    if (child.stdout) {
      child.stdout.on('data', function onChildStdout(chunk) {
        stdoutLen += chunk.length;
        if (stdoutLen > MAX_BUFFER) {
          ex = new Error('Exceed max buffer size');
          kill();
        } else {
          _stdout.push(chunk);
        }
      });
    } else {
      reject(new Error('Can\'t create stdout'));
      return;
    }

    child.on('close', exithandler);
    child.on('error', errorhandler);
  });
}
