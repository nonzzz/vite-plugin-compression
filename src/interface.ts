import type { ZlibOptions, BrotliOptions, Gzip, Deflate, DeflateRaw, BrotliCompress } from 'zlib'
import type { Pattern } from 'fast-glob'

export type Algorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw'

export type CompressionOptions = Partial<ZlibOptions> | Partial<BrotliOptions>

export type Regular = Pattern[]

export type Compress = Gzip | Deflate | DeflateRaw | BrotliCompress

export interface ViteCompressionPluginConfig {
  exclude?: Regular
  threshold?: number
  algorithm?: Algorithm | (() => Algorithm)
  compressionOptions?: CompressionOptions
  deleteOriginalAssets?: boolean | 'keep-source-map'
  loginfo?: 'silent' | 'info'
}
