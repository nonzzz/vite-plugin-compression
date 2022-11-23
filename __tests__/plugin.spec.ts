import test from 'ava'
import path from 'path'
import fsp from 'fs/promises'
import { build } from 'vite'
import { compression } from '../src'
import { len } from '../src/utils'
import type { ViteCompressionPluginConfig } from '../src'

const getId = () => Math.random().toString(32).slice(2, 10)

const dist = path.join(__dirname, 'dist')

const mockBuild = async (config: ViteCompressionPluginConfig = {}) => {
  const id = getId()
  await build({
    root: path.join(__dirname, 'fixture'),
    plugins: [compression(config)],
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir: path.join(__dirname, 'dist', id)
    }
  })
  return id
}

test.after(async () => {
  await fsp.rm(dist, { recursive: true })
})

const readAll = async (entry: string) => {
  const final = []
  const readAllImpl = async (entry: string) =>
    Promise.all(
      (await fsp.readdir(entry)).map(async (dir) => {
        const p = path.join(entry, dir)
        if ((await fsp.stat(p)).isDirectory()) return readAllImpl(p)
        final.push(p)
        return p
      })
    )
  await readAllImpl(entry)
  return final as string[]
}

test('vite-plugin-compression2', async (t) => {
  const id = await mockBuild()
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  t.is(compressed, 3)
})

test('include js only', async (t) => {
  const id = await mockBuild({
    include: /\.(js)$/
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  t.is(compressed, 1)
})

test('include css and js', async (t) => {
  const id = await mockBuild({
    include: [/\.(js)$/, /\.(css)$/]
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  t.is(compressed, 2)
})

test('exlucde html', async (t) => {
  const id = await mockBuild({
    exclude: /\.(html)$/
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  t.is(compressed, 2)
})

test('threshold', async (t) => {
  const id = await mockBuild({
    threshold: 100
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  t.is(compressed, 2)
})

test('algorithm', async (t) => {
  const id = await mockBuild({
    algorithm: () => 'gzip'
  })
  const r = await readAll(path.join(dist, id))
  const compressed = len(r.filter((s) => s.endsWith('.gz')))
  t.is(compressed, 3)
})

test('deleteOriginalAssets', async (t) => {
  const id = await mockBuild({
    deleteOriginalAssets: true
  })
  const r = await readAll(path.join(dist, id))
  t.is(len(r), 3)
})
