import type { Logger } from 'vite'
import type { ZlibOptions, BrotliOptions } from 'zlib'
import type { Pattern } from 'fast-glob'
export type Algorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw'

export type CompressionOptions = Partial<ZlibOptions> | Partial<BrotliOptions>

export type Regular = Pattern[]

export type ViteInternalLogger = Logger

export interface ViteCompressionPluginConfig {
  exclude?: Regular
  threshold?: number
  algorithm?: Algorithm | (() => Algorithm)
  compressionOptions?: CompressionOptions
  deleteOriginalAssets?: boolean | 'keep-source-map'
  loginfo?: 'silent' | 'info'
}
