import type { BrotliOptions, ZlibOptions } from 'zlib'
import type { FilterPattern } from '@rollup/pluginutils'

export type Algorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw'

export interface UserCompressionOptions {
  [key: string]: any
}

export type InferDefault<T> = T extends infer K ? K : UserCompressionOptions

export type CompressionOptions<T> = InferDefault<T>

export type Pretty<T> = {
  [key in keyof T]:
  T[key] extends (...args: any[])=> any
  ? (...args: Parameters<T[key]>)=> ReturnType<T[key]>
  : T[key] & NonNullable<unknown>
} & NonNullable<unknown>

interface BaseCompressionPluginOptions {
  include?: FilterPattern
  exclude?: FilterPattern
  threshold?: number
  filename?: string | ((id: string)=> string)
  deleteOriginalAssets?: boolean
  skipIfLargerOrEqual?: boolean
}
interface AlgorithmToZlib {
  gzip: ZlibOptions
  brotliCompress: BrotliOptions
  deflate: ZlibOptions
  deflateRaw: ZlibOptions
}

export type AlgorithmFunction<T extends UserCompressionOptions> =
  (buf: Buffer, options: T)=> Promise<Buffer>


type InternalCompressionPluginOptionsFunction<T> =  {
  algorithm?: AlgorithmFunction<T>
  compressionOptions: T
}
type InternalWithoutCompressionPluginOptionsFunction =  {
  algorithm?: AlgorithmFunction<undefined>
}
type InternalCompressionPluginOptionsAlgorithm<A extends Algorithm> = {
  algorithm?: A
  compressionOptions?: Pretty<AlgorithmToZlib[A]>
}

export type ViteCompressionPluginConfigFunction<T extends UserCompressionOptions> = BaseCompressionPluginOptions &
  InternalCompressionPluginOptionsFunction<T>
export type ViteWithoutCompressionPluginConfigFunction = Pretty<BaseCompressionPluginOptions &
InternalWithoutCompressionPluginOptionsFunction>
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


