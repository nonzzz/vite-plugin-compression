// The software is simple so I want to make it compatible with the latest vite and vite2.
import { createFilter } from '@rollup/pluginutils'
import ansis from 'ansis'
import fs from 'fs'
import fsp from 'fs/promises'
import os from 'os'
import path from 'path'
import type { Logger, Plugin, ResolvedBuildOptions, ResolvedConfig } from 'vite'
import { compress, createTarBall, defaultCompressionOptions, defaultIsHighMemory, ensureAlgorithm, resolveAlgorithm } from './compress'
import type {
  Algorithm,
  AlgorithmFunction,
  AlgorithmToZlib,
  DefineAlgorithmResult,
  GenerateBundle,
  UserCompressionOptions,
  ViteCompressionPluginOption,
  ViteTarballPluginOptions,
  defineAliasAlgorithmResult
} from './interface'
import { captureViteLogger, len, noop, readAll, replaceFileName, slash, stringToBytes } from './shared'
import { createConcurrentQueue } from './task'

const VITE_COMPRESSION_PLUGIN = 'vite-plugin-compression'
const VITE_COMPRESSION_RUNNER_PLUGIN = `${VITE_COMPRESSION_PLUGIN}:runner`
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

function generateOutpts(root: string, config: ResolvedBuildOptions) {
  // issue #39
  // In some case like vite-plugin-legacy will set an empty output item
  // we should skip it.

  // Using full path. I find if we using like `dist` or others path it can't
  // work on monorepo
  // eg:
  // yarn --cwd @pkg/website build
  const outputs: Set<string> = new Set()

  const prepareAbsPath = (root: string, sub: string) => slash(path.resolve(root, sub))

  // rolldown ouput win the order
  const universalOutputs = config?.rolldownOptions?.output || config?.rollupOptions?.output

  if (universalOutputs) {
    const outputOptions = Array.isArray(universalOutputs)
      ? universalOutputs
      : [universalOutputs]
    outputOptions.forEach((opt) => {
      if (typeof opt === 'object' && !len(Object.keys(opt))) { return }
      outputs.add(prepareAbsPath(root, opt.dir || config.outDir))
    })
  } else {
    outputs.add(prepareAbsPath(root, config.outDir))
  }
  return outputs
}

// https://vite.dev/guide/api-environment#environment-api
// generally the client will have a public directory for static resouce, so we only record client.
function handleOutputOption(conf: ResolvedConfig) {
  const envs = conf.environments
    ? Object.values({ client: conf.environments.client }).map((envConf) => envConf.build)
    : [conf.build]

  return new Set(envs.flatMap((buildConf) => Array.from(generateOutpts(conf.root, buildConf))))
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

function createEnhancedError(error: Error, context: string): Error {
  if (error.name !== 'AggregateError' || !('errors' in error)) {
    return error
  }

  const aggregateError = error as AggregateError
  const errorCount = aggregateError.errors.length

  const messages = aggregateError.errors.map((err: Error, index: number) => {
    const message = err.message || 'Unknown error'
    return `[${index + 1}] ${message}`
  })

  const stacks = aggregateError.errors.map((err: Error, index: number) => {
    const stack = err.stack || err.message || 'No stack trace available'
    return `--- Error ${index + 1} ---\n${stack}`
  })

  const enhancedMessage = [
    `Compression failed in ${context} with ${errorCount} error(s):`,
    '',
    ...messages
  ].join('\n')

  const enhancedError = new Error(enhancedMessage)
  enhancedError.name = 'CompressionError'

  enhancedError.stack = [
    `CompressionError: ${enhancedMessage}`,
    '',
    'Combined stack traces:',
    ...stacks
  ].join('\n')

  enhancedError.cause = aggregateError.errors

  return enhancedError
}

function tarball(opts: ViteTarballPluginOptions = {}): Plugin {
  const { dest: userDest } = opts
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
      tarball.setup({ dests, root })
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
      await queue.wait().catch((err: Error) => {
        this.error(createEnhancedError(err, 'tarball creation'))
      })
      await tarball.done()
    }
  }
}

function installCompressionRunner(plugins: readonly Plugin[], generateBundle: GenerateBundle) {
  const supportsHookOrder = plugins.some((plugin) => {
    const hook = plugin.generateBundle
    return typeof plugin.applyToEnvironment === 'function' ||
      (typeof hook === 'object' && hook !== null && typeof hook.handler === 'function')
  })
  const runner: Plugin = {
    name: VITE_COMPRESSION_RUNNER_PLUGIN,
    generateBundle: supportsHookOrder
      ? { order: 'post', handler: generateBundle }
      : generateBundle
  }
  ;(plugins as Plugin[]).push(runner)
}

