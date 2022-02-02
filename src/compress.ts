import zlib from 'zlib'

import type { CompressionOptions, ViteCompressionPluginConfig } from './preset-config'

type Algorithm = ViteCompressionPluginConfig['algorithm']

export const getCompression = (algorithm: Algorithm, compressionOptions: CompressionOptions) => {
  //
}
