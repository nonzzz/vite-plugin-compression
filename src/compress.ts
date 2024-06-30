import zlib from 'zlib'
import util from 'util'
import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import type { BrotliOptions, InputType, ZlibOptions } from 'zlib'
import tar from 'tar-stream'
import gunzip from 'gunzip-maybe'
import type { Algorithm, AlgorithmFunction, UserCompressionOptions } from './interface'
import { slash, stringToBytes } from './utils'

export function ensureAlgorithm(userAlgorithm: Algorithm) {
  const algorithm = userAlgorithm in zlib ? userAlgorithm : 'gzip'
  return {
    algorithm: util.promisify(zlib[algorithm])
  }
}

export async function compress<T extends UserCompressionOptions | undefined>(
  buf: InputType,
  compress: AlgorithmFunction<T>,
  options: T
) {
  try {
    const res = await compress(buf, options)
    return res
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

interface TarballOptions {
  dests: string[]
  root: string
}

export function createTarBall() {
  const pack = tar.pack()

  const options: TarballOptions = {
    dests: [],
    root: ''
  }

  const setOptions = (tarballOPtions: TarballOptions) => Object.assign(options, tarballOPtions)

  const add = (fileName: string, content: string | Uint8Array) => {
    pack.entry({ name: fileName }, Buffer.from(stringToBytes(content)))
  }

  const write = async () => {
    // no more entries
    pack.finalize()
    await Promise.all(options.dests.map(async (dest) => {
      const expected = slash(path.resolve(options.root, dest + '.tar.gz'))
      const parent = slash(path.dirname(expected))
      if (options.root !== parent) {
        await fsp.mkdir(parent, { recursive: true })
      }
      const output = fs.createWriteStream(expected)
      pack.pipe(gunzip()).pipe(output)
    }))
  }

  const context = {
    add,
    write,
    setOptions
  }

  return context
}
