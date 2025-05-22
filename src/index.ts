import { createFilter } from '@rollup/pluginutils'
import fs from 'fs'
import fsp from 'fs/promises'
import os from 'os'
import path from 'path'
import type { Plugin, ResolvedConfig } from 'vite'
import { compress, createTarBall, defaultCompressionOptions, ensureAlgorithm } from './compress'
import type {
  Algorithm,
  AlgorithmFunction,
  GenerateBundle,
  Pretty,
  UserCompressionOptions,
  ViteCompressionPluginConfig,
  ViteCompressionPluginConfigAlgorithm,
  ViteCompressionPluginConfigFunction,
  ViteTarballPluginOptions,
  ViteWithoutCompressionPluginConfigFunction
} from './interface'
import { len, noop, readAll, replaceFileName, slash, stringToBytes } from './shared'
import { createConcurrentQueue } from './task'

const VITE_INTERNAL_ANALYSIS_PLUGIN = 'vite:build-import-analysis'
const VITE_COMPRESSION_PLUGIN = 'vite-plugin-compression'
const VITE_COPY_PUBLIC_DIR = 'copyPublicDir'
const MAX_CONCURRENT = (() => {
  const cpus = os.cpus() || { length: 1 }
  if (cpus.length === 1) { return 10 }
  return Math.max(1, cpus.length - 1)
})()

interface CompressionPluginAPI {
  staticOutputs: Set<string>
  done: Promise<void>
}

interface InternalZlibOptions<T> {
  algorithm: AlgorithmFunction<T>
  filename: string | ((id: string) => string)
  options: UserCompressionOptions
}

function handleOutputOption(conf: ResolvedConfig) {
  // issue #39
  // In some case like vite-plugin-legacy will set an empty output item
  // we should skip it.

  // Using full path. I find if we using like `dist` or others path it can't
  // work on monorepo
  // eg:
  // yarn --cwd @pkg/website build
  const outputs: Set<string> = new Set()
  const prepareAbsPath = (root: string, sub: string) => slash(path.resolve(root, sub))
  if (conf.build.rollupOptions?.output) {
    const outputOptions = Array.isArray(conf.build.rollupOptions.output)
      ? conf.build.rollupOptions.output
      : [conf.build.rollupOptions.output]
    outputOptions.forEach((opt) => {
      if (typeof opt === 'object' && !len(Object.keys(opt))) { return }
      outputs.add(prepareAbsPath(conf.root, opt.dir || conf.build.outDir))
    })
  } else {
    outputs.add(prepareAbsPath(conf.root, conf.build.outDir))
  }
  return outputs
}

async function handleStaticFiles(config: ResolvedConfig, callback: (file: string, assets: string) => void) {
  const baseCondit = VITE_COPY_PUBLIC_DIR in config.build ? config.build.copyPublicDir : true
  if (config.publicDir && baseCondit && fs.existsSync(config.publicDir)) {
    const staticAssets = await readAll(config.publicDir)
    const publicPath = path.join(config.root, path.relative(config.root, config.publicDir))
    staticAssets.forEach((assets) => {
      const file = slash(path.relative(publicPath, assets))
      callback(file, assets)
    })
  }
}

function tarball(opts: ViteTarballPluginOptions = {}): Plugin {
  const { dest: userDest, gz = false } = opts
  const statics: string[] = []
  const outputs: string[] = []
  let dests: string[] = []
  let root = process.cwd()
  const tarball = createTarBall()
  const queue = createConcurrentQueue(MAX_CONCURRENT)
  let ctx: ReturnType<typeof compression.getPluginAPI>
  return {
    name: 'vite-plugin-tarball',
    enforce: 'post',
    async configResolved(config) {
      outputs.push(...handleOutputOption(config))
      root = config.root
      dests = userDest ? [userDest] : outputs
      // No need to add source to pack in configResolved stage
      // If we do at the start stage. The build task will be slow.
      ctx = compression.getPluginAPI(config.plugins)
      if (!ctx) {
        await handleStaticFiles(config, (file) => {
          statics.push(file)
        })
      }
      // create dest dir
      tarball.setup({ dests, root, gz })
    },
    writeBundle(_, bundles) {
      for (const fileName in bundles) {
        const bundle = bundles[fileName]
        tarball.add({ filename: fileName, content: bundle.type === 'asset' ? bundle.source : bundle.code })
      }
    },
    async closeBundle() {
      if (ctx) {
        await ctx.done
      }
      if (!statics.length && ctx && ctx.staticOutputs.size) {
        statics.push(...ctx.staticOutputs)
      }

      for (const dest of outputs) {
        for (const file of statics) {
          queue.enqueue(async () => {
            const p = path.join(dest, file)
            const buf = await fsp.readFile(p)
            tarball.add({ filename: file, content: buf })
          })
        }
      }
      await queue.wait()
      await tarball.done()
    }
  }
}

