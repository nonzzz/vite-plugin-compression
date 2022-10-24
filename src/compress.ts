import { createReadStream, createWriteStream } from 'fs'
import type { Gzip } from 'zlib'
import type { CompressionOptions, Algorithm, Compress } from './interface'

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

export const transfer = (entry: string, to: string, compress: Compress): Promise<number> => {
  const len = []
  return new Promise((resolve, reject) => {
    createReadStream(entry)
      .pipe(compress)
      .on('data', (chunk) => len.push(chunk))
      .pipe(createWriteStream(to))
      .on('close', () => resolve(Buffer.concat(len).byteLength))
      .on('error', reject)
  })
}
