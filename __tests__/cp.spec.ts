import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'
import zlib from 'zlib'
import { build } from 'vite'
import test from 'ava'
import tar from 'tar-stream'
import { readAll } from '../src/utils'
import type { ViteCompressionPluginConfig } from '../src'
import { compression, cp } from '../src'

const getId = () => Math.random().toString(32).slice(2, 10)
const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))

const dist = path.join(__dirname, 'dist')
const dest = path.join(__dirname, '.dist')

function extract(p: string): Promise<Record<string, Buffer>> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract()
    const files: Record<string, Buffer> = {}
    extract.on('entry', (header, stream, next) => {
      let file = Buffer.alloc(0)
      stream.on('data', c => file = Buffer.concat([file, c]))
      stream.on('end', () => {
        files[header.name] = file
        next()
      })
      stream.resume()
    })
    extract.on('finish', () => resolve(files))
    extract.on('error', reject)
    fs.createReadStream(p).pipe(extract)
  })
}

async function mockBuild<T extends Algorithm = never>(dir = 'public-assets-nest', options?: ViteCompressionPluginConfig<T, any>) {
  const id = getId()
  await build({
    root: path.join(__dirname, 'fixtures', dir),
    plugins: [compression(options), cp({ dest: path.join(dest, id) })],
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir: path.join(dist, id)
    }
  })
  return id
}

test.after(async () => {
  await fsp.rm(dest, { recursive: true })
})

test('cp', async (t) => {
  const ids = await Promise.all([mockBuild('dynamic', { deleteOriginalAssets: true, skipIfLargerOrEqual: false }), mockBuild('dynamic')])
  await sleep(3000)
  const [diff1, diff2] = await Promise.all(ids.map((id) => readAll(path.join(dist, id))))
  const diff1Js = diff1.filter((v) => v.endsWith('.js.gz')).map((v) => zlib.unzipSync(fs.readFileSync(v)))
  const diff2Js = diff2.filter((v) => v.endsWith('.js')).map((v) => fs.readFileSync(v))
  t.deepEqual(diff1Js, diff2Js)
  const [dest1, dest2] = await Promise.all(ids.map((id) => extract(path.join(dest, id + '.tar.gz'))))
  for (const file in dest1) {
    if (file in dest2) {
      t.deepEqual(dest1[file], dest2[file])
    }
  }
})
