import * as os from 'os';
import { LRUCache } from 'lru-cache';
import * as sharp from 'sharp';

export interface ISharpInfo {
  cache: sharp.CacheResult;
  simd: boolean;
  counters: sharp.SharpCounters;
  concurrency: number;
  versions: {
    vips: string;
    cairo?: string;
    croco?: string;
    exif?: string;
    expat?: string;
    ffi?: string;
    fontconfig?: string;
    freetype?: string;
    gdkpixbuf?: string;
    gif?: string;
    glib?: string;
    gsf?: string;
    harfbuzz?: string;
    jpeg?: string;
    lcms?: string;
    orc?: string;
    pango?: string;
    pixman?: string;
    png?: string;
    svg?: string;
    tiff?: string;
    webp?: string;
    avif?: string;
    heif?: string;
    xml?: string;
    zlib?: string;
  };
}

export interface IDebugInfo {
  os: {
    arch: string;
    cpus: number;
    loadavg: number[];
  };
  memory: {
    stats: string;
    free: number;
    total: number;
    usage: NodeJS.MemoryUsage;
  };
  resource: {
    usage: NodeJS.ResourceUsage;
  };
  lruCache?: {
    keys: number;
    sizeMB: number;
    ttlSec: number;
  };
  sharp: ISharpInfo;
}

export default function debug(lruCache?: LRUCache<string, CacheObject>): IDebugInfo {
  const ret: IDebugInfo = {
    os: {
      arch: os.arch(),
      cpus: os.cpus().length,
      loadavg: os.loadavg(),
    },
    memory: {
      stats: `free: ${formatBytes(os.freemem())}, total: ${formatBytes(os.totalmem())}, usage ${((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)} %`,
      free: os.freemem(),
      total: os.totalmem(),
      usage: process.memoryUsage(),
    },
    resource: {
      usage: process.resourceUsage(),
    },
    sharp: {
      cache: sharp.cache(),
      simd: sharp.simd(),
      counters: sharp.counters(),
      concurrency: sharp.concurrency(),
      versions: sharp.versions,
    },
  };
  if (lruCache) {
    ret.lruCache = {
      keys: lruCache.size,
      sizeMB: Math.round(b2mb(lruCache.calculatedSize) * 100) / 100,
      ttlSec: Math.round(lruCache.ttl / 1000),
    };
  }
  return ret;
}

function b2mb(v: number) {
  return v / 1048576;
}

function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  for (; bytes >= 1024 && i < units.length - 1; i++) {
    bytes /= 1024;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
};
