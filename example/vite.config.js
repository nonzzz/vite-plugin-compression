import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { compression } from 'vite-plugin-compression2'
export default defineConfig({
  plugins: [
    vue(),
    process.env.NODE_ENV === 'production' &&
      compression({
        include: [/\.(js)$/, /\.(css)$/],
        deleteOriginalAssets: true
      })
  ]
})
