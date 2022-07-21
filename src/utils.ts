import path from 'path'
import { normalizePath } from 'vite'
import fg from 'fast-glob'
import fs from 'fs-extra'

import type { Regular, ViteCompressionPluginConfig } from './interface'

const isAbsolutePath = (entry: string) => (path.isAbsolute(entry) ? true : false)

const generatorPath = (entry: string, root = process.cwd()) => (isAbsolutePath(entry) ? entry : path.join(root, entry))

export const resolvePath = (entry: string, root = process.cwd()) => generatorPath(entry, root)

export const readGlobalFiles = async (entry: string, regular: Regular) => {
  entry = normalizePath(path.join(entry, '**', '*'))
  const files = await fg(entry, { dot: true, ignore: regular })
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
    if (!flag) resolve('[vite-compression-plugin]: remove all assets sucess.')
  })
}

export const fromatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export const len = <T>(source?: T[] | string) => source.length
