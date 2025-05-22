import fs from 'fs'
import { create, destroy as _destory } from 'memdisk'
import path from 'path'
import url from 'url'
import { build } from 'vite'
import type { InlineConfig } from 'vite'

export const __filename = url.fileURLToPath(import.meta.url)

export const __dirname = path.dirname(__filename)

export function getId() {
  return Math.random().toString(36).substring(7)
}

export function sleep(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay))
}

const namespace = 'compression-suite-'

export function createDisk(p: string) {
  const dir = create.sync(namespace + p, 64 * 1024 * 1024, { quiet: false })
  const root = dir

  fs.mkdirSync(root, { recursive: true })

  const destroy = () => {
    _destory.sync(dir, { quiet: false })
  }

  return { destroy, root, dir }
}

export async function mockBuild(fixture: string, dest: string, options?: InlineConfig) {
  const id = getId()
  const output = path.join(dest, id)
  const bundle = await build({
    root: path.resolve(__dirname, '..', 'fixtures', fixture),
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir: output
    },
    ...options
  })

  return { output, bundle }
}
