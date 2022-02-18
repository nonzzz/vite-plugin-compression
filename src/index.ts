import fs from 'fs-extra'
import path from 'path'
import { resolveConfig } from './preset-config'
import { fromatBytes, readGlobalFiles, removeFiles, resolvePath } from './utils'
import { logError, logSuccess } from './logger'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ViteCompressionPluginConfig } from './preset-config'
import chalk from 'chalk'
import { getCompressExt, getCompression } from './compress'
import { transfer } from './stream'

export type { ViteCompressionPluginConfig, Regular, CompressionOptions, Algorithm } from './preset-config'

function ViteCompressionPlugin(opts: ViteCompressionPluginConfig = {}): Plugin {
  let outputPath
  let log: ResolvedConfig['logger']
  const options = resolveConfig(opts)

  const compressList: string[] = []

  const compressMap = new Map<
    string,
    {
      beforeCompressBytes?: number
      afterCompressBytes?: number
      compressName?: string
      fileName?: string
    }
  >()

  return {
    name: 'vite-compression-plugin',
    apply: 'build',
    enforce: 'post',
    configResolved(userConfig) {
      log = userConfig.logger
      outputPath = resolvePath(userConfig.build.outDir, userConfig.root)
    },
    async closeBundle() {
      const { deleteOriginalAssets, compressionOptions, algorithm, exclude, threshold } = options
      const ext = getCompressExt(algorithm)
      const files = await readGlobalFiles(outputPath, exclude)
      let flag = files.length

      while (flag > 0) {
        flag--
        const { size: beforeCompressBytes } = await fs.stat(files[flag])
        if (beforeCompressBytes <= threshold) continue
        compressMap.set(files[flag], {
          beforeCompressBytes,
          fileName: path.extname(files[flag])
        })
        compressList.push(files[flag])
      }
      //
      await Promise.all(
        compressList.map(async (filePath) => {
          try {
            const compressInfo = compressMap.get(filePath)
            const compress = getCompression(algorithm, compressionOptions)
            const afterCompressBytes = await transfer(filePath, filePath + ext, compress)

            compressMap.set(filePath, {
              ...compressInfo,
              compressName: compressInfo.fileName + ext,
              afterCompressBytes
            })
          } catch (error) {
            logError(error, log)
          }
        })
      )

      if (options.loginfo === 'info') {
        logSuccess('[vite-compression-plugin]: compressed file successfully:', log)
        compressMap.forEach((val) => {
          const { beforeCompressBytes, afterCompressBytes, compressName } = val
          const str = `${fromatBytes(beforeCompressBytes)} / ${fromatBytes(afterCompressBytes)}`
          const ratio = `ratio: ${(afterCompressBytes / beforeCompressBytes).toFixed(2)}%`

          log.info(
            chalk.dim(path.basename(outputPath) + '/') +
              chalk.greenBright(compressName) +
              '  ' +
              chalk.dim(str) +
              '  ' +
              chalk.dim(ratio)
          )
        })
      }

      // do delete file or not after compression
      try {
        const removed = await removeFiles(compressList, deleteOriginalAssets)
        if (removed) logSuccess(removed, log)
      } catch (error) {
        logError(error, log)
      }
    }
  }
}

export default ViteCompressionPlugin
