import type { ZlibOptions, BrotliOptions } from 'zlib'

export type Algorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw'

export type CompressionOptions = Partial<ZlibOptions> | Partial<BrotliOptions>

export interface ViteCompressionPluginConfig {
  include?: string | RegExp | Array<string | RegExp>
  exclude?: RegExp | string | Array<string | RegExp>
  threshold?: number
  algorithm?: Algorithm | (() => Algorithm)
  compressionOptions?: CompressionOptions
  deleteOriginalAssets?: boolean
}

export interface AlgorithmFunction {
  (buf: Buffer, options: CompressionOptions, callback: (err: Error | null, result: Buffer) => void)
}
