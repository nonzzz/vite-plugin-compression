import fs from 'fs'
import path from 'path'
import util from 'util'
import type { Plugin } from 'vite'
import { afterAll, assert, describe, expect, it } from 'vitest'
import zlib from 'zlib'
import { compression, defineAlgorithm } from '../src'
import { readAll } from '../src/shared'
import { createDisk, getFixturePath, getId, mockBuild } from './shared/kit.mjs'
import type { Vite6Plugin } from './shared/kit.mjs'

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

  it('compresses content after post-ordered generateBundle hooks', async () => {
    const marker = '<!-- transformed by post hook -->'
    const postPlugin = {
      name: 'post-bundle-transform',
      enforce: 'post',
      generateBundle: {
        order: 'post',
        handler(_, bundle) {
          const html = bundle['index.html']
          if (!html || html.type !== 'asset') { return }
          const source = typeof html.source === 'string' ? html.source : Buffer.from(html.source).toString()
          html.source = source + marker
        }
      }
    } satisfies Plugin
    const { output } = await mockBuild('normal', root, {
      plugins: [
        compression({ algorithms: ['gzip'], include: /\.html$/, skipIfLargerOrEqual: false }),
        postPlugin
      ]
    })
    const html = fs.readFileSync(path.join(output, 'index.html'))
    const compressed = zlib.gunzipSync(fs.readFileSync(path.join(output, 'index.html.gz')))

    expect(html.toString()).toContain(marker)
    expect(compressed.equals(html)).toBe(true)
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
    ).rejects.toThrow('Test error for pretty stack')
  })
  it('alias for algorithm', async () => {
    const { output } = await mockBuild('normal', root, { plugins: [compression({ include: /\.(js)$/, algorithms: [['br', {}]] })] })
    expect((await readAll(output)).filter((s) => s.endsWith('.br')).length).toBe(1)
  })

  it('artifacts', async () => {
    const otherStaticPath = path.join(getFixturePath('public-assets'), 'public')
    const otherStatics = await readAll(otherStaticPath)
    const { output } = await mockBuild('normal', root, {
      plugins: [compression({
        include: /\.(yaml)$/,
        algorithms: ['gzip'],
        artifacts() {
          return otherStatics.map((src) => ({ src }))
        }
      })]
    })
    const result = await readAll(output)
    expect(result.filter((s) => s.endsWith('.gz')).length).toBe(1)
  })
  it('work with vite internal manifest plugin', async () => {
    const { output } = await mockBuild('normal', root, {
      build: { manifest: true },
      plugins: [compression({ deleteOriginalAssets: true, algorithms: ['gz'], skipIfLargerOrEqual: false }) as unknown as Vite6Plugin]
    }, true)
    expect(1).toBe(1)
    const files = await readAll(output)
    expect(files.filter((s) => s.endsWith('.gz')).length).toBe(4)

    const manifestPath = files.find((f) => f.endsWith('manifest.json.gz'))

    if (!manifestPath) {
      expect.fail('missing manifestPath for suite: work with vite internal manifest plugin')
    }

    expect(fs.existsSync(manifestPath)).toBe(true)

    const original = zlib.gunzipSync(fs.readFileSync(manifestPath)).toString()
    const manifest = JSON.parse(original) as Record<string, { file: string }>

    expect(Object.keys(manifest).length).toBeGreaterThanOrEqual(1)
  })

  it('work with rolldown vite internal manifest plugin', async () => {
    const { output } = await mockBuild('normal', root, {
      build: { manifest: true },
      plugins: [compression({ deleteOriginalAssets: true, algorithms: ['gz'], skipIfLargerOrEqual: false })]
    })
    expect(1).toBe(1)
    const files = await readAll(output)
    expect(files.filter((s) => s.endsWith('.gz')).length).toBe(4)

    const manifestPath = files.find((f) => f.endsWith('manifest.json.gz'))

    if (!manifestPath) {
      expect.fail('missing manifestPath for suite: work with rolldown vite internal manifest plugin')
    }

    expect(fs.existsSync(manifestPath)).toBe(true)

    const original = zlib.gunzipSync(fs.readFileSync(manifestPath)).toString()
    const manifest = JSON.parse(original) as Record<string, { file: string }>

    expect(Object.keys(manifest).length).toBeGreaterThanOrEqual(1)
  })
})
