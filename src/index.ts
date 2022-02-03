import { resolveConfig } from './preset-config'
import { readGlobalFiles, removeFiles, resolvePath } from './utils'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ViteCompressionPluginConfig } from './preset-config'
import { getCompression } from './compress'

export default function (opts: ViteCompressionPluginConfig = {}): Plugin {
  let config: ResolvedConfig
  let outputPath
  const options = resolveConfig(opts)
  return {
    name: 'vite-compression-plugin',
    apply: 'build',
    enforce: 'post',
    configResolved(userConfig) {
      config = userConfig
      outputPath = resolvePath(userConfig.build.outDir, userConfig.root)
    },
    async closeBundle() {
      const { deleteOriginalAssets, compressionOptions, algorithm, exclude } = options
      const files = await readGlobalFiles(outputPath, exclude)
      // should compression files.

      // do delete file or not after compression
      try {
        const removed = await removeFiles(files, deleteOriginalAssets)
        if (removed) config.logger.info(removed)
      } catch (error) {
        config.logger.error(error)
      }
    }
  }
}
