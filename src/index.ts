import { createFilter } from '@rollup/pluginutils'
import { len, replaceFileName } from './utils'
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

  const zlib: {
    algorithm: AlgorithmFunction<T>
    filename: string | ((id: string) => string)
    options: CompressionOptions<T>
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
    async generateBundle(_, bundles) {
      for (const fileName in bundles) {
        if (!filter(fileName)) continue
        const bundle = bundles[fileName]
        const source = bundle.type === 'asset' ? bundle.source : bundle.code
        const beforeCompressBytes =
          typeof source === 'string' ? Buffer.from(source).byteLength : source.buffer.byteLength
        if (beforeCompressBytes < threshold) continue
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
            const { beforeCompressBytes, type, source } = bucket.get(task)
            const compressed = await transfer(source, zlib.algorithm, zlib.options)
            const fileName = replaceFileName(task, zlib.filename)
            this.emitFile({ type: 'asset', source: compressed, fileName })
            const afterCompressBytes = compressed.byteLength
            bucket.set(task, { beforeCompressBytes, type, afterCompressBytes })
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
    }
  }
}

export { compression }

export default compression

export type { CompressionOptions, Algorithm, ViteCompressionPluginConfig } from './interface'
