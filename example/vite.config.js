import { defineConfig } from 'vite'
import { compression } from '../src'

export default defineConfig({
  plugins: [
    compression({
      include: [/\.(js)$/, /\.(css)$/],
      deleteOriginalAssets: true
    })
  ]
})