function compression(
  opts: ViteCompressionPluginOption = {}
): Plugin {
  const {
    include = /\.(html|xml|css|json|js|mjs|svg|yaml|yml|toml)$/,
    exclude,
    threshold = 0,
    algorithms: userAlgorithms = ['gzip', 'brotliCompress'],
    filename,
    deleteOriginalAssets = false,
    skipIfLargerOrEqual = true,
    logLevel = 'info',
    scheduler
  } = opts

  const algorithms: Array<DefineAlgorithmResult | defineAliasAlgorithmResult> = []

  userAlgorithms.forEach((algorithm) => {
    if (typeof algorithm === 'string') {
      algorithms.push(defineAlgorithm(algorithm))
    } else if (typeof algorithm === 'object' && Array.isArray(algorithm)) {
      algorithms.push(algorithm)
    }
  })

  const filter = createFilter(include, exclude)

  const statics: string[] = []
  const outputs: string[] = []
  let staticFilesReady = Promise.resolve()

  // vite internal vite:reporter don't write any log info to stdout. So we only capture the built in message
  // and print static process to stdout. I don't want to complicate things. So about message aligned with internal
  // result. I never deal with it.
  const { msgs, cleanup } = captureViteLogger()

  let logger: Logger

  let root: string = process.cwd()

  const isHighMemory = scheduler?.isHighMemory ?? defaultIsHighMemory

  const zlibs = algorithms.map(([_algorithm, options]) => {
    const algorithm = typeof _algorithm === 'string' ? resolveAlgorithm(_algorithm) : _algorithm
    return ({
      algorithm,
      algorithmFunction: typeof algorithm === 'string' ? ensureAlgorithm(algorithm).algorithm : algorithm,
      options,
      filename: filename ??
        (algorithm === 'brotliCompress' ? '[path][base].br' : algorithm === 'zstandard' ? '[path][base].zst' : '[path][base].gz'),
      highMemory: scheduler ? isHighMemory(algorithm, options) : false
    })
  })

  const normalQueue = createConcurrentQueue(MAX_CONCURRENT)
  const highMemQueue = scheduler ? createConcurrentQueue(scheduler.limit ?? 1) : null

  const waitAllQueues = async () => {
    const waits: Promise<void>[] = [normalQueue.wait()]
    if (highMemQueue) { waits.push(highMemQueue.wait()) }
    await Promise.all(waits)
  }

  const selectQueue = (z: typeof zlibs[number]) => {
    return (z.highMemory && highMemQueue) ? highMemQueue : normalQueue
  }

  const generateBundle: GenerateBundle = async function handler(_, bundles) {
    for (const fileName in bundles) {
      if (!filter(fileName)) { continue }
      const bundle = bundles[fileName]
      const source = stringToBytes(bundle.type === 'asset' ? bundle.source : bundle.code)
      const size = len(source)
      if (size < threshold) { continue }

      for (let i = 0; i < zlibs.length; i++) {
        const z = zlibs[i]
        const flag = i === zlibs.length - 1

        selectQueue(z).enqueue(async () => {
          const name = replaceFileName(fileName, z.filename, { options: z.options, algorithm: z.algorithm })
          const compressed = await compress(source, z.algorithmFunction, z.options)
          if (skipIfLargerOrEqual && len(compressed) >= size) {
            return
          }
          // https://rollupjs.org/plugin-development/#this-emitfile
          if (flag) {
            if (deleteOriginalAssets || fileName === name) { Reflect.deleteProperty(bundles, fileName) }
          }
          this.emitFile({ type: 'asset', fileName: name, source: compressed })
        })
      }
    }

    await waitAllQueues().catch((err: Error) => {
      if (logLevel === 'silent') { return }
      this.error(createEnhancedError(err, 'bundle compression'))
    })
  }

  const doneResolver: { resolve: () => void } = { resolve: noop }

  const pluginContext: CompressionPluginAPI = {
    staticOutputs: new Set(),
    done: new Promise((resolve) => {
      doneResolver.resolve = resolve
    })
  }

  const numberFormatter = new Intl.NumberFormat('en', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })

  const displaySize = (bytes: number) => {
    return `${numberFormatter.format(bytes / 1000)} kB`
  }

  const plugin = <Plugin> {
    name: VITE_COMPRESSION_PLUGIN,
    apply: 'build',
    enforce: 'post',
    api: pluginContext,
    configResolved(config) {
      outputs.push(...handleOutputOption(config))
      logger = config.logger
      root = config.root

      // Vite 2 does not await configResolved, so install the runner before
      // starting asynchronous setup and await that setup again in closeBundle.
      installCompressionRunner(config.plugins, generateBundle)
      staticFilesReady = handleStaticFiles(config, (file) => {
        statics.push(file)
      })
      return staticFilesReady
    },
    async closeBundle() {
      await staticFilesReady
      const compressedMessages: Array<{ dest: string, file: string, size: number }> = []

      const processFile = async (dest: string, file: string, z: typeof zlibs[number], flag: boolean) => {
        const filePath = path.join(dest, file)
        const normalizedFile = slash(file)

        if (!pluginContext.staticOutputs.has(normalizedFile)) {
          pluginContext.staticOutputs.add(normalizedFile)
        }

        const stat = await fsp.stat(filePath)
        if (!stat) { return }

        if (!filter(filePath)) { return }

        const { size } = stat
        if (size < threshold) {
          return
        }

        const buf = await fsp.readFile(filePath)
        const name = replaceFileName(file, z.filename, { options: z.options, algorithm: z.algorithm })
        const normalizedName = slash(name)
        const compressed = await compress(buf, z.algorithmFunction, z.options)

        if (skipIfLargerOrEqual && len(compressed) >= size) {
          return
        }

        const outputPath = path.join(dest, name)

        await fsp.writeFile(outputPath, compressed)

        if (!pluginContext.staticOutputs.has(normalizedName)) {
          pluginContext.staticOutputs.add(normalizedName)
        }

        if (flag && deleteOriginalAssets && outputPath !== filePath) {
          await fsp.rm(filePath, { recursive: true, force: true }).catch(() => undefined)
          if (pluginContext.staticOutputs.has(normalizedFile)) {
            pluginContext.staticOutputs.delete(normalizedFile)
          }
        }

        compressedMessages.push({ dest: path.relative(root, dest) + '/', file: name, size: len(compressed) })
      }

      // artifacts
      if (opts.artifacts && typeof opts.artifacts === 'function') {
        const result = opts.artifacts()
        for (const dest of outputs) {
          for (const item of result) {
            if (fs.existsSync(item.src)) {
              const baseName = path.basename(item.src)
              const deset = item.replace ? item.replace(dest, baseName) : path.join(dest, baseName)
              fs.cpSync(item.src, deset, { recursive: true })
              statics.push(slash(path.relative(dest, deset)))
            }
          }
        }
      }

      // parallel run
      for (const dest of outputs) {
        for (const file of statics) {
          for (let i = 0; i < zlibs.length; i++) {
            const z = zlibs[i]
            const flag = i === zlibs.length - 1
            selectQueue(z).enqueue(() => processFile(dest, file, z, flag))
          }
        }
      }

      // issue #18
      // In somecase. Like vuepress it will called vite build with `Promise.all`. But it's concurrency. when we record the
      // file fd. It had been changed. So that we should catch the error
      await waitAllQueues().catch((e: unknown) => e)
      doneResolver.resolve()
      cleanup()

      if (logLevel !== 'silent' && logger) {
        const paddingSize = compressedMessages.reduce((acc, cur) => {
          const full = cur.dest + cur.file
          return Math.max(acc, full.length)
        }, 0)

        for (const { dest, file, size } of compressedMessages) {
          const paddedFile = file.padEnd(paddingSize)
          logger.info(ansis.dim(dest) + ansis.green(paddedFile) + ansis.bold(ansis.dim(displaySize(size))))
        }
      }

      for (const msg of msgs) {
        console.info(msg)
      }
    }
  }

  return plugin
}

