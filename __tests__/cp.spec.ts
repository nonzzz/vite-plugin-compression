import path from 'path'
import fsp from 'fs/promises'
import fs from 'fs'
import zlib from 'zlib'
import { build } from 'vite'
import test from 'ava'
import tar from 'tar'
import { compression, cp } from '../src'
import { len, readAll } from '../src/utils'

const getId = () => Math.random().toString(32).slice(2, 10)

const dist = path.join(__dirname, 'dist')
const dest = path.join(__dirname, '.dist')

async function mockBuild(dir = 'public-assets-nest') {
  const id = getId()
  await build({
    root: path.join(__dirname, 'fixtures', dir),
    plugins: [compression({ skipIfLargerOrEqual: false }), cp({ dest: path.join(dest, id) })],
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir: path.join(dist, id)
    }
  })
  return id
}

test.after(async () => {
  await fsp.rm(dist, { recursive: true })
  await fsp.rm(dest, { recursive: true })
})

test('cp', async (t) => {
  const id = await mockBuild('dynamic')
  const files = await readAll(path.join(dist, id))
  const destPath = path.join(dest, id)
  await fsp.mkdir(destPath, { recursive: true })
  await tar.extract({ file: `${destPath}.tar.gz`, cwd: destPath })
  const dests = await readAll(destPath)
  t.is(len(files), len(dests))
  const gz = files.filter(s => s.endsWith('.gz'))
  const diffGz = dests.filter(s => s.endsWith('.gz'))
  t.is(len(gz), len(diffGz))
  const diff1Js = files.filter((v) => v.endsWith('.js.gz')).map((v) => zlib.unzipSync(fs.readFileSync(v)))
  const diff2Js = dests.filter((v) => v.endsWith('.js')).map((v) => fs.readFileSync(v))
  t.deepEqual(diff1Js, diff2Js)
})
