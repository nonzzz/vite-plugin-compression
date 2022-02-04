import fs from 'fs-extra'
import path from 'path'
import { resolveConfig } from './preset-config'
import { fromatBytes, readGlobalFiles, removeFiles, resolvePath } from './utils'
import { logError, logSuccess } from './logger'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ViteCompressionPluginConfig } from './preset-config'
import chalk from 'chalk'

export default function (opts: ViteCompressionPluginConfig = {}): Plugin {
  let outputPath
  let log: ResolvedConfig['logger']
  const options = resolveConfig(opts)

  const compressMap = new Map<
    string,
    {
      beforeCompressBytes?: number
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
      const { deleteOriginalAssets, compressionOptions, algorithm, exclude, threshold, filename } = options
      const files = await readGlobalFiles(outputPath, exclude)
      let flag = files.length
      // set should compress file infomation.
      while (flag > 0) {
        flag--
        const { size: beforeCompressBytes } = await fs.stat(files[flag])
        if (beforeCompressBytes <= threshold) continue
        compressMap.set(files[flag], {
          beforeCompressBytes,
          fileName: path.basename(files[flag])
        })
      }

      compressMap.forEach((val, filePath) => {
        const { fileName, beforeCompressBytes } = val
        const str = `${fromatBytes(beforeCompressBytes)} / ${fromatBytes(beforeCompressBytes)}`
        if (options.loginfo === 'info') {
          logSuccess('[vite-compression-plugin]: compressed file successfully:', log)
          log.info(chalk.dim(path.basename(outputPath) + '/') + chalk.greenBright(fileName) + '  ' + chalk.dim(str))
        }
      })

      // do delete file or not after compression
      try {
        const removed = await removeFiles(files, deleteOriginalAssets)
        if (removed) logSuccess(removed, log)
      } catch (error) {
        logError(error, log)
      }
    }
  }
}
