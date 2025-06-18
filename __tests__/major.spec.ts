import fs from 'fs'
import path from 'path'
import util from 'util'
import { afterAll, assert, describe, expect, it } from 'vitest'
import zlib from 'zlib'
import { compression, defineAlgorithm } from '../src'
import { readAll } from '../src/shared'
import { createDisk, getId, mockBuild } from './shared/kit.mjs'

describe('compression plugin', () => {
  const { root, destroy, dir } = createDisk('compression-plugin')
  afterAll(destroy)

  it('include only', async () => {
    const { output } = await mockBuild('normal', root, { plugins: [compression({ include: /\.(js)$/ })] })
    expect((await readAll(output)).filter((s) => s.endsWith('.gz')).length).toBe(1)
  })

  it('exclude only', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({ exclude: /\.(html)$/, skipIfLargerOrEqual: false })]
    })
    expect((await readAll(output)).filter((s) => s.endsWith('.gz')).length).toBe(2)
  })

  it('threshold', async () => {
    const { output } = await mockBuild('normal', root, { plugins: [compression({ threshold: 100 })] })
    expect((await readAll(output)).filter((s) => s.endsWith('.gz')).length).toBe(2)
  })

  it('algorithm', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({ algorithms: ['gzip'], skipIfLargerOrEqual: false })]
    })
    expect((await readAll(output)).filter((s) => s.endsWith('.gz')).length).toBe(3)
  })

  it('custom alorithm', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        algorithms: [defineAlgorithm((buf, opt) => {
          return util.promisify(zlib.gzip)(buf, opt)
        }, { level: 9 })],
        skipIfLargerOrEqual: false
      })]
    })
    expect((await readAll(output)).filter((s) => s.endsWith('.gz')).length).toBe(3)
  })

  it('brotliCompress', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        algorithms: ['brotliCompress'],
        skipIfLargerOrEqual: false
      })]
    })
    expect((await readAll(output)).filter((s) => s.endsWith('.br')).length).toBe(3)
  })
  it('delete original assets', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        algorithms: ['gzip', 'brotliCompress'],
        deleteOriginalAssets: true,
        skipIfLargerOrEqual: false
      })]
    })
    expect((await readAll(output)).length).toBe(6)
  })

  it('filename', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        skipIfLargerOrEqual: false,
        algorithms: ['gzip'],
        filename: 'fake/[base].gz'
      })]
    })
    const result = await readAll(path.join(output, 'fake'))
    expect(result.filter((s) => s.endsWith('.gz')).length).toBe(3)
  })

  it('multiple', async () => {
    const { output } = await mockBuild('normal', root, {
      plugins: [
        compression({ skipIfLargerOrEqual: false, include: /\.(css)$/ })
      ]
    })
    const result = await readAll(output)
    const gzip = result.filter((s) => s.endsWith('.gz'))
    const br = result.filter((s) => s.endsWith('.br'))
    expect(gzip.length).toBe(br.length)
  })

  it('dynamic import source', async () => {
    const { output } = await mockBuild('dynamic', root, {
      plugins: [compression({
        skipIfLargerOrEqual: false,
        deleteOriginalAssets: true
      })]
    })
    expect((await readAll(output)).filter((s) => s.endsWith('.gz')).length).toBe(4)
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
      expect((await readAll(output)).filter((s) => s.endsWith('.gz')).length).toBe(3)
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
      expect(result.filter((s) => s.endsWith('.gz')).length).toBe(6)
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
      expect(result.filter((s) => s.endsWith('.gz')).length).toBe(0)
    })
  })

  it('amazon s3', async () => {
    const { output } = await mockBuild('dynamic', root, {
      plugins: [compression({
        skipIfLargerOrEqual: false,
        algorithms: ['gzip'],
        filename: '[path][base]',
        deleteOriginalAssets: true
      })]
    })
    const result = await readAll(output)
    const cssFiles = result.filter((v) => v.endsWith('.css'))
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
  it('zstd version v23.8.0 and v22.15.0', async () => {
    const p = () => compression({ include: /\.(js)$/, algorithms: ['zstd'] })
    const [major, minor] = process.versions.node.split('.').map((s) => +s)
    if ((+major === 23 && +minor < 8) || (+major < 22 || (+major === 22 && +minor < 15))) {
      expect(p).toThrowError(
        `Node.js ${process.versions.node} does not support zstd compression. ` +
          `Requires Node.js >= 22.15.0 or >= 23.8.0`
      )
    } else {
      expect(defineAlgorithm('zstd')).toHaveLength(2)
      const { output } = await mockBuild('normal', root, { plugins: [p()] })
      expect((await readAll(output)).filter((s) => s.endsWith('.zst')).length).toBe(1)
    }
  })
  it('pretty error stack', async () => {
    await expect(async () =>
      mockBuild('normal', root, {
        plugins: [compression({
          algorithms: ['gz'],
          filename: () => {
            throw new Error('Test error for pretty stack')
          }
        })]
      })
    ).rejects.toThrowErrorMatchingSnapshot()
  })
})
