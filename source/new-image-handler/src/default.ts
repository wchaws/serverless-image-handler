import * as path from 'path';
import { ParsedUrlQuery } from 'querystring';
import config from './config';
import { InvalidArgument, IProcessor } from './processor';
import { ImageProcessor } from './processor/image';
import { StyleProcessor } from './processor/style';
import { VideoProcessor } from './processor/video';
import {
  IBufferStore,
  S3Store,
  LocalStore,
  MemKVStore,
  DynamoDBStore,
  IKVStore,
} from './store';
import * as style from './style.json';

const PROCESSOR_MAP: { [key: string]: IProcessor } = {
  [ImageProcessor.getInstance().name]: ImageProcessor.getInstance(),
  [StyleProcessor.getInstance().name]: StyleProcessor.getInstance(kvstore()),
  [VideoProcessor.getInstance().name]: VideoProcessor.getInstance(),
};

export function setMaxGifSizeMB(value: number) {
  ImageProcessor.getInstance().setMaxGifSizeMB(value);
}

export function setMaxGifPages(value: number) {
  ImageProcessor.getInstance().setMaxGifPages(value);
}

export function getProcessor(name: string): IProcessor {
  const processor = PROCESSOR_MAP[name];
  if (!processor) {
    throw new InvalidArgument('Can Not find processor');
  }
  return processor;
}

export function bufferStore(p?: string): IBufferStore {
  if (config.isProd) {
    if (!p) {
      p = config.srcBucket;
    }
    console.log(`use ${S3Store.name} s3://${p}`);
    return new S3Store(p);
  } else {
    if (!p) {
      p = path.join(__dirname, '../test/fixtures');
    }
    console.log(`use ${LocalStore.name} file://${p}`);
    return new LocalStore(p);
  }
}

export function kvstore(): IKVStore {
  if (config.isProd) {
    console.log(`use ${DynamoDBStore.name}`);
    return new DynamoDBStore(config.styleTableName);
  } else {
    console.log(`use ${MemKVStore.name}`);
    return new MemKVStore(style);
  }
}

export function parseRequest(
  uri: string,
  query: ParsedUrlQuery,
): { uri: string; actions: string[] } {
  uri = uri.replace(/^\//, ''); // trim leading slash "/"
  const parts = uri.split(/@?!/, 2);
  if (parts.length === 1) {
    if ('image_process' in query) {
      // eslint-disable-next-line dot-notation
      const image_process = (query['image_process'] as string) ?? '';
      let actionparam = image_process.split('/').filter((x) => x);
      actionparam.unshift('image');
      return {
        uri: uri,
        actions: actionparam,
      };
    }
    const x_oss_process = (query['x-oss-process'] as string) ?? '';
    return {
      uri: uri,
      actions: x_oss_process.split('/').filter((x) => x),
    };
  }
  const stylename = (parts[1] ?? '').trim();
  if (!stylename) {
    throw new InvalidArgument('Empty style name');
  }
  return {
    uri: parts[0],
    actions: ['style', stylename],
  };
}
