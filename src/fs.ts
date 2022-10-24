import fsp from 'fs/promises'
import fs from 'fs'
import type { PathLike } from 'fs'

declare namespace FS {
  interface RealFs {
    stat: typeof fsp.stat
    remove: (path: PathLike) => Promise<void>
    exists: (path: PathLike) => Promise<boolean>
    existsSync: (path: PathLike) => boolean
  }
}

const fss: FS.RealFs = Object.create(null)

const def = (alias: string, func: unknown) =>
  Object.defineProperty(fss, alias, {
    enumerable: true,
    configurable: false,
    get: () => func
  })

const stat = fsp.stat

const remove = (path: PathLike) => fsp.rm(path, { recursive: true })

const exist = (path: PathLike) =>
  fsp
    .access(path, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)

const existsSync = fs.existsSync

def('stat', stat)
def('remove', remove)
def('exists', exist)
def('existsSync', existsSync)

export default fss
