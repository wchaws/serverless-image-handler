import * as fs from 'fs';
import * as path from 'path';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import * as S3 from 'aws-sdk/clients/s3';
import * as sharp from 'sharp';
import config from './config';
import { IHttpHeaders } from './processor';

/**
 * A abstract store to get file data.
 * It can either get from s3 or local filesystem.
 */
export interface IStore<T> {

  /**
   * Read all buffer from underlying.
   * Return both the buffer and the s3 object/file type.
   * Usually the file type is the file's suffix.
   *
   * @param p the path of the s3 object or the file
   * @param beforeGetFunc a hook function that will be executed before get
   */
  get(p: string, beforeGetFunc?: () => void): Promise<T>;

  url(p: string): Promise<string>;
}

export interface IKeyValue {
  [key: string]: any;
}

export interface IBufferStore extends IStore<{ buffer: Buffer; type: string; headers: IHttpHeaders }> { };

export interface IKVStore extends IStore<IKeyValue> { }

/**
 * A local file system based store.
 */
export class LocalStore implements IBufferStore {
  public constructor(private root: string = '') { }
  public async get(p: string, _?: () => void):
  Promise<{ buffer: Buffer; type: string; headers: IHttpHeaders }> {
    p = path.join(this.root, p);
    return {
      buffer: await fs.promises.readFile(p),
      type: filetype(p),
      headers: {
        'Etag': 'fake-etag',
        'Last-Modified': 'Wed, 21 Oct 2014 07:28:00 GMT',
        'Cache-Control': 'max-age',
      },
    };
  }

  public async url(p: string): Promise<string> {
    return Promise.resolve(path.join(this.root, p));
  }
}

/**
 * S3 based store.
 */
export class S3Store implements IBufferStore {
  private _s3: S3 = new S3({ region: config.region });
  public constructor(public readonly bucket: string) { }
  public async get(p: string, beforeGetFunc?: () => void):
  Promise<{ buffer: Buffer; type: string; headers: IHttpHeaders }> {
    beforeGetFunc?.();
    const res = await this._s3.getObject({
      Bucket: this.bucket,
      Key: p,
    }).promise();

    if (Buffer.isBuffer(res.Body)) {
      const headers: IHttpHeaders = {};
      if (res.ETag) { headers.Etag = res.ETag; }
      if (res.LastModified) { headers['Last-Modified'] = res.LastModified; }
      if (res.CacheControl) { headers['Cache-Control'] = res.CacheControl; }
      return {
        buffer: res.Body as Buffer,
        type: res.ContentType ?? '',
        headers,
      };
    };
    throw new Error('S3 response body is not a Buffer type');
  }

  public async url(p: string): Promise<string> {
    return this._s3.getSignedUrlPromise('getObject', {
      Bucket: this.bucket,
      Key: p,
      Expires: 1200,
    });
  }
}

/**
 * A fake store. Only for unit test.
 */
export class NullStore implements IBufferStore {
  public url(_: string): Promise<string> {
    throw new Error('Method not implemented.');
  }
  public async get(p: string, _?: () => void): Promise<{ buffer: Buffer; type: string; headers: IHttpHeaders }> {
    return Promise.resolve({
      buffer: Buffer.from(p),
      type: '',
      headers: {},
    });
  }
}

/**
 * A sharp image store. Only for unit test.
 */
export class SharpBufferStore implements IBufferStore {
  constructor(private image: sharp.Sharp) { }
  public url(_: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async get(_: string, __?: () => void): Promise<{ buffer: Buffer; type: string; headers: IHttpHeaders }> {
    const { data, info } = await this.image.toBuffer({ resolveWithObject: true });
    return { buffer: data, type: info.format, headers: {} };
  }
}


export class DynamoDBStore implements IKVStore {
  private _ddb = new DynamoDB.DocumentClient({ region: config.region });
  public constructor(public readonly tableName: string) { }
  public url(_: string): Promise<string> {
    throw new Error('Method not implemented.');
  }
  public async get(key: string, _?: () => void): Promise<IKeyValue> {
    const data = await this._ddb.get({
      TableName: this.tableName,
      Key: { id: key },
    }).promise();
    return data.Item ?? {};
  }
}

export class MemKVStore implements IKVStore {
  public constructor(public readonly dict: IKeyValue) { }
  public url(_: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  public async get(key: string, _?: () => void): Promise<IKeyValue> {
    return Promise.resolve(this.dict[key] ?? {});
  }
}


function filetype(file: string) {
  return path.extname(file).substring(1);
}