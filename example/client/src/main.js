import { createApp } from 'vue'
import App from './app.vue'
import '@fect-ui/themes'
import '@fect-ui/vue/dist/cjs/main.css'

import { seq } from './seq'

import('./dynamic').then((re) => console.log(re.d))

createApp(App).mount('#app')

console.log(seq)
