export interface IConfig {
  port: number;
  region: string;
  isProd: boolean;
  srcBucket: string;
  styleTableName: string;
  autoWebp: boolean;
  secretName: string;
  RateLimitPerSec: number;
}

const conf: IConfig = {
  port: 8080,
  region: process.env.REGION ?? 'us-west-2',
  isProd: process.env.NODE_ENV === 'production',
  srcBucket: process.env.BUCKET || process.env.SRC_BUCKET || 'sih-input',
  styleTableName: process.env.STYLE_TABLE_NAME || 'style-table-name',
  autoWebp: ['yes', '1', 'true'].includes((process.env.AUTO_WEBP ?? '').toLowerCase()),
  secretName: process.env.SECRET_NAME ?? 'X-Client-Authorization',
  RateLimitPerSec: Number.parseInt(process.env.RATE_LIMIT_PER_SEC ?? '100', 10),
};

export default conf;