export type Algorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw'

export interface UserCompressionOptions {
  [key: string]: any
}

export type InferDefault<T> = T extends infer K ? K : UserCompressionOptions

export type CompressionOptions<T> = InferDefault<T>

interface BaseCompressionPluginOptions {
  include?: string | RegExp | Array<string | RegExp>
  exclude?: RegExp | string | Array<string | RegExp>
  threshold?: number
  filename?: string | ((id: string) => string)
  deleteOriginalAssets?: boolean
  skipIfLargerOrEqual?: boolean
}

export interface AlgorithmFunction<T> {
  (buf: Buffer, options: CompressionOptions<T>, callback: (err: Error | null, result: Buffer) => void)
}


import type { ZlibOptions, BrotliOptions } from 'zlib'
interface AlgorithmToZlib {
  gzip: ZlibOptions
  brotliCompress: BrotliOptions
  deflate: ZlibOptions
  deflateRaw: ZlibOptions
}

export interface AlgorithmFunction<T> {
  (buf: Buffer, options: CompressionOptions<T>, callback: (err: Error | null, result: Buffer) => void)
}

type InternalCompressionPluginOptionsFunction<T> = {
  algorithm?: AlgorithmFunction<T>
  compressionOptions?: CompressionOptions<T>
}
type InternalCompressionPluginOptionsAlgorithm<A extends Algorithm> = {
  algorithm?: A
  compressionOptions?: AlgorithmToZlib[A]
}

export type ViteCompressionPluginConfigFunction<T> = BaseCompressionPluginOptions &
  InternalCompressionPluginOptionsFunction<T>
export type ViteCompressionPluginConfigAlgorithm<A extends Algorithm> = BaseCompressionPluginOptions &
  InternalCompressionPluginOptionsAlgorithm<A>
export type ViteCompressionPluginConfig<T, A extends Algorithm> =
  | ViteCompressionPluginConfigFunction<T>
  | ViteCompressionPluginConfigAlgorithm<A>

interface BaseCompressMetaInfo {
  effect: boolean
}

interface NormalCompressMetaInfo extends BaseCompressMetaInfo {
  effect: false
}

interface DyanmiCompressMetaInfo extends BaseCompressMetaInfo {
  effect: true
  file: string[]
  dest: string[]
}

export type CompressMetaInfo = NormalCompressMetaInfo | DyanmiCompressMetaInfo
