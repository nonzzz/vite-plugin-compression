import { build } from 'vite'
import test from 'ava'
import fs from 'fs-extra'
import compression from '../src'

import type { InlineConfig } from 'vite'
import path from 'path'

const defaultWd = __dirname

const conf: InlineConfig = {
  root: defaultWd,
  plugins: [compression()],
  configFile: false,
  publicDir: false,
  build: {
    lib: {
      entry: path.join(defaultWd, 'mock.js'),
      formats: ['cjs'],
      fileName: 'mock'
    },
    outDir: path.join(defaultWd, 'dist')
  }
}

const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))

test.serial('compress', async (t) => {
  await build(conf)
  t.is(fs.existsSync(path.join(defaultWd, 'dist/mock.cjs.js')), true)
  t.is(fs.existsSync(path.join(defaultWd, 'dist/mock.cjs.js.gz')), true)
  await fs.remove(path.join(defaultWd, 'dist'))
})

test.serial('threshold', async (t) => {
  conf.plugins = [compression({ threshold: 1024 })]
  await build(conf)
  t.is(fs.existsSync(path.join(defaultWd, 'dist/mock.cjs.js.gz')), false)
  await fs.remove(path.join(defaultWd, 'dist'))
})

test.serial('deleteOriginalAssets', async (t) => {
  conf.plugins = [compression({ deleteOriginalAssets: true })]
  await build(conf)
  await sleep(1000)
  t.is(fs.existsSync(path.join(defaultWd, 'dist/mock.cjs.js')), false)
  await fs.remove(path.join(defaultWd, 'dist'))
})
