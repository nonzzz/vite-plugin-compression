import type { CompressionOptions, ViteCompressionPluginConfig } from './preset-config'

type Algorithm = ViteCompressionPluginConfig['algorithm']

export const getCompression = (algorithm: Algorithm, compressionOptions: CompressionOptions) => {
  let raw
  if (algorithm === 'gzip') raw = require('zlib').createGzip
  if (algorithm === 'deflate') raw = require('zlib').createDeflate
  if (algorithm === 'deflateRaw') raw = require('zlib').createDeflateRaw
  if (algorithm === 'brotliCompress') raw = require('zlib').createBrotliCompress
  return raw(compressionOptions)
}

export const getCompressExt = (algorithm: Algorithm) => {
  if (algorithm === 'gzip') return '.gz'
  if (algorithm === 'brotliCompress') return '.br'
  return ''
}
