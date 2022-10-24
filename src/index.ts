import path from 'path'
import fs from './fs'
import { Threads } from './threads'
import { fromatBytes, readGlobalFiles, resolvePath, len, printf } from './utils'
import { ensureAlgorithmAndFormat } from './compress'
import { transfer } from './stream'
import type { Plugin } from 'vite'
import type { ViteCompressionPluginConfig } from './interface'

export type { Regular, CompressionOptions, Algorithm } from './interface'

const OUT_PUT_KEY = Symbol('__vite__plugin_compression__output__path')

function compression(opts: ViteCompressionPluginConfig = {}): Plugin {
  const {
    exclude = [],
    threshold = 100,
    algorithm: userAlgorithm = 'gzip',
    compressionOptions = { level: 9 },
    deleteOriginalAssets = false,
    loginfo = 'info'
  } = opts
  const bucket = new Map<
    string,
    {
      beforeCompressBytes?: number
      afterCompressBytes?: number
    }
  >()

  const pluginInstance = Object.create(null)

  return {
    name: 'vite-plugin-compression',
    apply: 'build',
    enforce: 'post',
    configResolved(userConfig) {
      // ConfigResolved is the vite's hook.
      Reflect.set(pluginInstance, OUT_PUT_KEY, resolvePath(userConfig.build.outDir, userConfig.root))
    },
    async closeBundle() {
      const [algorithm, ext] = await ensureAlgorithmAndFormat(
        typeof userAlgorithm === 'function' ? userAlgorithm() : userAlgorithm,
        compressionOptions
      )
      const outputPath = Reflect.get(pluginInstance, OUT_PUT_KEY)
      const files = await readGlobalFiles(outputPath, exclude)

      if (!len(files)) return

      await Promise.all(
        files.map(async (file) => {
          const { size } = await fs.stat(file).catch()
          if (size <= threshold) return
          bucket.set(file, {
            beforeCompressBytes: size
          })
        })
      )
      try {
        const tasks = Array.from(bucket.keys())
        if (!len(tasks)) return
        await Promise.all(
          tasks.map(async (task) => {
            const before = bucket.get(task)
            const bytes = await transfer(task, task + ext, algorithm)
            bucket.set(task, { ...before, afterCompressBytes: bytes })
            if (deleteOriginalAssets) {
              switch (deleteOriginalAssets) {
                case 'keep-source-map':
                  return task.endsWith('.map') && fs.remove(task)
                case true:
                  return fs.remove(task)
                default:
                  throw new Error('[vite-plugin-compress]: Invalid deleteOriginalAssets')
              }
            }
          })
        )
      } catch (error) {
        this.error(error)
      }
      if (loginfo === 'info') {
        printf.info('[vite-plugin-compress]: compressed file successfully:\n')
        bucket.forEach(({ beforeCompressBytes, afterCompressBytes }, key) => {
          const target = path.relative(outputPath, key) + ext
          const ratio = `ratio: ${(afterCompressBytes / beforeCompressBytes).toFixed(2)}%`
          printf.dim(`${target} ${ratio}`)
        })
      }
    }
  }
}

export { compression }

export default compression
