import fs from 'fs-extra'
import path from 'path'
import { fromatBytes, readGlobalFiles, removeFiles, resolvePath } from './utils'
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
      compressName?: string
      fileName?: string
    }
  >()

  return {
    name: 'vite-compression-plugin',
    apply: 'build',
    enforce: 'post',
    configResolved(userConfig) {
      printf = _printf(userConfig.logger)
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
            if (error instanceof Error) {
              printf.error(error.message)
            }
          }
        })
      )

      if (options.loginfo === 'info') {
        printf.info('[vite-compression-plugin]: compressed file successfully:\n')
        compressMap.forEach((val) => {
          const { beforeCompressBytes, afterCompressBytes, compressName } = val
          const str = `${fromatBytes(beforeCompressBytes)} / ${fromatBytes(afterCompressBytes)}`
          const ratio = `ratio: ${(afterCompressBytes / beforeCompressBytes).toFixed(2)}%`

          printf.info(
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
        if (removed) printf.info(removed)
      } catch (error) {
        printf.error(error.message)
      }
    }
  }
}

export default ViteCompressionPlugin
