import type { ZlibOptions, BrotliOptions } from 'zlib'

export type Algorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw'

export type CompressionOptions = Partial<ZlibOptions> | Partial<BrotliOptions>

export interface ViteCompressionPluginConfig {
  test?: string | RegExp | Array<string | RegExp> | undefined
  include?: string | RegExp | Array<string | RegExp> | undefined
  exclude?: string | RegExp | Array<string | RegExp> | undefined
  algorithm?: Algorithm | (() => Algorithm)
  compressionOptions?: CompressionOptions
  filename?: string | (() => string)
  deleteOriginalAssets?: boolean | 'keep-source-map'
}

const DEFAULT_CONFIG: ViteCompressionPluginConfig = {
  test: undefined,
  include: undefined,
  exclude: undefined,
  algorithm: 'gzip',
  compressionOptions: {
    level: 9
  },
  filename: '[path][base].gz',
  deleteOriginalAssets: false
}

export const resolveConfig = (userConfig?: ViteCompressionPluginConfig) =>
  Object.assign(DEFAULT_CONFIG, userConfig || {})
