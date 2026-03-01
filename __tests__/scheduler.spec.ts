import fs from 'fs'
import { afterAll, describe, expect, it } from 'vitest'
import zlib from 'zlib'
import { compression, defineAlgorithm } from '../src'
import { readAll } from '../src/shared'
import { createDisk, mockBuild } from './shared/kit.mjs'

describe('scheduler', () => {
  const { root, destroy } = createDisk('scheduler')
  afterAll(destroy)

  it('scheduler with default options produces correct output', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        scheduler: {},
        algorithms: ['gzip', 'brotliCompress'],
        skipIfLargerOrEqual: false
      })]
    })
    const result = await readAll(output)
    const gz = result.filter((s) => s.endsWith('.gz'))
    const br = result.filter((s) => s.endsWith('.br'))
    expect(gz.length).toBe(3)
    expect(br.length).toBe(3)
  })

  it('scheduler with limit=1 produces correct output', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        scheduler: { limit: 1 },
        algorithms: ['gzip', 'brotliCompress'],
        skipIfLargerOrEqual: false
      })]
    })
    const result = await readAll(output)
    const gz = result.filter((s) => s.endsWith('.gz'))
    const br = result.filter((s) => s.endsWith('.br'))
    expect(gz.length).toBe(3)
    expect(br.length).toBe(3)
  })

  it('scheduler with custom isHighMemory marks all algorithms as normal', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        scheduler: {
          limit: 1,
          isHighMemory: () => false
        },
        algorithms: ['gzip', 'brotliCompress'],
        skipIfLargerOrEqual: false
      })]
    })
    const result = await readAll(output)
    const gz = result.filter((s) => s.endsWith('.gz'))
    const br = result.filter((s) => s.endsWith('.br'))
    expect(gz.length).toBe(3)
    expect(br.length).toBe(3)
  })

  it('scheduler with custom isHighMemory marks all algorithms as high memory', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        scheduler: {
          limit: 1,
          isHighMemory: () => true
        },
        algorithms: ['gzip', 'brotliCompress'],
        skipIfLargerOrEqual: false
      })]
    })
    const result = await readAll(output)
    const gz = result.filter((s) => s.endsWith('.gz'))
    const br = result.filter((s) => s.endsWith('.br'))
    expect(gz.length).toBe(3)
    expect(br.length).toBe(3)
  })

  it('without scheduler preserves original behavior', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        algorithms: ['gzip', 'brotliCompress'],
        skipIfLargerOrEqual: false
      })]
    })
    const result = await readAll(output)
    const gz = result.filter((s) => s.endsWith('.gz'))
    const br = result.filter((s) => s.endsWith('.br'))
    expect(gz.length).toBe(3)
    expect(br.length).toBe(3)
  })

  it('scheduler respects limit for concurrency', async () => {
    let running = 0
    let peak = 0

    const slowGzip = async (buf: zlib.InputType, options: object) => {
      running++
      peak = Math.max(peak, running)
      await new Promise((resolve) => setTimeout(resolve, 50))
      const result = await new Promise<Buffer>((resolve, reject) => {
        zlib.gzip(buf, options, (err, res) => err ? reject(err) : resolve(res))
      })
      running--
      return result
    }

    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        scheduler: {
          limit: 1,
          isHighMemory: (algorithm) => typeof algorithm === 'function'
        },
        algorithms: [defineAlgorithm(slowGzip, { level: 9 })],
        skipIfLargerOrEqual: false
      })]
    })

    const result = await readAll(output)
    expect(result.filter((s) => s.endsWith('.gz')).length).toBe(3)
    expect(peak).toBe(1)
  })

  it('scheduler with limit=2 allows 2 concurrent high-memory tasks', async () => {
    let running = 0
    let peak = 0

    const slowGzip = async (buf: zlib.InputType, options: object) => {
      running++
      peak = Math.max(peak, running)
      await new Promise((resolve) => setTimeout(resolve, 50))
      const result = await new Promise<Buffer>((resolve, reject) => {
        zlib.gzip(buf, options, (err, res) => err ? reject(err) : resolve(res))
      })
      running--
      return result
    }

    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        scheduler: {
          limit: 2,
          isHighMemory: (algorithm) => typeof algorithm === 'function'
        },
        algorithms: [defineAlgorithm(slowGzip, { level: 9 })],
        skipIfLargerOrEqual: false
      })]
    })

    const result = await readAll(output)
    expect(result.filter((s) => s.endsWith('.gz')).length).toBe(3)
    expect(peak).toBeLessThanOrEqual(2)
  })

  it('scheduler with deleteOriginalAssets', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        scheduler: { limit: 1 },
        algorithms: ['gzip'],
        deleteOriginalAssets: true,
        skipIfLargerOrEqual: false
      })]
    })
    const result = await readAll(output)
    expect(result.filter((s) => s.endsWith('.gz')).length).toBe(3)
    expect(result.filter((s) => s.endsWith('.js')).length).toBe(0)
    expect(result.filter((s) => s.endsWith('.css')).length).toBe(0)
  })

  it('scheduler with public assets', async () => {
    const { output } = await mockBuild('public-assets', root, {
      plugins: [compression({
        scheduler: { limit: 1 },
        skipIfLargerOrEqual: false,
        exclude: /\.(html)$/
      })]
    })
    const result = await readAll(output)
    expect(result.filter((s) => s.endsWith('.gz')).length).toBe(3)
  })

  it('compressed content is valid with scheduler enabled', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        scheduler: { limit: 1 },
        algorithms: ['gzip'],
        skipIfLargerOrEqual: false
      })]
    })
    const result = await readAll(output)
    const gzFiles = result.filter((s) => s.endsWith('.gz'))
    for (const file of gzFiles) {
      const buf = fs.readFileSync(file)
      expect(() => zlib.gunzipSync(buf)).not.toThrow()
    }
  })
})
