import fs from 'fs-extra'
import path from 'path'
import { fromatBytes, readGlobalFiles, removeFiles, resolvePath, len } from './utils'
import { printf as _printf } from './logger'
import chalk from 'chalk'
import { getCompressExt, getCompression } from './compress'
import { transfer } from './stream'

import type { Plugin } from 'vite'
import type { ViteCompressionPluginConfig } from './interface'

export type { Regular, CompressionOptions, Algorithm } from './interface'

function ViteCompressionPlugin(opts: ViteCompressionPluginConfig = {}): Plugin {
  let outputPath
  let printf: ReturnType<typeof _printf>

  const preset: ViteCompressionPluginConfig = {
    exclude: [],
    threshold: 0,
    algorithm: 'gzip',
    compressionOptions: {
      level: 9
    },
    deleteOriginalAssets: false,
    loginfo: 'info'
  }
  const options = Object.assign(preset, opts && typeof opts === 'object' ? opts : {})
  const compressList: string[] = []
  const compressMap = new Map<
    string,
    {
      beforeCompressBytes?: number
      afterCompressBytes?: number
      resultPath?: string
    }
  >()

  return {
    name: 'vite-plugin-compression',
    apply: 'build',
    enforce: 'post',
    configResolved(userConfig) {
      printf = _printf(userConfig.logger)
      outputPath = resolvePath(userConfig.build.outDir, userConfig.root)
    },
    async closeBundle() {
      const { deleteOriginalAssets, compressionOptions, algorithm: _algorithm, exclude, threshold } = options
      const algorithm = typeof _algorithm === 'function' ? _algorithm() : _algorithm
      const ext = getCompressExt(algorithm)
      const files = await readGlobalFiles(outputPath, exclude)
      let flag = len(files)

      /**
       * We should read the file content before compression.
       * The process of reading stat is approximately serial.
       * But when we compress the file, the process of reading is parallel.
       *
       */
      if (!flag) return
      while (flag > 0) {
        flag--
        const { size: beforeCompressBytes } = await fs.stat(files[flag])
        if (beforeCompressBytes <= threshold) continue
        compressMap.set(files[flag], {
          beforeCompressBytes,
          resultPath: path.relative(outputPath, files[flag]) + ext
        })
        compressList.push(files[flag])
      }
      await Promise.all(
        compressList.map(async (filePath) => {
          try {
            const compressInfo = compressMap.get(filePath)
            const compress = getCompression(algorithm, compressionOptions)
            const afterCompressBytes = await transfer(filePath, filePath + ext, compress)
            compressMap.set(filePath, Object.assign(compressInfo, afterCompressBytes))
          } catch (error) {
            return this.error(error)
          }
        })
      )

      if (options.loginfo === 'info') {
        printf.info('[vite-compression-plugin]: compressed file successfully:\n')
        compressMap.forEach((val) => {
          const { beforeCompressBytes, afterCompressBytes, resultPath } = val
          const str = `${fromatBytes(beforeCompressBytes)} / ${fromatBytes(afterCompressBytes)}`
          const ratio = `ratio: ${(afterCompressBytes / beforeCompressBytes).toFixed(2)}%`
          printf.info(
            chalk.dim(path.basename(outputPath) + '/') +
              chalk.greenBright(resultPath) +
              '  ' +
              chalk.dim(str) +
              '  ' +
              chalk.dim(ratio)
          )
        })
      }

      try {
        const removed = await removeFiles(compressList, deleteOriginalAssets)
        if (options.loginfo === 'silent') return
        if (removed) printf.info(removed)
      } catch (error) {
        return this.error(error)
      }
    }
  }
}

export default ViteCompressionPlugin
