import util from 'util'
import { describe, expect, test } from 'vitest'
import zlib, { constants } from 'zlib'
import { defineAlgorithm } from '../src'
import { defaultCompressionOptions } from '../src/compress'
import type { AlgorithmFunction } from '../src/interface'

describe('define function', () => {
  test('defineAlgorithm with gzip algorithm only', () => {
    const result = defineAlgorithm('gzip')

    expect(result).toHaveLength(2)
    expect(result[0]).toBe('gzip')
    expect(result[1]).toStrictEqual(defaultCompressionOptions.gzip)
  })

  test('defineAlgorithm with gzip algorithm and custom options', () => {
    const customOptions = { level: 6, windowBits: 15 }
    const result = defineAlgorithm('gzip', customOptions)

    expect(result).toHaveLength(2)
    expect(result[0]).toBe('gzip')
    expect(result[1]).toEqual({
      level: 6,
      windowBits: 15
    })
  })

  test('defineAlgorithm with brotliCompress algorithm', () => {
    const result = defineAlgorithm('brotliCompress')

    expect(result).toHaveLength(2)
    expect(result[0]).toBe('brotliCompress')
    expect(result[1]).toStrictEqual(defaultCompressionOptions.brotliCompress)
  })

  test('defineAlgorithm with brotliCompress and custom options', () => {
    const customOptions = {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 8
      }
    }
    const result = defineAlgorithm('brotliCompress', customOptions)

    expect(result).toHaveLength(2)
    expect(result[0]).toBe('brotliCompress')
    expect(result[1]).toEqual(customOptions)
  })

  test('defineAlgorithm with deflate algorithm', () => {
    const result = defineAlgorithm('deflate')

    expect(result).toHaveLength(2)
    expect(result[0]).toBe('deflate')
    expect(result[1]).toEqual({
      level: constants.Z_BEST_COMPRESSION
    })
  })

  test('defineAlgorithm with deflateRaw algorithm', () => {
    const result = defineAlgorithm('deflateRaw')

    expect(result).toHaveLength(2)
    expect(result[0]).toBe('deflateRaw')
    expect(result[1]).toEqual({
      level: constants.Z_BEST_COMPRESSION
    })
  })

  test('defineAlgorithm with custom algorithm function', () => {
    const customAlgorithm: AlgorithmFunction<{ customLevel: number }> = async (buf) => {
      return util.promisify(zlib.gzip)(buf)
    }

    const customOptions = { customLevel: 5 }
    const result = defineAlgorithm(customAlgorithm, customOptions)

    expect(result).toHaveLength(2)
    expect(result[0]).toBe(customAlgorithm)
    expect(result[1]).toEqual(customOptions)
  })

  test('defineAlgorithm with custom algorithm function without options', () => {
    const customAlgorithm: AlgorithmFunction<unknown> = async (buf) => {
      return util.promisify(zlib.gzip)(buf)
    }

    const result = defineAlgorithm(customAlgorithm)

    expect(result).toHaveLength(2)
    expect(result[0]).toBe(customAlgorithm)
    expect(result[1]).toEqual({})
  })

  test('defineAlgorithm should throw error for unsupported algorithm', () => {
    expect(() => {
      // @ts-expect-error testing invalid algorithm
      defineAlgorithm('unsupported')
    }).toThrow('[vite-plugin-compression] Unsupported algorithm: unsupported')
  })

  test('defineAlgorithm should merge options with defaults for string algorithms', () => {
    const partialOptions = { level: 3 }
    const result = defineAlgorithm('gzip', partialOptions)

    expect(result[1]).toEqual({
      level: 3
    })
  })

  test('defineAlgorithm return type should be readonly tuple', () => {
    const result = defineAlgorithm('gzip')

    expect(Array.isArray(result)).toBe(true)
    expect(Object.isFrozen(result)).toBe(false)

    expect(typeof result[0]).toBe('string')
    expect(typeof result[1]).toBe('object')
  })

  test('defineAlgorithm with complex brotli options', () => {
    const complexOptions = {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 6,
        [constants.BROTLI_PARAM_LGWIN]: 22
      }
    }

    const result = defineAlgorithm('brotliCompress', complexOptions)

    expect(result[1]).toEqual(complexOptions)
  })
})
