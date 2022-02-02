import { resolveConfig } from './preset-config'
import { resolvePath } from './utils'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ViteCompressionPluginConfig } from './preset-config'

export default function (options: ViteCompressionPluginConfig = {}): Plugin {
  let config: ResolvedConfig
  let outputPath
  return {
    name: 'vite-compression-plugin',
    apply: 'build',
    enforce: 'post',
    async configResolved(userConfig) {
      try {
        config = userConfig
        outputPath = await resolvePath(userConfig.build.outDir, userConfig.root)
      } catch (error) {
        console.log(config.logger)
        process.exit(1)
      }
    }
  }
}
