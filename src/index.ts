import fs from 'fs-extra'
import { resolveConfig } from './preset-config'
import { readGlobalFiles, removeFiles, resolvePath } from './utils'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ViteCompressionPluginConfig } from './preset-config'
import path from 'path/posix'

export default function (opts: ViteCompressionPluginConfig = {}): Plugin {
  let outputPath
  let log: ResolvedConfig['logger']
  const options = resolveConfig(opts)

  const compressMap = new Map<string, any>()

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
      // do delete file or not after compression
      try {
        const removed = await removeFiles(files, deleteOriginalAssets)
        if (removed) log.info(removed)
      } catch (error) {
        log.error(error)
      }
    }
  }
}
