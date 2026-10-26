import { describe } from 'vitest'
import { runTest } from '../e2e'
import { name } from './package.json'

describe('vite6', async () => {
  const vitePackage = 'vite'
  const vite: unknown = await import(vitePackage)

  await runTest(name, {
    vite,
    orderedHooks: true,
    compressOption: {
      deleteOriginalAssets: true
    }
  })
})
