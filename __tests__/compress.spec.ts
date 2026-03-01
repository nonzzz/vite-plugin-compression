import { describe, expect, test } from 'vitest'
import { type InputType, constants } from 'zlib'
import { compress, defaultIsHighMemory, ensureAlgorithm } from '../src/compress'
import type { Algorithm } from '../src/interface'

const mockCompress = async (userAlgorithm: Algorithm, buf: InputType) => {
  const { algorithm } = ensureAlgorithm(userAlgorithm)
  return compress(buf, algorithm, {})
}

test('compress with error', async () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  await expect(mockCompress('gzip', 123 as any)).rejects.toThrowError(
    'The "chunk" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received type number (123)'
  )
})

describe('defaultIsHighMemory', () => {
  test('gzip is never high memory', () => {
    expect(defaultIsHighMemory('gzip', { level: 9 })).toBe(false)
  })

  test('deflate is never high memory', () => {
    expect(defaultIsHighMemory('deflate', { level: 9 })).toBe(false)
  })

  test('deflateRaw is never high memory', () => {
    expect(defaultIsHighMemory('deflateRaw', { level: 9 })).toBe(false)
  })

  test('custom function algorithm is never high memory', () => {
    // @ts-expect-error safe type
    const fn = (buf: InputType) => Promise.resolve(Buffer.from(buf))
    expect(defaultIsHighMemory(fn, {})).toBe(false)
  })

  test('zstandard level < 20 is not high memory', () => {
    expect(defaultIsHighMemory('zstandard', {
      params: { [constants.ZSTD_c_compressionLevel]: 19 }
    })).toBe(false)
  })

  test('zstandard level = 20 is high memory', () => {
    expect(defaultIsHighMemory('zstandard', {
      params: { [constants.ZSTD_c_compressionLevel]: 20 }
    })).toBe(true)
  })

  test('zstandard level = 22 is high memory', () => {
    expect(defaultIsHighMemory('zstandard', {
      params: { [constants.ZSTD_c_compressionLevel]: 22 }
    })).toBe(true)
  })

  test('zstandard with no params defaults to not high memory', () => {
    expect(defaultIsHighMemory('zstandard', {})).toBe(false)
  })

  test('brotliCompress quality < 10 is not high memory', () => {
    expect(defaultIsHighMemory('brotliCompress', {
      params: { [constants.BROTLI_PARAM_QUALITY]: 9 }
    })).toBe(false)
  })

  test('brotliCompress quality = 10 is high memory', () => {
    expect(defaultIsHighMemory('brotliCompress', {
      params: { [constants.BROTLI_PARAM_QUALITY]: 10 }
    })).toBe(true)
  })

  test('brotliCompress quality = 11 is high memory', () => {
    expect(defaultIsHighMemory('brotliCompress', {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 }
    })).toBe(true)
  })

  test('brotliCompress with no params defaults to high memory', () => {
    // default quality is 11, so should be high memory
    expect(defaultIsHighMemory('brotliCompress', {})).toBe(true)
  })
})
