# Q & A

> What is this plugin do?

- It's a simple zlib binding for vite, No a code compressor or a mangle. It help you compress your bundle assets in your local machine to save your precious server memory.

> How do i know if i need this plugin?

- Normally, You won't need it for most scenes. Follow the previous answer we know we only using it to compress us bundle asset in client, 
So if some other clould server provider provide the smae server, you don't need it.

> How can i use it?

- There are two step. 1, install this plugin and add it into your vite config then build your application, upload your bundle assets to your server.
2, Makesure you have already using `tomcat` or `nginx` or others proxy server and find the relevant configuration tutorial. Like nignix, you can refer
[document](https://nginx.org/en/docs/http/ngx_http_gzip_module.html)

> Why `vite-plugin-compression2` not `vite-plugin-compression`?

- To be honest, It won't  maintain anymore, So that i made a new one.

> How can i define a custom compression algorithm?

```ts

import { defineCompressionOption } from 'vite-plugin-compression2'
import { ZlibOption } from 'zlib'

const opt = defineCompressionOption<ZlibOption>({ 
    // ...
})

```

> How can i generate multiple compressed assets with difference compression algorithm?

```ts

import { defineComponent } from 'vite'
import { compression } from 'vite-plugin-compression2'

export default defineComponent({
  plugins: [
    // ...your plugin
    compression(),
    compression({ algorithm: 'brotliCompress' })
  ]
})


```

> Can `tarball` be used only?

- Yes.