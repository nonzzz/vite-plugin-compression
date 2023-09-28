import zlib from 'zlib'
import util from 'util'
import type { BrotliOptions, ZlibOptions } from 'zlib'
import type { Algorithm, AlgorithmFunction, UserCompressionOptions } from './interface'

export function ensureAlgorithm(userAlgorithm: Algorithm) {
  const algorithm = userAlgorithm in zlib ? userAlgorithm : 'gzip'
  return {
    algorithm: util.promisify(zlib[algorithm])
  }
}

export async function compress<T extends UserCompressionOptions | undefined>(
  buf: Buffer,
  compress: AlgorithmFunction<T>,
  options: T
) {
  try {
    const res = await compress(buf, options)
    if (Buffer.isBuffer(res)) return res
    return Buffer.from(res as any)
  } catch (error) {
    return Promise.reject(error)
  }
}

export const defaultCompressionOptions: {
  [algorithm in Algorithm]: algorithm extends 'brotliCompress' ? BrotliOptions : ZlibOptions
} = {
  gzip: {
    level: zlib.constants.Z_BEST_COMPRESSION
  },
  brotliCompress: {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY
    }
  },
  deflate: {
    level: zlib.constants.Z_BEST_COMPRESSION
  },
  deflateRaw: {
    level: zlib.constants.Z_BEST_COMPRESSION
  }
}
