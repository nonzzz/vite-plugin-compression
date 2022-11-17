import { createFilter } from '@rollup/pluginutils'
import { len } from './utils'
import { ensureAlgorithmAndFormat, transfer } from './compress'
import type { Plugin } from 'vite'
import type { ViteCompressionPluginConfig } from './interface'

function compression(opts: ViteCompressionPluginConfig = {}): Plugin {
  const {
    include,
    exclude,
    threshold = 0,
    algorithm: userAlgorithm = 'gzip',
    compressionOptions = { level: 9 },
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

  return {
    name: 'vite-plugin-compression',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_, bundles) {
      const { algorithm, ext } = await ensureAlgorithmAndFormat(
        typeof userAlgorithm === 'function' ? userAlgorithm() : userAlgorithm
      )

      for (const fileName in bundles) {
        if (!filter(fileName)) break
        const bundle = bundles[fileName]
        const source = bundle.type === 'asset' ? bundle.source : bundle.code
        const beforeCompressBytes =
          typeof source === 'string' ? Buffer.from(source).byteLength : source.buffer.byteLength
        if (beforeCompressBytes <= threshold) break
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
            const compressed = await transfer(source, algorithm, compressionOptions)
            this.emitFile({ type: 'asset', source: compressed, fileName: task + ext })
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
