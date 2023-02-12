import fsp from 'fs/promises'
import path from 'path'

export function len<T>(source?: T[] | string | Uint8Array) {
  return source.length
}

// [path][base].ext
export function replaceFileName(staticPath: string, rule: string | ((id: string) => string)) {
  const series = staticPath.split('/')
  const base = series.pop()
  const fileNameTempalte = typeof rule === 'function' ? rule(staticPath) : rule
  let path = series.filter((_, idx) => idx === len(series) - 1).join('/')
  if (len(path)) path = path + '/'
  return fileNameTempalte.replace(/\[path\]/, path).replace(/\[base\]/, base)
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
