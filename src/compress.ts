import type { Algorithm, CompressionOptions, AlgorithmFunction } from './interface'

export const ensureAlgorithmAndFormat = async (algorithm: Algorithm) => {
  const zlib = await import('zlib')
  if (algorithm in zlib) {
    const ext = algorithm === 'gzip' ? '.gz' : algorithm === 'brotliCompress' ? '.br' : ''
    return {
      algorithm: zlib[algorithm],
      ext
    }
  }
  throw new Error('Invalid algorithm in "zlib"')
}

export const transfer = (buf: Buffer, compress: AlgorithmFunction, options: CompressionOptions): Promise<Buffer> => {
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
