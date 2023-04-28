import fsp from 'fs/promises'
import fs from 'fs'
import path from 'path'
import { createFilter } from '@rollup/pluginutils'
import { len, replaceFileName, slash, readAll } from './utils'
import { defaultCompressionOptions, ensureAlgorithm, transfer } from './compress'
import type { Plugin, ResolvedConfig } from 'vite'
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
import { createConcurrentQueue } from './task'

const VITE_COPY_PUBLIC_DIR = 'copyPublicDir'
const MAX_CONCURRENT = 10

interface OutputOptions {
  dest: string
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

function makeOutputs(outputs: OutputOptions[], file: string) {
  const dests = []
  const files = []
  outputs.forEach(({ dest }) => {
    dests.push(dest)
    files.push(slash(path.join(dest, file)))
  })
  return { dests, files }
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

  const stores = new Map<string, CompressMetaInfo>()

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
          const { files, dests } = makeOutputs(normalizedOutputs, file)
          stores.set(slash(file), {
            effect: true,
            file: files,
            dest: dests
          })
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
        // const effect = bundle.type === 'chunk' && !!len(bundle.dynamicImports)
        const meta: CompressMetaInfo = Object.create(null)
        // File without siede Effect will be automatically generator by vite processing.
        // I don't think css and assets have side effect. So we only handle dynamic Imports is enough.
        // Because vite already handle those.
        if (bundle.type === 'chunk' && len(bundle.dynamicImports)) {
          meta.effect = true
          const { dests, files } = makeOutputs(normalizedOutputs, fileName)
          if (meta.effect) {
            meta.dest = dests
            meta.file = files
          }
          const imports = bundle.dynamicImports
          imports.forEach((importer) => {
            if (!filter(importer)) return
            if (importer in bundles) {
              const { dests, files } = makeOutputs(normalizedOutputs, importer)
              stores.set(importer, {
                effect: true,
                file: files,
                dest: dests
              })
            }
          })
        } else {
          meta.effect = false
        }

        if (!stores.has(fileName) && bundle) stores.set(fileName, meta)
      }
      const queue = createConcurrentQueue(MAX_CONCURRENT)
      const handle = async (file: string, meta: CompressMetaInfo) => {
        if (meta.effect) return
        const bundle = bundles[file]
        const source = bundle.type === 'asset' ? bundle.source : bundle.code
        const compressed = await transfer(Buffer.from(source), zlib.algorithm, zlib.options)
        const fileName = replaceFileName(file, zlib.filename)
        this.emitFile({ type: 'asset', source: compressed, fileName })
        if (deleteOriginalAssets) Reflect.deleteProperty(bundles, file)
        stores.delete(file)
      }
      try {
        for (const [file, meta] of stores) {
          queue.enqueue(() => handle(file, meta))
        }
        await queue.wait()
      } catch (error) {
        /* c8 ignore start */
        this.error(error)
      }
      /* c8 ignore stop */
    },
    async closeBundle() {
      const queue = createConcurrentQueue(MAX_CONCURRENT)

      const handle = async (file: string, meta: CompressMetaInfo) => {
        if (!meta.effect) return
        for (const [pos, dest] of meta.dest.entries()) {
          const f = meta.file[pos]
          const buf = await fsp.readFile(f)
          const compressed = await transfer(buf, zlib.algorithm, zlib.options)
          const fileName = replaceFileName(file, zlib.filename)
          await fsp.writeFile(path.join(dest, fileName), compressed)
          if (deleteOriginalAssets) await fsp.rm(f, { recursive: true, force: true })
        }
      }

      try {
        for (const [file, meta] of stores) {
          queue.enqueue(() => handle(file, meta))
        }
        await queue.wait()
      } catch (error) {
        /* c8 ignore start */
        // issue #18
        // In somecase. Like vuepress it will called vite build with `Promise.all`. But it's concurrency. when we record the
        // file fd. It had been changed. So that we should catch the error
        /* c8 ignore stop */
      }
      stores.clear()
    }
  }
}

export { compression }

export default compression

export type { CompressionOptions, Algorithm, ViteCompressionPluginConfig } from './interface'
