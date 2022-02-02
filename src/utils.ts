import path from 'path'
import fg from 'fast-glob'
import type { ViteCompressionPluginConfig } from './preset-config'
import fs from 'fs-extra'

type Regular = Pick<ViteCompressionPluginConfig, 'test' | 'include' | 'exclude'>

const normalizePath = (entry: string) => entry.replace(/\\/g, '/')

const isAbsolutePath = (entry: string) => (path.isAbsolute(entry) ? true : false)

const generatorPath = (entry: string, root = process.cwd()) => (isAbsolutePath(entry) ? entry : path.join(root, entry))

export const resolvePath = (entry: string, root = process.cwd()) => generatorPath(entry, root)

export const readGlobalFiles = async (entry: string, regular: Regular) => {
  const { test, include, exclude } = regular
  entry = normalizePath(path.join(entry, '**', '*'))
  const files = await fg(entry, { dot: true })
  return files
}

export const removeFiles = (
  files: string[],
  deleteOriginalAssets: ViteCompressionPluginConfig['deleteOriginalAssets']
): Promise<string> => {
  if (!deleteOriginalAssets) return
  const keepSourceMap = deleteOriginalAssets === 'keep-source-map'
  const sources = files.filter((_) => (keepSourceMap ? !_.endsWith('.map') : _))
  let flag = sources.length
  return new Promise((resolve, reject) => {
    sources.forEach(async (filePath) => {
      try {
        flag--
        await fs.remove(filePath)
      } catch (error) {
        reject(error)
      }
    })
    if (!flag) resolve('has remove all assets.')
  })
}
