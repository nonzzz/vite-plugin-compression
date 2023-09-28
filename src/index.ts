import fsp from 'fs/promises'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createFilter } from '@rollup/pluginutils'
import type { Plugin, ResolvedConfig } from 'vite'
import { len, readAll, replaceFileName, slash } from './utils'
import { compress, defaultCompressionOptions, ensureAlgorithm } from './compress'
import { createConcurrentQueue } from './task'
import type {
  Algorithm,
  AlgorithmFunction,
  CompressMetaInfo,
  Pretty,
  UserCompressionOptions,
  ViteCompressionPluginConfig,
  ViteCompressionPluginConfigAlgorithm,
  ViteCompressionPluginConfigFunction,
  ViteWithoutCompressionPluginConfigFunction
} from './interface'

const VITE_COPY_PUBLIC_DIR = 'copyPublicDir'
const MAX_CONCURRENT = (() => {
  const cpus = os.cpus() || { length: 1 }
  if (cpus.length === 1) return 10
  return Math.max(1, cpus.length - 1)
})()

type OutputOption = string

function handleOutputOption(conf: ResolvedConfig, outputs: Set<OutputOption>) {
  // issue #39
  // In some case like vite-plugin-legacy will set an empty output item
  // we should skip it.

  // Using full path. I find if we using like `dist` or others path it can't
  // work on monorepo
  // eg:
  // yarn --cwd @pkg/website build
  // At this time we will point to root directory. So that file with side effect
  // can't process.
  const prepareAbsPath = (root: string, sub: string) => path.resolve(root, sub)

  if (conf.build.rollupOptions?.output) {
    const outputOptions = Array.isArray(conf.build.rollupOptions.output)
      ? conf.build.rollupOptions.output
      : [conf.build.rollupOptions.output]
    outputOptions.forEach((opt) => {
      if (typeof opt === 'object' && !len(Object.keys(opt))) return
      outputs.add(prepareAbsPath(conf.root, opt.dir || conf.build.outDir))
    })
    return
  }
  outputs.add(prepareAbsPath(conf.root, conf.build.outDir))
}

function makeOutputs(outputs: Set<OutputOption>, file: string) {
  const dests = []
  const files = []
  outputs.forEach((dest) => {
    dests.push(dest)
    files.push(slash(path.join(dest, file)))
  })
  return { dests, files }
}

