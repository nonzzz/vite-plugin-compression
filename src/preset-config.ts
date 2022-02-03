import type { ZlibOptions, BrotliOptions } from 'zlib'
import type { Pattern } from 'fast-glob'
export type Algorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw'

export type CompressionOptions = Partial<ZlibOptions> | Partial<BrotliOptions>

export type Regular = Pattern[]

export interface ViteCompressionPluginConfig {
  exclude?: Regular
  algorithm?: Algorithm | (() => Algorithm)
  compressionOptions?: CompressionOptions
  filename?: string | (() => string)
  deleteOriginalAssets?: boolean | 'keep-source-map'
}

const DEFAULT_CONFIG: ViteCompressionPluginConfig = {
  exclude: [],
  algorithm: 'gzip',
  compressionOptions: {
    level: 9
  },
  filename: '[path][base].gz',
  deleteOriginalAssets: false
}

export const resolveConfig = (userConfig?: ViteCompressionPluginConfig) =>
  Object.assign(DEFAULT_CONFIG, userConfig || {})
