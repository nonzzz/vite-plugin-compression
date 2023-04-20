import fsp from 'fs/promises'
import fs from 'fs'
import path from 'path'
import { createFilter } from '@rollup/pluginutils'
import { len, replaceFileName, slash, readAll } from './utils'
import { defaultCompressionOptions, ensureAlgorithm, transfer } from './compress'
import type { Plugin, ChunkMetadata, ResolvedConfig } from 'vite'
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

const VITE_INTERNAL_CHUNK_META = 'viteMetadata'
const VITE_COPY_PUBLIC_DIR = 'copyPublicDir'
const MAX_CONCURRENT = 10

type HandleCompressInvork = ([file, meta]: [string, CompressMetaInfo]) => Promise<void>

interface OutputOptions {
  dest: string
}

async function handleCompress(tasks: Map<string, CompressMetaInfo>, invork: HandleCompressInvork) {
  if (!tasks.size) return
  await Promise.all(Array.from(tasks.entries()).map(invork))
}

function handleOutputOption(conf: ResolvedConfig, outputs: OutputOptions[]) {
  if (conf.build.rollupOptions?.output) {
    const outputOptions = Array.isArray(conf.build.rollupOptions.output)
      ? conf.build.rollupOptions.output
      : [conf.build.rollupOptions.output]
    outputOptions.forEach((opt) => {
      outputs.push({ dest: opt.dir || conf.build.outDir })
    })
    return
  }
  outputs.push({ dest: conf.build.outDir })
}

function compression(): Plugin
function compression<A extends Algorithm>(opts: ViteCompressionPluginConfigAlgorithm<A>): Plugin
function compression<T = UserCompressionOptions>(opts: ViteCompressionPluginConfigFunction<T>): Plugin
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

  const normalizedOutputs: OutputOptions[] = []

  const zlib: {
    algorithm: AlgorithmFunction<T>
    filename: string | ((id: string) => string)
    options: CompressionOptions<T>
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
    async configResolved(config) {
      // issue #26
      // https://github.com/vitejs/vite/blob/716286ef21f4d59786f21341a52a81ee5db58aba/packages/vite/src/node/build.ts#L566-L611
      // Unfortunately. Vite follow rollup option as first and the configResolved Hook don't expose merged conf for user. :(
      // Someone who like using rollupOption. `config.build.outDir` will not as expected.
      handleOutputOption(config, normalizedOutputs)
      // Vite's pubic build: https://github.com/vitejs/vite/blob/HEAD/packages/vite/src/node/build.ts#L704-L709
      // copyPublicDir minimum version 3.2+
      const baseCondit = VITE_COPY_PUBLIC_DIR in config.build ? config.build.copyPublicDir : true
      if (config.publicDir && baseCondit && fs.existsSync(config.publicDir)) {
        const staticAssets = await readAll(config.publicDir)
        const publicPath = path.join(config.root, path.relative(config.root, config.publicDir))
        staticAssets.forEach((assets) => {
          const file = path.relative(publicPath, assets)
          if (!filter(file)) return
          normalizedOutputs.forEach((output) =>
            schedule.set(slash(file), {
              effect: true,
              file: [slash(path.join(output.dest, file))],
              dest: [output.dest]
            })
          )
        })
      }
    },
    // Unfortunately. Vite support using object as hooks to change execution order need at least 3.1.0
    // So we should record that with side Effect bundle file. (Because file with dynamic import will trigger vite's internal importAnalysisBuild logic and it will generator vite's placeholder.)
    // Vite importAnalysisBuild source code: https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/importAnalysisBuild.ts
    // Vite's plugin order see: https://github.com/vitejs/vite/blob/HEAD/packages/vite/src/node/plugins/index.ts#L94-L98
    async generateBundle(_, bundles) {
      for (const fileName in bundles) {
        if (!filter(fileName)) continue
        const bundle = bundles[fileName]
        const result = bundle.type == 'asset' ? bundle.source : bundle.code
        const size = len(result)
        if (size < threshold) continue
        const effect = bundle.type === 'chunk' && !!len(bundle.dynamicImports)
        const meta: CompressMetaInfo = Object.create(null)
        // File without siede Effect will be automatically generator by vite processing.
        meta.effect = effect
        if (meta.effect) {
          meta.file = []
          meta.dest = []
          normalizedOutputs.forEach((output) => {
            meta.file.push(slash(path.join(output.dest, fileName)))
            meta.dest.push(output.dest)
          })
          if (VITE_INTERNAL_CHUNK_META in bundle) {
            // This is a hack logic. We get all bundle file reference relation. And record them with effect.
            // Some case like virtual module we should ignored them.
            const { importedAssets, importedCss } = bundle[VITE_INTERNAL_CHUNK_META] as ChunkMetadata
            // @ts-ignored
            const imports = [...importedAssets, ...importedCss, ...bundle.dynamicImports]
            imports.forEach((importer) => {
              if (!filter(filter)) return
              if (importer in bundles) {
                const files = []
                const dest = []
                normalizedOutputs.forEach((output) => {
                  files.push(slash(path.join(output.dest, importer)))
                  dest.push(output.dest)
                })
                schedule.set(importer, {
                  effect: true,
                  file: files,
                  dest
                })
              }
            })
          }
        }

        if (!schedule.has(fileName) && bundle) schedule.set(fileName, meta)
      }
      try {
        await handleCompress(schedule, async ([file, meta]) => {
          if (meta.effect) return
          const bundle = bundles[file]
          const source = bundle.type === 'asset' ? bundle.source : bundle.code
          const compressed = await transfer(Buffer.from(source), zlib.algorithm, zlib.options)
          const fileName = replaceFileName(file, zlib.filename)
          this.emitFile({ type: 'asset', source: compressed, fileName })
          if (deleteOriginalAssets) Reflect.deleteProperty(bundles, file)
          schedule.delete(file)
        })
      } catch (error) {
        /* c8 ignore start */
        this.error(error)
      }
      /* c8 ignore stop */
    },
    async closeBundle() {
      const queue: Array<{ file: string; meta: CompressMetaInfo }> = []
      let index = 0

      const handle = async (file: string, meta: CompressMetaInfo) => {
        if (!meta.effect) return
        for (const dest of meta.dest) {
          for (const f of meta.file) {
            const buf = await fsp.readFile(f)
            const compressed = await transfer(buf, zlib.algorithm, zlib.options)
            const fileName = replaceFileName(file, zlib.filename)
            await fsp.writeFile(path.join(dest, fileName), compressed)
            if (deleteOriginalAssets) await fsp.rm(f, { recursive: true, force: true })
          }
        }
      }

      const next = () => {
        if (index >= len(queue)) return
        const { file, meta } = queue[index]
        index++
        handle(file, meta).then(next)
      }
      try {
        for (const [file, meta] of schedule) {
          queue.push({ file, meta })
          if (queue.length === MAX_CONCURRENT) {
            await Promise.all(queue.map(({ file, meta }) => handle(file, meta)))
            queue.length = 0
          }
        }
        await Promise.all(queue.map(({ file, meta }) => handle(file, meta)))
      } catch (error) {
        /* c8 ignore start */
        // issue #18
        // In somecase. Like vuepress it will called vite build with `Promise.all`. But it's concurrency. when we record the
        // file fd. It had been changed. So that we should catch the error
        /* c8 ignore stop */
      }
      schedule.clear()
    }
  }
}

export { compression }

export default compression

export type { CompressionOptions, Algorithm, ViteCompressionPluginConfig } from './interface'
