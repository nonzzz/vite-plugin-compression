import path from 'path'
import chalk from 'chalk'
import fs from './fs'
import { Threads } from './threads'
import { fromatBytes, readGlobalFiles, removeFiles, resolvePath, len } from './utils'
import { printf as _printf } from './logger'
import { getCompressExt, getCompression } from './compress'
import { transfer } from './stream'
import type { Plugin } from 'vite'
import type { ViteCompressionPluginConfig } from './interface'

export type { Regular, CompressionOptions, Algorithm } from './interface'

const OUT_PUT_KEY = Symbol('__vite__plugin_compression__output__path')

function ViteCompressionPlugin(opts: ViteCompressionPluginConfig = {}): Plugin {
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

  return {
    name: 'vite-plugin-compression',
    apply: 'build',
    enforce: 'post',
    configResolved(userConfig) {
      Reflect.set(this, OUT_PUT_KEY, resolvePath(userConfig.build.outDir, userConfig.root))
    },
    async closeBundle() {
      const algorithm = getCompression(
        typeof userAlgorithm === 'function' ? userAlgorithm() : userAlgorithm,
        compressionOptions
      )
      const ext = getCompressExt(algorithm)
      const outputPath = Reflect.get(this, OUT_PUT_KEY)
      const files = await readGlobalFiles(outputPath, exclude)

      if (!len(files)) return

      const threads = new Threads()

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
        await Promise.all(
          tasks.map(async (task) => {
            const before = bucket.get(task)
            const bytes = await transfer(task, task + ext, algorithm)
            bucket.set(task, { ...before, afterCompressBytes: bytes })
          })
        )
      } catch (error) {
        this.error(error)
      }
      // while (flag > 0) {
      //   flag--
      //   const { size: beforeCompressBytes } = await fs.stat(files[flag])
      //   if (beforeCompressBytes <= threshold) continue
      //   compressMap.set(files[flag], {
      //     beforeCompressBytes,
      //     resultPath: path.relative(outputPath, files[flag]) + ext
      //   })
      //   compressList.push(files[flag])
      // }
      // const limit = len(compressList) / 100
      // if (!len(compressList)) return
      // await Promise.all(
      //   compressList.map(async (filePath) => {
      //     try {
      //       const compressInfo = compressMap.get(filePath)
      //       const compress = getCompression(algorithm, compressionOptions)
      //       const afterCompressBytes = await transfer(filePath, filePath + ext, compress)
      //       compressMap.set(filePath, Object.assign(compressInfo, { afterCompressBytes }))
      //     } catch (error) {
      //       return this.error(error)
      //     }
      //   })
      // )
      // if (options.loginfo === 'info') {
      //   printf.info('[vite-compression-plugin]: compressed file successfully:\n')
      //   compressMap.forEach((val) => {
      //     const { beforeCompressBytes, afterCompressBytes, resultPath } = val
      //     const str = `${fromatBytes(beforeCompressBytes)} / ${fromatBytes(afterCompressBytes)}`
      //     const ratio = `ratio: ${(afterCompressBytes / beforeCompressBytes).toFixed(2)}%`
      //     printf.info(
      //       chalk.dim(path.basename(outputPath) + '/') +
      //         chalk.greenBright(resultPath) +
      //         '  ' +
      //         chalk.dim(str) +
      //         '  ' +
      //         chalk.dim(ratio)
      //     )
      //   })
      // }
      // try {
      //   const removed = await removeFiles(compressList, deleteOriginalAssets)
      //   if (options.loginfo === 'silent') return
      //   if (removed) printf.info(removed)
      // } catch (error) {
      //   return this.error(error)
      // }
    }
  }
}

export default ViteCompressionPlugin
