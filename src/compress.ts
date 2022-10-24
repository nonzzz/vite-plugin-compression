import type { Gzip } from 'zlib'
import type { CompressionOptions, Algorithm } from './interface'

export const ensureAlgorithmAndFormat = async (
  algorithm: Algorithm,
  compressionOptions: CompressionOptions
): Promise<[Gzip, string]> => {
  const zlib = await import('zlib')
  switch (algorithm) {
    case 'gzip':
      return [zlib.createGzip(compressionOptions), '.gz']
    case 'brotliCompress':
      return [zlib.createBrotliCompress(compressionOptions), '.br']
    case 'deflate':
    case 'deflateRaw':
      const algo = algorithm === 'deflate' ? zlib.createDeflate : zlib.createDeflateRaw
      return [algo(compressionOptions), '']
    default:
      throw new Error('Invalid algorithm')
  }
}
