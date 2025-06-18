import fs from 'fs'
import path from 'path'
import { createPack } from 'tar-mini'
import util from 'util'
import zlib from 'zlib'
import type { BrotliOptions, InputType, ZlibOptions, ZstdOptions } from 'zlib'

import type { Algorithm, AlgorithmFunction, CoreAlgorithm, UserCompressionOptions } from './interface'
import { slash, stringToBytes } from './shared'

export function resolveAlgorithm(algorithm: Algorithm): CoreAlgorithm {
  if (algorithm === 'gz') { return 'gzip' }
  if (algorithm === 'brotli' || algorithm === 'br') { return 'brotliCompress' }
  if (algorithm === 'zstd') { return 'zstandard' }
  return algorithm
}
// Note: we should verify zstd support
// It add at `v23.8.0` and `v22.15.0`
export function ensureAlgorithm(userAlgorithm: Algorithm) {
  const resolvedAlgorithm = resolveAlgorithm(userAlgorithm)
  if (resolvedAlgorithm === 'zstandard') {
    const [major, minor] = process.versions.node.split('.').map((s) => +s)
    const isSupported = (major > 23) ||
      (major === 23 && minor >= 8) ||
      (major === 22 && minor >= 15)
    if (!isSupported) {
      throw new Error(
        `Node.js ${process.versions.node} does not support zstd compression. ` +
          `Requires Node.js >= 22.15.0 or >= 23.8.0`
      )
    }
    if (!zlib.zstdCompress) {
      throw new Error('zstd compression is not available in this Node.js build')
    }
    return {
      algorithm: util.promisify(zlib.zstdCompress)
    }
  }
  const algorithm = resolvedAlgorithm in zlib ? resolvedAlgorithm : 'gzip'

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
  [algorithm in CoreAlgorithm]: algorithm extends 'brotliCompress' ? BrotliOptions : algorithm extends 'zstd' ? ZstdOptions : ZlibOptions
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
  },
  // I don't know what the best default options for zstd are, so using an empty object
  zstandard: {}
}

interface TarballOptions {
  dests: string[]
  root: string
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
    root: ''
  }

  const add = (meta: TarballFileMeta) => {
    pack.add(stringToBytes(meta.content), { filename: meta.filename })
  }

  const setup = (tarballOPtions: TarballOptions) => {
    Object.assign(options, tarballOPtions)

    options.dests.forEach((dest) => {
      const expected = slash(path.resolve(options.root, dest + '.tar'))
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
