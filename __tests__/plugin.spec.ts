import path from 'path'
import zlib, { BrotliOptions } from 'zlib'
import fs from 'fs'
import fsp from 'fs/promises'
import util from 'util'
import type { ZlibOptions } from 'zlib'
import { afterAll, expect, test } from 'vitest'
import { len, readAll } from '../src/utils'
import { type Algorithm, type ViteCompressionPluginConfig, compression } from '../src'

const getId = () => Math.random().toString(32).slice(2, 10)

const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))

const dist = path.join(__dirname, 'dist')

let vite: typeof import('vite')

async function mockBuild<T = never, A extends Algorithm = never>(
  config?: ViteCompressionPluginConfig<T, A>,
  path?: string
): Promise<string>
async function mockBuild<T = never, A extends Algorithm = never, K = never, B extends Algorithm = never>(
  config: [ViteCompressionPluginConfig<T, A>, ViteCompressionPluginConfig<K, B>],
  path?: string
): Promise<string>
async function mockBuild(config: any = {}, dir = 'normal') {
  vite = await import('vite')
  const id = getId()
  const configs = Array.isArray(config) ? config : [config]
  const plugins = configs.map(conf => {
    conf.skipIfLargerOrEqual = conf.skipIfLargerOrEqual ?? false
    return compression(conf)
  })

  await vite.build({
    root: path.join(__dirname, 'fixtures', dir),
    plugins,
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir: path.join(__dirname, 'dist', id)
    }
  })
  return id
}

afterAll(async () => {
  await fsp.rm(dist, { recursive: true })
})

test('vite-plugin-compression2', async () => {
  const id = await mockBuild()
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(3)
})

test('include js only', async () => {
  const id = await mockBuild({
    include: /\.(js)$/
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(1)
})

test('include css and js', async () => {
  const id = await mockBuild({
    include: [/\.(js)$/, /\.(css)$/]
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(2)
})

test('exlucde html', async () => {
  const id = await mockBuild({
    exclude: /\.(html)$/
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(2)
})

test('threshold', async () => {
  const id = await mockBuild({
    threshold: 100
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(2)
})

test('algorithm', async () => {
  const id = await mockBuild({
    algorithm: 'gzip'
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(3)
})

test('custom alorithm', async () => {
  const id = await mockBuild<ZlibOptions>({
    algorithm(buf, opt) {
      return util.promisify(zlib.gzip)(buf, opt)
    },
    compressionOptions: {
      level: 9
    }
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(3)
})

test('deleteOriginalAssets', async () => {
  const id = await mockBuild({
    deleteOriginalAssets: true
  })
  const r = await readAll(path.join(dist, id))
  expect(len(r)).toBe(3)
})

test('brotliCompress', async () => {
  const id = await mockBuild({
    algorithm: 'brotliCompress'
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.br')))
  expect(compressed).toBe(3)
})

test('filename', async () => {
  const id = await mockBuild({
    filename: 'fake/[base].gz'
  })
  const r = await readAll(path.join(dist, id, 'fake'))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(3)
})

test('multiple', async () => {
  const id = await mockBuild<ZlibOptions, 'gzip', BrotliOptions, Exclude<Algorithm, 'gzip'>>([
    {
      algorithm: 'gzip',
      include: /\.(js)$/
    },
    {
      algorithm: 'brotliCompress',
      include: /\.(css)$/
    }
  ])

  const r = await readAll(path.join(dist, id))
  const gz = len(r.filter((s) => s.endsWith('.gz')))
  const br = len(r.filter((s) => s.endsWith('.br')))
  expect(gz).toBe(1)
  expect(br).toBe(1)
})

test('dynamic', async () => {
  const id = await mockBuild({ deleteOriginalAssets: true }, 'dynamic')
  await sleep(3000)
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(4)
})

test('dynamic diff', async () => {
  const ids = await Promise.all([mockBuild({ deleteOriginalAssets: true }, 'dynamic'), mockBuild({}, 'dynamic')])
  await sleep(3000)
  const [diff1, diff2] = await Promise.all(ids.map((id) => readAll(path.join(dist, id))))
  const diff1Js = diff1.filter((v) => v.endsWith('.js.gz')).map((v) => zlib.unzipSync(fs.readFileSync(v)))
  const diff2Js = diff2.filter((v) => v.endsWith('.js')).map((v) => fs.readFileSync(v))
  expect(diff1Js).toStrictEqual(diff2Js)
})

test('public assets', async () => {
  const id = await mockBuild({ deleteOriginalAssets: true, exclude: /\.(html)$/ }, 'public-assets')
  await sleep(3000)
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(3)
})

test('public assets nest', async () => {
  const id = await mockBuild({ deleteOriginalAssets: true, exclude: /\.(html)$/ }, 'public-assets-nest')
  await sleep(3000)
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(6)
  const nestJs1 = path.join(dist, id, 'js/nest1', 'index.js.gz')
  const nestJs2 = path.join(dist, id, 'js/nest2', 'index.js.gz')
  const nestCss1 = path.join(dist, id, 'theme/dark', 'dark.css.gz')
  const nestCss2 = path.join(dist, id, 'theme/light', 'light.css.gz')
  const Js = path.join(dist, id, 'normal.js.gz')
  const fianl = [nestCss1, nestCss2, nestJs1, nestJs2, Js]
  fianl.forEach((p) => expect(fs.existsSync(p)).toBeTruthy())
})

test('public assets threshold', async () => {
  const id = await mockBuild(
    { deleteOriginalAssets: true, exclude: /\.(html)$/, threshold: 1024 * 2 },
    'public-assets-nest'
  )
  await sleep(3000)
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(0)
})

test('exclude-assets', async () => {
  const id = await mockBuild({ exclude: [/\.(gif)$/] }, 'exclude-assets')
  await sleep(3000)
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(2)
})

test('aws s3', async () => {
  const id = await mockBuild({ filename: '[path][base]', deleteOriginalAssets: true }, 'dynamic')
  await sleep(3000)
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  expect(compressed).toBe(0)

  const css = r.filter(v => v.endsWith('.css'))[0]
  const bf = zlib.unzipSync(fs.readFileSync(css))
  expect(bf.toString(), '.pr{padding-right:30px}.pl{padding-left:30px}.mt{margin-top:30px}\n')
})
