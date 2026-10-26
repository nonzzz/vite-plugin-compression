import fs from 'fs'
import { create, destroy as _destory } from 'memdisk'
import os from 'os'
import path from 'path'
import url from 'url'
import { build } from 'vite'
import type { InlineConfig } from 'vite'
import { build as vite6Build } from 'vite6'
import type { InlineConfig as Vite6InlineConfig, Plugin as _Vite6Plugin } from 'vite6'

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
  let memoryDisk = true
  let dir: string
  try {
    dir = create.sync(namespace + p, 64 * 1024 * 1024, { quiet: false })
  } catch {
    memoryDisk = false
    dir = fs.mkdtempSync(path.join(os.tmpdir(), `${namespace}${p}-`))
  }
  const root = dir

  fs.mkdirSync(root, { recursive: true })

  const destroy = () => {
    if (memoryDisk) {
      _destory.sync(dir, { quiet: false })
    } else {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }

  return { destroy, root, dir }
}

export async function mockBuild(
  fixture: string,
  dest: string,
  options: InlineConfig,
  compact?: false
): Promise<{ output: string, bundle: Awaited<ReturnType<typeof build>> }>
export async function mockBuild(
  fixture: string,
  dest: string,
  options: Vite6InlineConfig,
  compact: true
): Promise<{ output: string, bundle: Awaited<ReturnType<typeof vite6Build>> }>
export async function mockBuild(
  fixture: string,
  dest: string,
  options: InlineConfig | Vite6InlineConfig = {},
  compact?: boolean
) {
  const id = getId()
  const output = path.join(dest, id)

  const fn = compact ? vite6Build : build
  const bundle = await fn({
    root: getFixturePath(fixture),
    configFile: false,
    logLevel: 'silent',
    ...options,
    // @ts-expect-error ignore
    build: {
      ...(options?.build || {}),
      outDir: output
    }
  })
  return { output, bundle }
}

export function typedForIn<T extends NonNullable<object>>(obj: T, callback: (key: keyof T, value: T[keyof T]) => void) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      callback(key satisfies keyof T, obj[key satisfies keyof T])
    }
  }
}

export function getFixturePath(fixture: string) {
  return path.resolve(__dirname, '..', 'fixtures', fixture)
}

export type Vite6Plugin = _Vite6Plugin
