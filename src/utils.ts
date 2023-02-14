import fsp from 'fs/promises'
import path from 'path'

export function len<T>(source?: T[] | string | Uint8Array) {
  return source.length
}

// [path][base].ext
// [path] is replaced with the directories to the original asset, included trailing
// [base] is replaced with the base ([name] + [ext]) of the original asset (image.png)
export function replaceFileName(staticPath: string, rule: string | ((id: string) => string)) {
  let template = typeof rule === 'function' ? rule(staticPath) : rule
  const { dir, base } = path.parse(staticPath)
  const p = dir ? dir + '/' : ''
  return template.replace(/\[path\]/, p).replace(/\[base\]/, base)
}

export function slash(path: string) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path)
  if (isExtendedLengthPath) return path
  return path.replace(/\\/g, '/')
}

export async function readAll(entry: string) {
  const final = []
  const readAllImpl = async (entry: string) =>
    Promise.all(
      (await fsp.readdir(entry)).map(async (dir) => {
        const p = path.join(entry, dir)
        if ((await fsp.stat(p)).isDirectory()) return readAllImpl(p)
        final.push(p)
        return p
      })
    )
  await readAllImpl(entry)
  return final as string[]
}
