import { URL, URLSearchParams } from 'url';
import * as sharp from 'sharp';
import { handler } from '../src/index-lambda';

function URLSearchParams2Obj(param: URLSearchParams) {
  const o: { [k: string]: string } = {};
  for (const [key, value] of param.entries()) {
    o[key] = value;
  }
  return o;
}

function mkevt(p: string) {
  const u = new URL(p, 'http://test');
  return {
    version: '2.0',
    routeKey: 'ANY /{proxy+}',
    rawPath: u.pathname,
    rawQueryString: u.search.substring(1),
    cookies: [
      's_fid=********',
    ],
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
      'content-length': '0',
      'host': '********.execute-api.us-west-2.amazonaws.com',
      'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="100", "Google Chrome";v="100"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
      'x-amzn-trace-id': 'Root=1-625b948f-514240be75d2c50924dcaf42',
      'x-forwarded-for': '127.0.0.1',
      'x-forwarded-port': '443',
      'x-forwarded-proto': 'https',
    },
    queryStringParameters: URLSearchParams2Obj(u.searchParams),
    requestContext: {
      accountId: '********',
      apiId: '********',
      domainName: '********.execute-api.us-west-2.amazonaws.com',
      domainPrefix: '********',
      http: {
        method: 'GET',
        path: u.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
      },
      requestId: '*****',
      routeKey: 'ANY /{proxy+}',
      stage: '$default',
      time: '17/Apr/2022:04:16:15 +0000',
      timeEpoch: 1650168975606,
    },
    pathParameters: {
      proxy: 'example.jpg',
    },
    isBase64Encoded: false,
  };
}


test('index-lambda.ts example.jpg?x-oss-process=image/resize,w_100/quality,q_50', async () => {
  const res: any = await handler(mkevt('example.jpg?x-oss-process=image/resize,w_100/quality,q_50'));

  expect(res.isBase64Encoded).toBeTruthy();
  expect(res.statusCode).toBe(200);
  expect(res.headers['Content-Type']).toBe('image/jpeg');
  expect(res.headers['Last-Modified']).toBe('Wed, 21 Oct 2014 07:28:00 GMT');
  expect(res.headers['Cache-Control']).toBe('max-age');

  const metadata = await sharp(Buffer.from(res.body, 'base64')).metadata();

  expect(metadata.width).toBe(100);
  expect(metadata.height).toBe(67);
  expect(metadata.size).toBe(1352);
  expect(metadata.format).toBe('jpeg');
});

test('index-lambda.ts example.gif?x-oss-process=image/resize,w_100/quality,q_50', async () => {
  const res: any = await handler(mkevt('example.gif?x-oss-process=image/resize,w_100/quality,q_50'));

  expect(res.isBase64Encoded).toBeTruthy();
  expect(res.statusCode).toBe(200);
  expect(res.headers['Content-Type']).toBe('image/gif');

  const metadata = await sharp(Buffer.from(res.body, 'base64')).metadata();

  expect(metadata.width).toBe(100);
  expect(metadata.height).toBe(60);
  expect(metadata.size).toBe(3544);
  expect(metadata.format).toBe('gif');
  expect(metadata.pages).toBe(3);
});

test('index-lambda.ts example.gif?x-oss-process=image/format,png', async () => {
  const res: any = await handler(mkevt('example.gif?x-oss-process=image/format,png'));

  expect(res.isBase64Encoded).toBeTruthy();
  expect(res.statusCode).toBe(200);
  expect(res.headers['Content-Type']).toBe('image/png');

  const metadata = await sharp(Buffer.from(res.body, 'base64')).metadata();

  expect(metadata.width).toBe(500);
  expect(metadata.height).toBe(300);
  expect(metadata.format).toBe('png');
});

test('index-lambda.ts example.gif?x-oss-process=image/resize,w_1/info', async () => {
  const res: any = await handler(mkevt('example.gif?x-oss-process=image/resize,w_1/info'));

  expect(res.isBase64Encoded).toBeFalsy();
  expect(res.statusCode).toBe(200);
  expect(res.headers['Content-Type']).toBe('application/json');
  expect(res.body).toBe(JSON.stringify({
    FileSize: {
      value: '21957',
    },
    Format: {
      value: 'gif',
    },
    ImageHeight: {
      value: '300',
    },
    ImageWidth: {
      value: '500',
    },
  }));
});