import { name } from './package.json'
import { runTest } from '../e2e'

export default (async function () {
  const vite = await import('vite')
  runTest(name, {
    vite,
    compressOption: {
      deleteOriginalAssets: true,
    },
  })
})()