function compression(): Plugin
function compression<A extends Algorithm>(opts: Pretty<ViteCompressionPluginConfigAlgorithm<A>>): Plugin
function compression<T extends UserCompressionOptions = NonNullable<unknown>>(opts: Pretty<ViteCompressionPluginConfigFunction<T>>): Plugin
function compression(opts: ViteWithoutCompressionPluginConfigFunction): Plugin
function compression<T extends UserCompressionOptions, A extends Algorithm>(opts: ViteCompressionPluginConfig<T, A> = {}): Plugin {
  const {
    include,
    exclude,
    threshold = 0,
    algorithm: userAlgorithm = 'gzip',
    filename,
    compressionOptions,
    deleteOriginalAssets = false,
    skipIfLargerOrEqual = false
  } = opts

  const filter = createFilter(include, exclude)

  const stores = new Map<string, CompressMetaInfo>()

  const normalizedOutputs: Set<OutputOption> = new Set()

  const zlib: {
    algorithm: AlgorithmFunction<T>
    filename: string | ((id: string)=> string)
    options: UserCompressionOptions
  } = Object.create(null)

  zlib.algorithm = typeof userAlgorithm === 'string' ? ensureAlgorithm(userAlgorithm).algorithm : userAlgorithm

  zlib.options =
    typeof userAlgorithm === 'function'
      ? compressionOptions
      : Object.assign(defaultCompressionOptions[userAlgorithm], compressionOptions)
  zlib.filename = filename ?? (userAlgorithm === 'brotliCompress' ? '[path][base].br' : '[path][base].gz')
  const queue = createConcurrentQueue(MAX_CONCURRENT)

  return {
    name: 'vite-plugin-compression',
    apply: 'build',
    enforce: 'post',
    async configResolved(config) {
      // issue #26
      // https://github.com/vitejs/vite/blob/716286ef21f4d59786f21341a52a81ee5db58aba/packages/vite/src/node/build.ts#L566-L611
      // Vite follow rollup option as first and the configResolved Hook don't expose merged conf for user. :(
      // Someone who like using rollupOption. `config.build.outDir` will not as expected.
      handleOutputOption(config, normalizedOutputs)
      // Vite's pubic build: https://github.com/vitejs/vite/blob/HEAD/packages/vite/src/node/build.ts#L704-L709
      // copyPublicDir minimum version 3.2+
      const baseCondit = VITE_COPY_PUBLIC_DIR in config.build ? config.build.copyPublicDir : true
      if (config.publicDir && baseCondit && fs.existsSync(config.publicDir)) {
        const staticAssets = await readAll(config.publicDir)
        const publicPath = path.join(config.root, path.relative(config.root, config.publicDir))
        Promise.all(staticAssets.map(async (assets) => {
          if (!filter(assets)) return
          const { size } = await fsp.stat(assets)
          if (size < threshold) return
          const file = path.relative(publicPath, assets)
          const { files, dests } = makeOutputs(normalizedOutputs, file)
          stores.set(slash(file), {
            effect: true,
            file: files,
            dest: dests
          })
        }))
      }
    },
    // Vite support using object as hooks to change execution order need at least 3.1.0
    // So we should record that with side Effect bundle file. (Because file with dynamic import will trigger vite's internal importAnalysisBuild logic and it will generator vite's placeholder.)
    // Vite importAnalysisBuild source code: https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/importAnalysisBuild.ts
    // Vite's plugin order see: https://github.com/vitejs/vite/blob/HEAD/packages/vite/src/node/plugins/index.ts#L94-L98
    async generateBundle(_, bundles) {
      for (const fileName in bundles) {
        if (!filter(fileName)) continue
        const bundle = bundles[fileName]
        const result = bundle.type === 'asset' ? bundle.source : bundle.code
        const size = len(result)
        if (size < threshold) continue
        const meta: CompressMetaInfo = Object.create(null)
        // we think dynamic imports have side effect. 
        // In vite intenral logic, vite will set a placeholder and consume it after all plugin work done. 
        // We only process chunk is enough. Other assets will be automatically generator by vite.
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
              const bundle = bundles[importer]
              const chunk  = bundle.type === 'asset' ? bundle.source : bundle.code
              if (len(chunk) < threshold) return
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
      const handle = async (file: string, meta: CompressMetaInfo) => {
        if (meta.effect) return
        const bundle = bundles[file]
        const fileName = replaceFileName(file, zlib.filename)
        // #issue 31 
        // we should pass the handle. Because if we process it . vite internal plugin can't work well
        if (file === fileName && bundle.type === 'chunk') {
          const { dests, files } = makeOutputs(normalizedOutputs, fileName)
          stores.set(file, { effect: true, file: files, dest: dests })
          return
        }
        const source = Buffer.from(bundle.type === 'asset' ? bundle.source : bundle.code)
        const compressed = await compress(source, zlib.algorithm, zlib.options)
        if (skipIfLargerOrEqual && len(compressed) >= len(source)) return
        // #issue 30
        if (deleteOriginalAssets) Reflect.deleteProperty(bundles, file)
        this.emitFile({ type: 'asset', source: compressed, fileName })
        stores.delete(file)
      }
      stores.forEach((meta, file) => queue.enqueue(() => handle(file, meta)))
      await queue.wait().catch(this.error)
    },
    async closeBundle() {
      const handle = async (file: string, meta: CompressMetaInfo) => {
        if (!meta.effect) return
        for (const [pos, dest] of meta.dest.entries()) {
          const f = meta.file[pos]
          const buf = await fsp.readFile(f)
          const compressed = await compress(buf, zlib.algorithm, zlib.options)
          if (skipIfLargerOrEqual && len(compressed) >= len(buf)) continue
          const fileName = replaceFileName(file, zlib.filename)
          // issue #30
          const outputPath = path.join(dest, fileName)
          if (deleteOriginalAssets && outputPath !== f) await fsp.rm(f, { recursive: true, force: true })
          await fsp.writeFile(outputPath, compressed)
        }
      }
      stores.forEach((meta, file) => queue.enqueue(() => handle(file, meta)))
      // issue #18
      // In somecase. Like vuepress it will called vite build with `Promise.all`. But it's concurrency. when we record the
      // file fd. It had been changed. So that we should catch the error
      await queue.wait().catch(e => e)
      stores.clear()
    }
  }
}

export { compression }

export default compression

export type { CompressionOptions, Algorithm, ViteCompressionPluginConfig } from './interface'
