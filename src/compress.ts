import fs from 'fs'
import path from 'path'
import { createPack } from 'tar-mini'
import util from 'util'
import zlib from 'zlib'
import type { BrotliOptions, InputType, ZlibOptions } from 'zlib'

import type { Algorithm, AlgorithmFunction, UserCompressionOptions } from './interface'
import { slash, stringToBytes } from './shared'

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
    return Promise.reject(error as Error)
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
  gz: boolean
}

interface TarballFileMeta {
  filename: string
  content: string | Uint8Array
}

export function createTarBall() {
  const pack = createPack()

  const wss: fs.WriteStream[] = []

  const options: TarballOptions = {
    dests: [],
    root: '',
    gz: false
  }

  const add = (meta: TarballFileMeta) => {
    pack.add(stringToBytes(meta.content), { filename: meta.filename })
  }

  const setup = (tarballOPtions: TarballOptions) => {
    Object.assign(options, tarballOPtions)

    options.dests.forEach((dest) => {
      const expected = slash(path.resolve(options.root, dest + '.tar' + (options.gz ? '.gz' : '')))
      const parent = slash(path.dirname(expected))
      if (slash(options.root) !== parent) {
        fs.mkdirSync(parent, { recursive: true })
      }
      const w = fs.createWriteStream(expected)
      wss.push(w)
    })
  }

  const done = async () => {
    pack.done()
    await Promise.all(wss.map((w) =>
      new Promise<void>((resolve, reject) => {
        w.on('error', reject)
        w.on('finish', resolve)
        if (options.gz) {
          pack.receiver.pipe(zlib.createGzip()).pipe(w)
          return
        }
        pack.receiver.pipe(w)
      })
    ))
    wss.length = 0
  }

  const context = {
    add,
    setup,
    done
  }

  return context
}
