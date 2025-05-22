import fs from 'fs'
import { createExtract } from 'tar-mini'
import { afterAll, assert, describe, expect, it } from 'vitest'
import zlib from 'zlib'
import { compression, tarball } from '../src'
import { createDisk, mockBuild } from './shared/kit.mjs'

function extract(p: string, gz = false): Promise<Record<string, Buffer>> {
  const extract = createExtract()
  if (gz) {
    fs.createReadStream(p).pipe(zlib.createUnzip()).pipe(extract.receiver)
  } else {
    fs.createReadStream(p).pipe(extract.receiver)
  }
  return new Promise((resolve, reject) => {
    const files: Record<string, Buffer> = {}
    extract.on('entry', (head, file) => {
      files[head.name] = Buffer.from(file)
    })
    extract.on('finish', () => resolve(files))
    extract.on('error', reject)
  })
}

describe('tarball', () => {
  const { root, destroy } = createDisk('tarball')

  afterAll(destroy)
  it('only use tarball plugin', async () => {
    const { output, bundle } = await mockBuild('normal', root, { plugins: [tarball()] })
    const extracted = await extract(output + '.tar')
    assert(typeof bundle === 'object' && 'output' in bundle)
    for (const chunk of bundle.output) {
      expect(extracted[chunk.fileName]).toStrictEqual(Buffer.from(chunk.type === 'asset' ? chunk.source : chunk.code))
    }
  })

  it('tar archive after compress', async () => {
    const { output, bundle } = await mockBuild('public-assets-nest', root, { plugins: [compression(), tarball()] })
    const { output: ouput2 } = await mockBuild('public-assets-nest', root, {
      plugins: [compression(), tarball({ gz: true })]
    })
    const extracted1 = await extract(output + '.tar')
    const extracted2 = await extract(ouput2 + '.tar.gz', true)
    assert(Object.keys(extracted1).length === Object.keys(extracted2).length)
    for (const filename in extracted1) {
      assert(Reflect.has(extracted2, filename))
      expect(extracted1[filename]).toStrictEqual(extracted2[filename])
    }
    assert(typeof bundle === 'object' && 'output' in bundle)
    for (const chunk of bundle.output) {
      if (chunk.fileName in extracted2) {
        expect(extracted2[chunk.fileName]).toStrictEqual(
          Buffer.from(chunk.type === 'asset' ? chunk.source : chunk.code)
        )
      }
    }
  })
})
