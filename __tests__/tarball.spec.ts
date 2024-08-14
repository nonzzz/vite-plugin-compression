import path from 'path'
import zlib from 'zlib'
import fs from 'fs'
import fsp from 'fs/promises'
import { build } from 'vite'
import { afterAll, expect, test } from 'vitest'
import { createExtract } from 'tar-mini'
import { readAll } from '../src/shared'
import type { ViteCompressionPluginConfig, ViteTarballPluginOptions } from '../src'
import { compression, tarball } from '../src'

const getId = () => Math.random().toString(32).slice(2, 10)
const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))

const dist = path.join(__dirname, 'dist')
const dest = path.join(__dirname, '.dist')

function extract(p: string): Promise<Record<string, Buffer>> {
  const extract = createExtract()
  fs.createReadStream(p).pipe(extract.receiver)
  return new Promise((resolve, reject) => {
    const files: Record<string, Buffer> = {}
    extract.on('entry', (head, file) => {
      files[head.name] = Buffer.from(file)
    })
    extract.on('finish', () => resolve(files))
    extract.on('error', reject)
  })
}

async function mockBuild<T extends Algorithm = never>(
  dir = 'public-assets-nest',
  options?: ViteCompressionPluginConfig<T, any>
) {
  const id = getId()
  await build({
    root: path.join(__dirname, 'fixtures', dir),
    plugins: [compression(options), tarball({ dest: path.join(dest, id) })],
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir: path.join(dist, id)
    }
  })
  return id
}

async function mockBuildwithoutCompression(dir: string, id: string, options: ViteTarballPluginOptions = {}) {
  const bundle = await build({
    root: path.join(__dirname, 'fixtures', dir),
    plugins: [tarball(options)],
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir: path.join(dist, id)
    }
  })
  return { id, bundle }
}

afterAll(async () => {
  await fsp.rm(dest, { recursive: true })
})

test('tarball', async () => {
  const ids = await Promise.all([
    mockBuild('public-assets-nest', { deleteOriginalAssets: true, skipIfLargerOrEqual: false }),
    mockBuild('public-assets-nest', { skipIfLargerOrEqual: false })
  ])
  await sleep(3000)
  const [diff1, diff2] = await Promise.all(ids.map((id) => readAll(path.join(dist, id))))
  const diff1Js = diff1.filter((v) => v.endsWith('.js.gz')).map((v) => zlib.unzipSync(fs.readFileSync(v)))
  const diff2Js = diff2.filter((v) => v.endsWith('.js')).map((v) => fs.readFileSync(v))
  // .deepEqual(diff1Js, diff2Js)
  expect(diff1Js).toStrictEqual(diff2Js)
  const [dest1, dest2] = await Promise.all(ids.map((id) => extract(path.join(dest, id + '.tar'))))
  for (const file in dest1) {
    if (file in dest2) {
      expect(dest1[file]).toStrictEqual(dest2[file])
    }
  }
})

test('tarball without compression', async () => {
  const { id, bundle } = await mockBuildwithoutCompression('normal', getId())
  const outputs = await extract(path.join(dist, id + '.tar'))
  if (typeof bundle === 'object' && 'output' in bundle) {
    for (const chunk of bundle.output) {
      if (chunk.fileName in outputs) {
        const act = Buffer.from(outputs[chunk.fileName])
        if (chunk.type === 'asset') {
          expect(act).toStrictEqual(Buffer.from(chunk.source))
        } else {
          expect(act).toStrictEqual(Buffer.from(chunk.code))
        }
      }
    }
  }
})

test('tarball specify output', async () => {
  const id = getId()
  await mockBuildwithoutCompression('public-assets-nest', id, { dest: path.join(dest, id) })
  const outputs = await extract(path.join(dest, id + '.tar'))
  expect(Object.keys(outputs).length > 0).toBeTruthy()
})
