import fs from 'fs'
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

const namespace = '.tmpl_suite'

export function createDisk(p: string) {
  const dir = path.join(path.dirname(__dirname), namespace)
  const root = path.join(dir, p)

  fs.mkdirSync(root, { recursive: true })

  const destroy = () => {
    fs.rmSync(root, { recursive: true, force: true })
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
