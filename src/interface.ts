import type { FilterPattern } from '@rollup/pluginutils'
import type { HookHandler, Plugin } from 'vite'
import type { BrotliOptions, InputType, ZlibOptions, ZstdOptions } from 'zlib'

export type Algorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw' | 'zstd'

export interface UserCompressionOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export type InferDefault<T> = T extends infer K ? K : UserCompressionOptions

export type CompressionOptions<T> = InferDefault<T>

export type Pretty<T> =
  & {
    [key in keyof T]: T[key]
  }
  & NonNullable<unknown>

export interface FileNameFunctionMetadata {
  // eslint-disable-next-line no-use-before-define
  algorithm: Algorithm | AlgorithmFunction<UserCompressionOptions>
  options: UserCompressionOptions
}
interface BaseCompressionPluginOptions {
  include?: FilterPattern
  exclude?: FilterPattern
  threshold?: number
  filename?: string | ((id: string, metadata: FileNameFunctionMetadata) => string)
  deleteOriginalAssets?: boolean
  skipIfLargerOrEqual?: boolean
}
export interface AlgorithmToZlib {
  gzip: ZlibOptions
  brotliCompress: BrotliOptions
  deflate: ZlibOptions
  deflateRaw: ZlibOptions
  zstd: ZstdOptions
}

export type AlgorithmFunction<T extends UserCompressionOptions> = (buf: InputType, options: T) => Promise<Buffer>

export type DefineAlgorithmResult<T extends UserCompressionOptions = UserCompressionOptions> =
  | readonly [
    'gzip' | 'deflate' | 'deflateRaw',
    ZlibOptions
  ]
  | readonly [
    'brotliCompress',
    BrotliOptions
  ]
  | readonly [
    'zstd',
    ZstdOptions
  ]
  | readonly [
    AlgorithmFunction<T>,
    T
  ]

export type Algorithms = (Algorithm | DefineAlgorithmResult)[]

export interface ViteCompressionPluginOption extends BaseCompressionPluginOptions {
  algorithms?: Algorithms
}

export type GenerateBundle = HookHandler<Plugin['generateBundle']>

export type WriteBundle = HookHandler<Plugin['writeBundle']>

export interface ViteTarballPluginOptions {
  dest?: string
}
