import { defineConfig } from 'vite'
import { compression, tarball } from '../src'

export default defineConfig({
  plugins: [
    compression({
      include: [/\.(js)$/, /\.(css)$/],
      deleteOriginalAssets: true,
      skipIfLargerOrEqual: false,
      logLevel: 'silent'
    }),
    tarball()
  ]
})
