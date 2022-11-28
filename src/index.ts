import fsp from 'fs/promises'
import path from 'path'
import { createFilter } from '@rollup/pluginutils'
import { len, replaceFileName, slash } from './utils'
import { defaultCompressionOptions, ensureAlgorithm, transfer } from './compress'
import type { Plugin } from 'vite'
import type { AlgorithmFunction, CompressionOptions, ViteCompressionPluginConfig } from './interface'

function compression<T>(opts: ViteCompressionPluginConfig<T> = {}): Plugin {
  const {
    include,
    exclude,
    threshold = 0,
    algorithm: userAlgorithm = 'gzip',
    filename = userAlgorithm === 'brotliCompress' ? '[path][base].br' : '[path][base].gz',
    compressionOptions,
    deleteOriginalAssets = false
  } = opts

  const filter = createFilter(include, exclude)

  const bucket = new Map<
    string,
    {
      source?: Buffer
      type: 'asset' | 'chunk'
      beforeCompressBytes?: number
      afterCompressBytes?: number
    }
  >()

  const dynamicImports = []

  const zlib: {
    algorithm: AlgorithmFunction<T>
    filename: string | ((id: string) => string)
    options: CompressionOptions<T>
    dest: string
  } = Object.create(null)

  zlib.algorithm = typeof userAlgorithm === 'string' ? ensureAlgorithm(userAlgorithm).algorithm : userAlgorithm
  zlib.options =
    typeof userAlgorithm === 'function'
      ? compressionOptions
      : Object.assign(defaultCompressionOptions[userAlgorithm], compressionOptions)
  zlib.filename = filename

  return {
    name: 'vite-plugin-compression',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      zlib.dest = config.build.outDir
    },
    async generateBundle(_, bundles) {
      for (const fileName in bundles) {
        if (!filter(fileName)) continue
        const bundle = bundles[fileName]
        const source = bundle.type === 'asset' ? bundle.source : bundle.code
        const beforeCompressBytes =
          typeof source === 'string' ? Buffer.from(source).byteLength : source.buffer.byteLength
        if (beforeCompressBytes < threshold) continue
        if (bundle.type === 'chunk' && len(bundle.dynamicImports)) {
          dynamicImports.push(fileName)
          continue
        }
        bucket.set(fileName, {
          source: Buffer.from(source),
          type: bundle.type,
          beforeCompressBytes
        })
      }

      try {
        const tasks = Array.from(bucket.keys())
        if (!len(tasks)) return
        await Promise.all(
          tasks.map(async (task) => {
            const { source } = bucket.get(task)
            const compressed = await transfer(source, zlib.algorithm, zlib.options)
            const fileName = replaceFileName(task, zlib.filename)
            this.emitFile({ type: 'asset', source: compressed, fileName })
            if (deleteOriginalAssets) {
              if (Reflect.has(bundles, task)) {
                Reflect.deleteProperty(bundles, task)
              }
            }
          })
        )
      } catch (error) {
        this.error(error)
      }
    },
    async closeBundle() {
      if (len(dynamicImports)) {
        const files = dynamicImports.map((file) => [file, slash(path.join(zlib.dest, file))])
        await Promise.all(
          files.map(async ([filename, file]) => {
            const buf = await fsp.readFile(file)
            const compressed = await transfer(buf, zlib.algorithm, zlib.options)
            const fileName = replaceFileName(filename, zlib.filename)
            await fsp.writeFile(path.join(zlib.dest, fileName), compressed)
            if (deleteOriginalAssets) {
              await fsp.rm(file, { recursive: true, force: true })
            }
          })
        )
      }
    }
  }
}

export { compression }

export default compression

export type { CompressionOptions, Algorithm, ViteCompressionPluginConfig } from './interface'
