import type { CompressionOptions, Algorithm } from './interface'

export const getCompression = (algorithm: Algorithm, compressionOptions: CompressionOptions) => {
  let raw
  if (algorithm === 'gzip') raw = require('zlib').createGzip
  if (algorithm === 'deflate') raw = require('zlib').createDeflate
  if (algorithm === 'deflateRaw') raw = require('zlib').createDeflateRaw
  if (algorithm === 'brotliCompress') raw = require('zlib').createBrotliCompress
  return raw(compressionOptions)
}

export const getCompressExt = (algorithm: Algorithm) => {
  switch (algorithm) {
    case 'gzip':
      return '.gz'
    case 'brotliCompress':
      return '.br'
    case 'deflateRaw':
    case 'deflate':
      return ''
    default:
      throw new Error('Invalid algorithm')
  }
}
