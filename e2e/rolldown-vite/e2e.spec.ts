import { describe } from 'vitest'
import { runTest } from '../e2e'
import { name } from './package.json'

describe('rolldown vite', async () => {
  const vitePackage = 'vite'
  // Keep this import non-literal to avoid loading every Vite version's types.
  const vite: unknown = await import(vitePackage)

  await runTest(name, {
    vite,
    orderedHooks: true,
    compressOption: {
      deleteOriginalAssets: true
    }
  })
})
