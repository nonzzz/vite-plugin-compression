import path from 'path'
import fs from 'fs'

const normalizePath = (entry: string) => entry.replace(/\\/g, '/')

const isAbsolutePath = (entry: string) => (path.isAbsolute(entry) ? true : false)

const generatorPath = (entry: string, root = process.cwd()) => (isAbsolutePath(entry) ? entry : path.join(root, entry))

export const resolvePath = (entry: string, root = process.cwd()) => {
  entry = generatorPath(entry, root)
  entry = normalizePath(entry)
  return new Promise((resolve, rejecet) => {
    fs.access(entry, fs.constants.F_OK, (err) => {
      if (err) rejecet(err)
      resolve(entry)
    })
  })
}
