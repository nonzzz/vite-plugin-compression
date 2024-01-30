import zlib from 'zlib'
import util from 'util'
import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import type { BrotliOptions, ZlibOptions } from 'zlib'
import archiver from 'archiver'
import type { Algorithm, AlgorithmFunction, UserCompressionOptions } from './interface'
import { slash } from './utils'

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

interface ArchiveOptions {
  zlib: ZlibOptions
  root: string
  dest: string
}

// https://github.com/archiverjs/node-archiver/blob/master/examples/pack-tgz.js
export function createArchive(options: ArchiveOptions) {
  const { root, zlib } = options
  const pack = archiver('tar', { zlib })
  return {
    add(filename: string, content: Buffer) {
      pack.append(content, { name: filename, mode: 0o755, date: new Date() })
    },
    async wait() {
      if (!path.extname(options.dest)) {
        options.dest = `${options.dest}.tar.gz`
      }
      const expected = slash(path.resolve(root, options.dest))
      if (!fs.existsSync(expected)) {
        const parent = slash(path.dirname(expected))
        if (root !== parent) {
          await fsp.mkdir(parent, { recursive: true })
        }
      }
      const output = fs.createWriteStream(expected)
      pack.pipe(output)
      await new Promise((resolve, reject) => {
        pack.finalize()
        pack.on('finish', resolve)
        pack.on('error', reject)
        pack.on('warning', (err) => {
          if (err.code !== 'ENOENT') {
            reject(err)
          }
        })
      })
    }
  }
}
