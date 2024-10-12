import util from 'util'
import zlib from 'zlib'
import type { ZlibOptions } from 'zlib'
import path from 'path'
import fs from 'fs'
import { afterAll, assert, describe, expect, it } from 'vitest'
import { readAll } from '../src/shared'
import { compression } from '../src'
import { createDisk, getId, mockBuild } from './shared/kit.mjs'

describe('plugin', () => {
  const { root, destroy, dir } = createDisk('plugin')
  afterAll(destroy)
  it('include only', async () => {
    const { output } = await mockBuild('normal', root, { plugins: [compression({ include: /\.(js)$/ })] })
    expect((await readAll(output)).filter(s => s.endsWith('.gz')).length).toBe(1)
  })
  it('exclude only', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({ exclude: /\.(html)$/, skipIfLargerOrEqual: false })]
    })
    expect((await readAll(output)).filter(s => s.endsWith('.gz')).length).toBe(2)
  })

  it('threshold', async () => {
    const { output } = await mockBuild('normal', root, { plugins: [compression({ threshold: 100 })] })
    expect((await readAll(output)).filter(s => s.endsWith('.gz')).length).toBe(2)
  })

  it('algorithm', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({ algorithm: 'gzip', skipIfLargerOrEqual: false })]
    })
    expect((await readAll(output)).filter(s => s.endsWith('.gz')).length).toBe(3)
  })
  it('custom alorithm', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression<ZlibOptions>({
        algorithm(buf, opt) {
          return util.promisify(zlib.gzip)(buf, opt)
        },
        skipIfLargerOrEqual: false,
        compressionOptions: { level: 9 }
      })]
    })
    expect((await readAll(output)).filter(s => s.endsWith('.gz')).length).toBe(3)
  })
  it('brotliCompress', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        algorithm: 'brotliCompress',
        skipIfLargerOrEqual: false
      })]
    })
    expect((await readAll(output)).filter(s => s.endsWith('.br')).length).toBe(3)
  })
  it('delete original assets', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        deleteOriginalAssets: true,
        skipIfLargerOrEqual: false
      })]
    })
    expect((await readAll(output)).length).toBe(3)
  })
  it('filename', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        skipIfLargerOrEqual: false,
        filename: 'fake/[base].gz'
      })]
    })
    const result = await readAll(path.join(output, 'fake'))
    expect(result.filter(s => s.endsWith('.gz')).length).toBe(3)
  })

  it('multiple', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [
        compression({ skipIfLargerOrEqual: false, algorithm: 'gzip', include: /\.(css)$/ }),
        compression({ skipIfLargerOrEqual: false, include: /\.(css)$/, algorithm: 'brotliCompress' })
      ]
    })
    const result = await readAll(output)
    const gzip = result.filter(s => s.endsWith('.gz'))
    const br = result.filter(s => s.endsWith('.br'))
    expect(gzip.length).toBe(br.length)
  })
  it('dynamic import source', async () => {
    const { output } = await mockBuild('dynamic', root, {
      plugins: [compression({
        skipIfLargerOrEqual: false,
        deleteOriginalAssets: true
      })]
    })
    expect((await readAll(output)).filter(s => s.endsWith('.gz')).length).toBe(4)
  })

  describe('Public assets', () => {
    it('normal', async () => {
      const { output } = await mockBuild('public-assets', root, {
        plugins: [compression({
          skipIfLargerOrEqual: false,
          deleteOriginalAssets: true,
          exclude: /\.(html)$/
        })]
      })
      expect((await readAll(output)).filter(s => s.endsWith('.gz')).length).toBe(3)
    })
    it('nesting', async () => {
      const { output } = await mockBuild('public-assets-nest', root, {
        plugins: [compression({
          skipIfLargerOrEqual: false,
          deleteOriginalAssets: true,
          exclude: /\.(html)$/
        })]
      })
      const result = await readAll(output)
      expect(result.filter(s => s.endsWith('.gz')).length).toBe(6)
    })

    it('threshold', async () => {
      const { output } = await mockBuild('public-assets-nest', root, {
        plugins: [compression({
          skipIfLargerOrEqual: false,
          deleteOriginalAssets: true,
          exclude: /\.(html)$/,
          threshold: 1024 * 2
        })]
      })
      const result = await readAll(output)
      expect(result.filter(s => s.endsWith('.gz')).length).toBe(0)
    })
  })

  it('amazon s3', async () => {
    const { output } = await mockBuild('dynamic', root, {
      plugins: [compression({
        skipIfLargerOrEqual: false,
        filename: '[path][base]',
        deleteOriginalAssets: true
      })]
    })
    const result = await readAll(output)
    const cssFiles = result.filter(v => v.endsWith('.css'))
    assert(cssFiles.length === 1)
    expect(zlib.unzipSync(fs.readFileSync(cssFiles[0])).toString()).toBe(
      '.pr{padding-right:30px}.pl{padding-left:30px}.mt{margin-top:30px}\n'
    )
  })

  describe('rollup options', () => {
    it('multiple outputs', async () => {
      const another = path.join(dir, getId())
      const another2 = path.join(dir, getId())
      await mockBuild('public-assets-nest', root, {
        plugins: [compression({ skipIfLargerOrEqual: false, exclude: /\.(html)$/ })],
        build: {
          rollupOptions: {
            output: [{ dir: another }, { dir: another2 }]
          }
        }
      })
      const result1 = await readAll(another)
      const result2 = await readAll(another2)
      assert(result1.length === result2.length)
    })
  })
})
