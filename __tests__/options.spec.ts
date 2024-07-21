import path from 'path'
import fsp from 'fs/promises'
import { afterAll, expect, test } from 'vitest'

import type { Pretty, ViteCompressionPluginConfigAlgorithm } from '../src/interface'
import { compression } from '../src'
import { readAll } from '../src/shared'
import type { Algorithm } from '../src'

const getId = () => Math.random().toString(32).slice(2, 10)
const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))

let vite: typeof import('vite')

const tempPath = path.join(__dirname, 'tmp')
const tmplPath = path.join(__dirname, '.tmp')

async function mockBuild<T extends Algorithm = never>(
  conf: Pretty<ViteCompressionPluginConfigAlgorithm<T>>,
  dir: string,
  single = false
) {
  vite = await import('vite')
  conf.skipIfLargerOrEqual = conf.skipIfLargerOrEqual ?? false
  const id = getId()
  await vite.build({
    build: {
      rollupOptions: {
        output: !single
          ? [{ dir: path.join(tempPath, id) }, { dir: path.join(tmplPath, id) }]
          : { dir: path.join(tmplPath, id) }
      }
    },
    root: path.join(__dirname, 'fixtures', dir),
    plugins: [compression(conf)],
    logLevel: 'silent'
  })
  return id
}

afterAll(async () => {
  await fsp.rm(tempPath, { recursive: true })
  await fsp.rm(tmplPath, { recursive: true })
})

test('rollupOptions First', async () => {
  const id = await mockBuild({ deleteOriginalAssets: true, include: /\.(html)$/ }, 'dynamic')
  await sleep(3000)
  const r = await Promise.all([readAll(path.join(tempPath, id)), readAll(path.join(tmplPath, id))])
  const gz = r.map((v) => v.filter((s) => s.endsWith('.gz')))
  expect(gz[0].length).toBe(1)
  expect(gz[1].length).toBe(1)
})

test('rollupOptions with single output', async () => {
  const id = await mockBuild({ deleteOriginalAssets: true, include: /\.(html)$/ }, 'dynamic', true)
  await sleep(3000)
  const r = await readAll(path.join(tmplPath, id))
  const gz = r.filter((v) => v.endsWith('.gz'))
  expect(gz.length).toBe(1)
})

test('rollupOptions with multiple outputs', async () => {
  const id = await mockBuild({ deleteOriginalAssets: true, exclude: /\.(html)$/ }, 'public-assets-nest')
  await sleep(3000)
  const r = await readAll(path.join(tmplPath, id))
  const gz = r.filter((v) => v.endsWith('.gz'))
  expect(gz.length).toBe(6)
  const r2 = await readAll(path.join(tempPath, id))
  const gz2 = r2.filter((v) => v.endsWith('.gz'))
  expect(gz2.length).toBe(6)
})

test('skipIfLargerOrEqual', async () => {
  const id = await mockBuild(
    { deleteOriginalAssets: true, exclude: /\.(html)$/, skipIfLargerOrEqual: true },
    'optimization'
  )
  await sleep(3000)
  const r = await readAll(path.join(tmplPath, id))
  const gz = r.filter((v) => v.endsWith('.gz'))
  expect(gz.length).toBe(2)
})
