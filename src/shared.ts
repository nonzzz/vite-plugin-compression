import fsp from 'fs/promises'
import path from 'path'

export function len<T extends ArrayLike<unknown>>(source: T) {
  return source.length
}

// [path][base].ext
// [path] is replaced with the directories to the original asset, included trailing
// [base] is replaced with the base ([name] + [ext]) of the original asset (image.png)
export function replaceFileName(staticPath: string, rule: string | ((id: string) => string)) {
  const template = typeof rule === 'function' ? rule(staticPath) : rule
  const { dir, base } = path.parse(staticPath)
  const p = dir ? dir + '/' : ''
  return template.replace(/\[path\]/, p).replace(/\[base\]/, base)
}

export function slash(path: string) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path)
  if (isExtendedLengthPath) { return path }
  return path.replace(/\\/g, '/')
}

export async function readAll(entry: string) {
  const paths = await Promise.all((await fsp.readdir(entry)).map((dir) => path.join(entry, dir)))
  let pos = 0
  const result: string[] = []
  while (pos !== len(paths)) {
    const dir = paths[pos]
    const stat = await fsp.stat(dir)
    if (stat.isDirectory()) {
      const dirs = await fsp.readdir(dir)
      paths.push(...dirs.map((sub) => path.join(dir, sub)))
    }
    if (stat.isFile()) {
      result.push(dir)
    }
    pos++
  }
  return result
}

const encoder = new TextEncoder()

export function stringToBytes(b: string | Uint8Array) {
  return typeof b === 'string' ? encoder.encode(b) : b
}

export function noop() {}
