import path from 'path'
import fsp from 'fs/promises'
import test from 'ava'
import { build } from 'vite'
import type { ViteCompressionPluginConfigAlgorithm } from 'src/interface'
import { compression } from '../src'
import { readAll } from '../src/utils'
import type { Algorithm } from '../src'

const getId = () => Math.random().toString(32).slice(2, 10)
const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))

async function mockBuild<T extends Algorithm = never>(
  conf: ViteCompressionPluginConfigAlgorithm<T>,
  dir: string,
  single = false
) {
  const id = getId()
  await build({
    build: {
      rollupOptions: {
        output: !single
          ? [
              {
                dir: path.join(__dirname, 'temp', id)
              },
              {
                dir: path.join(__dirname, '.tmpl', id)
              }
            ]
          : {
              dir: path.join(__dirname, '.tmpl', id)
            }
      }
    },
    root: path.join(__dirname, 'fixtures', dir),
    plugins: [compression(conf)],
    logLevel: 'silent'
  })
  return id
}

const tempPath = path.join(__dirname, 'temp')
const tmplPath = path.join(__dirname, '.tmpl')

test.after(async () => {
  await fsp.rm(tempPath, { recursive: true })
  await fsp.rm(tmplPath, { recursive: true })
})

test('rollupOptions First', async (t) => {
  const id = await mockBuild({ deleteOriginalAssets: true, include: /\.(html)$/ }, 'dynamic')
  await sleep(3000)
  const r = await Promise.all([readAll(path.join(tempPath, id)), readAll(path.join(tmplPath, id))])
  const gz = r.map((v) => v.filter((s) => s.endsWith('.gz')))
  t.is(gz[0].length, 1)
  t.is(gz[1].length, 1)
})

test('rollupOptions with single output', async (t) => {
  const id = await mockBuild({ deleteOriginalAssets: true, include: /\.(html)$/ }, 'dynamic', true)
  await sleep(3000)
  const r = await readAll(path.join(tmplPath, id))
  const gz = r.filter((v) => v.endsWith('.gz'))
  t.is(gz.length, 1)
})

test('rollupOptions with multiple outputs', async (t) => {
  const id = await mockBuild({ deleteOriginalAssets: true, exclude: /\.(html)$/ }, 'public-assets-nest')
  await sleep(3000)
  const r = await readAll(path.join(tmplPath, id))
  const gz = r.filter((v) => v.endsWith('.gz'))
  t.is(gz.length, 6)
  const r2 = await readAll(path.join(tempPath, id))
  const gz2 = r2.filter((v) => v.endsWith('.gz'))
  t.is(gz2.length, 6)
})

test('skipIfLargerOrEqual', async (t) => {
  const id = await mockBuild({ deleteOriginalAssets: true, exclude: /\.(html)$/, skipIfLargerOrEqual: true }, 'optimization')
  await sleep(3000)
  const r = await readAll(path.join(tmplPath, id))
  const gz = r.filter((v) => v.endsWith('.gz'))
  t.is(gz.length, 2)
})
