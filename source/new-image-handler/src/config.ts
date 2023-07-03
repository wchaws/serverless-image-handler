const {
  REGION,
  AWS_REGION,
  NODE_ENV,
  BUCKET,
  SRC_BUCKET,
  STYLE_TABLE_NAME,
  AUTO_WEBP,
  SECRET_NAME,
  SHARP_QUEUE_LIMIT,
  CONFIG_JSON_PARAMETER_NAME,
  CACHE_TTL_SEC,
  CACHE_MAX_ITEMS,
  CACHE_MAX_SIZE_MB,
} = process.env;

export interface IConfig {
  port: number;
  region: string;
  isProd: boolean;
  srcBucket: string;
  styleTableName: string;
  autoWebp: boolean;
  secretName: string;
  sharpQueueLimit: number;
  configJsonParameterName: string;
  CACHE_TTL_SEC: number;
  CACHE_MAX_ITEMS: number;
  CACHE_MAX_SIZE_MB: number;
}

function parseInt(s: string) {
  return Number.parseInt(s, 10);
}

const conf: IConfig = {
  port: 8080,
  region: REGION ?? AWS_REGION ?? 'us-west-2',
  isProd: NODE_ENV === 'production',
  srcBucket: BUCKET || SRC_BUCKET || 'sih-input',
  styleTableName: STYLE_TABLE_NAME || 'style-table-name',
  autoWebp: ['yes', '1', 'true'].includes((AUTO_WEBP ?? '').toLowerCase()),
  secretName: SECRET_NAME ?? 'X-Client-Authorization',
  sharpQueueLimit: parseInt(SHARP_QUEUE_LIMIT ?? '1'),
  configJsonParameterName: CONFIG_JSON_PARAMETER_NAME ?? '',
  CACHE_TTL_SEC: parseInt(CACHE_TTL_SEC ?? '300'),
  CACHE_MAX_ITEMS: parseInt(CACHE_MAX_ITEMS ?? '10000'),
  CACHE_MAX_SIZE_MB: parseInt(CACHE_MAX_SIZE_MB ?? '1024'),
};

export default conf;