function hijackGenerateBundle(plugin: Plugin, afterHook: GenerateBundle) {
  const hook = plugin.generateBundle
  if (typeof hook === 'object' && hook.handler) {
    const fn = hook.handler
    hook.handler = async function handler(this, ...args: Parameters<GenerateBundle>) {
      await fn.apply(this, args)
      await afterHook.apply(this, args)
    }
  }
  if (typeof hook === 'function') {
    plugin.generateBundle = async function handler(this, ...args: Parameters<GenerateBundle>) {
      await hook.apply(this, args)
      await afterHook.apply(this, args)
    }
  }
}

function compression(): Plugin
function compression<
  T extends UserCompressionOptions | undefined,
  A extends Algorithm | AlgorithmFunction<T> | AlgorithmFunction<undefined>
>(
  opts: A extends Algorithm ? Pretty<ViteCompressionPluginConfigAlgorithm<A>>
    : ViteCompressionPluginConfigFunction<T, AlgorithmFunction<T>>
): Plugin
function compression<T extends UserCompressionOptions>(
  opts: ViteCompressionPluginConfigFunction<T, AlgorithmFunction<T>>
): Plugin
function compression(opts: ViteWithoutCompressionPluginConfigFunction): Plugin
function compression<T extends UserCompressionOptions, A extends Algorithm>(
  opts: ViteCompressionPluginConfig<T, A> = {}
): Plugin {
  const {
    include = /\.(html|xml|css|json|js|mjs|svg|yaml|yml|toml)$/,
    exclude,
    threshold = 0,
    algorithm: userAlgorithm = 'gzip',
    filename,
    compressionOptions,
    deleteOriginalAssets = false,
    skipIfLargerOrEqual = true
  } = opts

  const filter = createFilter(include, exclude)

  const statics: string[] = []
  const outputs: string[] = []

  const zlib: InternalZlibOptions<T> = {
    algorithm: typeof userAlgorithm === 'string' ? ensureAlgorithm(userAlgorithm).algorithm : userAlgorithm,
    options: typeof userAlgorithm === 'function'
      ? compressionOptions
      : Object.assign({}, defaultCompressionOptions[userAlgorithm], compressionOptions),
    filename: filename ?? (userAlgorithm === 'brotliCompress' ? '[path][base].br' : '[path][base].gz')
  }

  const queue = createConcurrentQueue(MAX_CONCURRENT)

  const generateBundle: GenerateBundle = async function handler(_, bundles) {
    for (const fileName in bundles) {
      if (!filter(fileName)) { continue }
      const bundle = bundles[fileName]
      const source = stringToBytes(bundle.type === 'asset' ? bundle.source : bundle.code)
      const size = len(source)
      if (size < threshold) { continue }
      queue.enqueue(async () => {
        const name = replaceFileName(fileName, zlib.filename)
        const compressed = await compress(source, zlib.algorithm, zlib.options)
        if (skipIfLargerOrEqual && len(compressed) >= size) { return }
        // #issue 30 31
        // https://rollupjs.org/plugin-development/#this-emitfile
        if (deleteOriginalAssets || fileName === name) { Reflect.deleteProperty(bundles, fileName) }
        this.emitFile({ type: 'asset', fileName: name, source: compressed })
      })
    }
    await queue.wait().catch(this.error)
  }

  const doneResolver: { resolve: () => void } = { resolve: noop }

  const pluginContext: CompressionPluginAPI = {
    staticOutputs: new Set(),
    done: new Promise((resolve) => {
      doneResolver.resolve = resolve
    })
  }

  const plugin = <Plugin> {
    name: VITE_COMPRESSION_PLUGIN,
    apply: 'build',
    enforce: 'post',
    api: pluginContext,
    async configResolved(config) {
      // hijack vite's internal `vite:build-import-analysis` plugin.So we won't need process us chunks at closeBundle anymore.
      // issue #26
      // https://github.com/vitejs/vite/blob/716286ef21f4d59786f21341a52a81ee5db58aba/packages/vite/src/node/build.ts#L566-L611
      // Vite follow rollup option as first and the configResolved Hook don't expose merged conf for user. :(
      // Someone who like using rollupOption. `config.build.outDir` will not as expected.
      outputs.push(...handleOutputOption(config))
      // Vite's pubic build: https://github.com/vitejs/vite/blob/HEAD/packages/vite/src/node/build.ts#L704-L709
      // copyPublicDir minimum version 3.2+
      // No need check size here.
      await handleStaticFiles(config, (file) => {
        statics.push(file)
      })
      const viteAnalyzerPlugin = config.plugins.find((p) => p.name === VITE_INTERNAL_ANALYSIS_PLUGIN)
      if (!viteAnalyzerPlugin) {
        throw new Error("[vite-plugin-compression] Can't be work in versions lower than vite at 2.0.0")
      }
      hijackGenerateBundle(viteAnalyzerPlugin, generateBundle)
    },
    async closeBundle() {
      const compressAndHandleFile = async (filePath: string, file: string, dest: string) => {
        const buf = await fsp.readFile(filePath)
        const compressed = await compress(buf, zlib.algorithm, zlib.options)
        if (skipIfLargerOrEqual && len(compressed) >= len(buf)) {
          if (!pluginContext.staticOutputs.has(file)) { pluginContext.staticOutputs.add(file) }
          return
        }

        const fileName = replaceFileName(file, zlib.filename)
        if (!pluginContext.staticOutputs.has(fileName)) { pluginContext.staticOutputs.add(fileName) }

        const outputPath = path.join(dest, fileName)
        if (deleteOriginalAssets && outputPath !== filePath) {
          await fsp.rm(filePath, { recursive: true, force: true })
        }
        await fsp.writeFile(outputPath, compressed)
      }

      const processFile = async (dest: string, file: string) => {
        const filePath = path.join(dest, file)
        if (!filter(filePath) && !pluginContext.staticOutputs.has(file)) {
          pluginContext.staticOutputs.add(file)
          return
        }
        const { size } = await fsp.stat(filePath)
        if (size < threshold) {
          if (!pluginContext.staticOutputs.has(file)) {
            pluginContext.staticOutputs.add(file)
          }
          return
        }
        await compressAndHandleFile(filePath, file, dest)
      }

      // parallel run
      for (const dest of outputs) {
        for (const file of statics) {
          queue.enqueue(() => processFile(dest, file))
        }
      }
      // issue #18
      // In somecase. Like vuepress it will called vite build with `Promise.all`. But it's concurrency. when we record the
      // file fd. It had been changed. So that we should catch the error
      await queue.wait().catch((e: unknown) => e)
      doneResolver.resolve()
    }
  }

  return plugin
}

compression.getPluginAPI = (plugins: readonly Plugin[]): CompressionPluginAPI | undefined =>
  (plugins.find((p) => p.name === VITE_COMPRESSION_PLUGIN) as Plugin<CompressionPluginAPI>)?.api

function defineCompressionOption<T = never, A extends Algorithm = never>(option: ViteCompressionPluginConfig<T, A>) {
  return option
}

export { compression, defineCompressionOption, tarball }

export default compression

export type {
  Algorithm,
  CompressionOptions,
  ViteCompressionPluginConfig,
  ViteCompressionPluginOption,
  ViteTarballPluginOptions
} from './interface'
