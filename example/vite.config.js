import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { cdn } from 'vite-plugin-cdn2'
import { compression } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    vue(),
    cdn({ modules: ['vue', '@fect-ui/vue'] }),
    compression({
      include: [/\.(js)$/, /\.(css)$/],
      deleteOriginalAssets: true
    })
  ]
})
