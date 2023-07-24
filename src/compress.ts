import zlib from 'zlib'
import type { BrotliOptions, ZlibOptions } from 'zlib'
import type { Algorithm, AlgorithmFunction, CompressionOptions } from './interface'

export function ensureAlgorithm(userAlgorithm: Algorithm) {
  const algorithm = userAlgorithm in zlib ? userAlgorithm : 'gzip'
  return {
    algorithm: zlib[algorithm]
  }
}

export function transfer<T>(
  buf: Buffer,
  compress: AlgorithmFunction<T>,
  options: CompressionOptions<T>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    compress(buf, options, (err, bf) => {
      if (err) {
        reject(err)
        return
      }

      if (!Buffer.isBuffer(bf)) {
        resolve(Buffer.from(bf))
      } else {
        resolve(bf)
      }
    })
  })
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
