import * as child_process from 'child_process';
import { Readable } from 'stream';

// TODO: ImageMagick is slower than sharp for about 3x. Try removing ImageMagick later.

const MAX_BUFFER = 1024 * 1024;

// https://sourcegraph.com/github.com/nodejs/node@f7668fa2aa2781dc57d5423a0cfcfa933539779e/-/blob/lib/child_process.js?L279:10
function _imagemagick(cmd: string, buffer: Buffer, args: readonly string[]) {
  const child = child_process.spawn(cmd, args);

  Readable.from(buffer).pipe(child.stdin);

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

export function convert(buffer: Buffer, args: readonly string[]) {
  return _imagemagick('convert', buffer, ['-', ...args, '-']);
}

export function identify(buffer: Buffer, args: readonly string[]) {
  return _imagemagick('identify', buffer, [...args, '-']);
}