compression.getPluginAPI = (plugins: readonly Plugin[]): CompressionPluginAPI | undefined =>
  (plugins.find((p) => p.name === VITE_COMPRESSION_PLUGIN) as Plugin<CompressionPluginAPI>)?.api

export function defineAlgorithm<T extends Algorithm>(
  algorithm: T,
  options?: AlgorithmToZlib[T]
): DefineAlgorithmResult
export function defineAlgorithm(
  algorithm: AlgorithmFunction<unknown>
): DefineAlgorithmResult
export function defineAlgorithm<T extends UserCompressionOptions = UserCompressionOptions>(
  algorithm: AlgorithmFunction<T>,
  options?: T
): DefineAlgorithmResult<T>
export function defineAlgorithm(
  algorithm: Algorithm | AlgorithmFunction<never>,
  options?: UserCompressionOptions
): DefineAlgorithmResult {
  if (typeof algorithm === 'string') {
    const resolvedAlgorithm = resolveAlgorithm(algorithm)
    if (resolvedAlgorithm in defaultCompressionOptions) {
      const opts = { ...defaultCompressionOptions[resolvedAlgorithm] }
      if (options) {
        Object.assign(opts, options)
      }
      return [resolvedAlgorithm, opts]
    }
    throw new Error(`[vite-plugin-compression] Unsupported algorithm: ${algorithm}`)
  }
  return [algorithm, options || {}] as DefineAlgorithmResult
}

export { compression, tarball }

export default compression

export type { Algorithm, CompressionOptions, ViteCompressionPluginOption, ViteTarballPluginOptions } from './interface'
