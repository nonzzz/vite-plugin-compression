import type { ZlibOptions, BrotliOptions } from 'zlib'
import type { Pattern } from 'fast-glob'
export type Algorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw'

export type CompressionOptions = Partial<ZlibOptions> | Partial<BrotliOptions>

export type Regular = Pattern[]

export interface ViteCompressionPluginConfig {
  exclude?: Regular
  threshold?: number
  algorithm?: Algorithm | (() => Algorithm)
  compressionOptions?: CompressionOptions
  deleteOriginalAssets?: boolean | 'keep-source-map'
  loginfo?: 'silent' | 'info'
}

const DEFAULT_CONFIG: ViteCompressionPluginConfig = {
  exclude: [],
  threshold: 0,
  algorithm: 'gzip',
  compressionOptions: {
    level: 9
  },
  deleteOriginalAssets: false,
  loginfo: 'info'
}

export const resolveConfig = (userConfig?: ViteCompressionPluginConfig) =>
  Object.assign(DEFAULT_CONFIG, userConfig || {})
