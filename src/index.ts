import fsp from 'fs/promises'
import path from 'path'
import { createFilter } from '@rollup/pluginutils'
import { len, replaceFileName, slash } from './utils'
import { defaultCompressionOptions, ensureAlgorithm, transfer } from './compress'
import type { Plugin } from 'vite'
import type {
  Algorithm,
  AlgorithmFunction,
  CompressionOptions,
  ViteCompressionPluginConfig,
  ViteCompressionPluginConfigAlgorithm,
  ViteCompressionPluginConfigFunction,
  CompressMetaInfo,
  UserCompressionOptions
} from './interface'

function compression<A extends Algorithm>(opts?: ViteCompressionPluginConfigAlgorithm<A>): Plugin
function compression<T = UserCompressionOptions>(opts?: ViteCompressionPluginConfigFunction<T>): Plugin
function compression<T, A extends Algorithm>(opts: ViteCompressionPluginConfig<T, A> = {}): Plugin {
  const {
    include,
    exclude,
    threshold = 0,
    algorithm: userAlgorithm = 'gzip',
    filename,
    compressionOptions,
    deleteOriginalAssets = false
  } = opts

  const filter = createFilter(include, exclude)

  const schedule = new Map<string, CompressMetaInfo>()

  const zlib: {
    algorithm: AlgorithmFunction<T>
    filename: string | ((id: string) => string)
    options: CompressionOptions<T>
    dest: string
  } = Object.create(null)

  zlib.algorithm = typeof userAlgorithm === 'string' ? ensureAlgorithm(userAlgorithm).algorithm : userAlgorithm
  // @ts-ignore
  zlib.options =
    typeof userAlgorithm === 'function'
      ? compressionOptions
      : Object.assign(defaultCompressionOptions[userAlgorithm], compressionOptions)
  zlib.filename = filename ?? (userAlgorithm === 'brotliCompress' ? '[path][base].br' : '[path][base].gz')

  return {
    name: 'vite-plugin-compression',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      zlib.dest = config.build.outDir
    },
    // We need specify the order of the hook
    // Becasue in vite's intenral logic it will
    // trigger _preload logic. So that if we run the hook
    // before vite's importAnalysisBuild function it will
    // cause loose all of link map.
    // Please see: https://github.com/vitejs/vite/blob/HEAD/packages/vite/src/node/plugins/index.ts#L94-L98
    generateBundle: {
      order: 'post',
      async handler(_, bundles) {
        for (const fileName in bundles) {
          if (!filter(fileName)) continue
          const bundle = bundles[fileName]
          const result = bundle.type == 'asset' ? bundle.source : bundle.code
          const size = len(result)
          if (size < threshold) continue
          const effect = bundle.type === 'chunk' && !!len(bundle.dynamicImports)
          const meta: CompressMetaInfo = Object.create(null)
          meta.effect = effect
          if (meta.effect) {
            meta.file = slash(path.join(zlib.dest, fileName))
          }
          schedule.set(fileName, meta)
        }
        try {
          if (!schedule.size) return
          await Promise.all(
            Array.from(schedule.entries()).map(async ([file, meta]) => {
              if (meta.effect) return
              const bundle = bundles[file]
              const source = bundle.type === 'asset' ? bundle.source : bundle.code
              const compressed = await transfer(Buffer.from(source), zlib.algorithm, zlib.options)
              const fileName = replaceFileName(file, zlib.filename)
              this.emitFile({ type: 'asset', source: compressed, fileName })
              if (deleteOriginalAssets) Reflect.deleteProperty(bundles, file)
              schedule.delete(file)
            })
          )
        } catch (error) {
          this.error(error)
        }
      }
    },
    async closeBundle() {
      if (!schedule.size) return
      await Promise.all(
        Array.from(schedule.entries()).map(async ([file, meta]) => {
          if (!meta.effect) return
          const buf = await fsp.readFile(meta.file)
          const compressed = await transfer(buf, zlib.algorithm, zlib.options)
          const fileName = replaceFileName(file, zlib.filename)
          await fsp.writeFile(path.join(zlib.dest, fileName), compressed)
          if (deleteOriginalAssets) await fsp.rm(meta.file, { recursive: true, force: true })
        })
      )
      schedule.clear()
    }
  }
}

export { compression }

export default compression

export type { CompressionOptions, Algorithm, ViteCompressionPluginConfig } from './interface'
