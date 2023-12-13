import { runTest } from '../e2e'
import { name } from './package.json'

export default (async function () {
  const vite = await import('vite')
  runTest(name, {
    vite,
    compressOption: {
      deleteOriginalAssets: true
    }
  })
})()
