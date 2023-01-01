import type { ZlibOptions, BrotliOptions } from 'zlib'

export type Algorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw'

export interface UserCompressionOptions {
  [key: string]: any
}

export type InternalCompressions = ZlibOptions | BrotliOptions

export type InferDefault<T> = T extends infer K ? K : UserCompressionOptions

export type CompressionOptions<T> = InferDefault<T>

interface BaseCompressionPluginOptions<T> {
  include?: string | RegExp | Array<string | RegExp>
  exclude?: RegExp | string | Array<string | RegExp>
  threshold?: number
  filename?: string | ((id: string) => string)
  deleteOriginalAssets?: boolean
}

type InternalCompressionPluginOptions<T> = {
  algorithm?: Algorithm | AlgorithmFunction<T>
  compressionOptions?: CompressionOptions<T>
}

export type ViteCompressionPluginConfig<T> = BaseCompressionPluginOptions<T> & InternalCompressionPluginOptions<T>

interface BaseCompressMetaInfo {
  effect: boolean
}

interface NormalCompressMetaInfo extends BaseCompressMetaInfo {
  effect: false
}

interface DyanmiCompressMetaInfo extends BaseCompressMetaInfo {
  effect: true
  file: string
}

export type CompressMetaInfo = NormalCompressMetaInfo | DyanmiCompressMetaInfo

export interface AlgorithmFunction<T> {
  (buf: Buffer, options: CompressionOptions<T>, callback: (err: Error | null, result: Buffer) => void)
}
