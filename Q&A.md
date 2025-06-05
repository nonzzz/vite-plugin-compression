# Q & A

> What is this plugin do?

- It's a simple zlib binding for vite, not a code compressor or minifier. It helps you compress your bundle assets on your local machine to save your precious server memory and bandwidth.

> How do I know if I need this plugin?

- Normally, you won't need it for most scenarios. As mentioned above, we only use it to compress bundle assets on the client side. If your cloud server provider offers the same compression service (like CloudFlare, AWS CloudFront), you don't need it.

> How can I use it?

- There are two steps:
  1. Install this plugin and add it to your vite config, then build your application and upload your bundle assets to your server.
  2. Make sure you're using `nginx`, `apache`, or other proxy servers and configure them to serve pre-compressed files. For nginx, refer to the [gzip_static documentation](https://nginx.org/en/docs/http/ngx_http_gzip_static_module.html).

> Why `vite-plugin-compression2` not `vite-plugin-compression`?

- To be honest, the original plugin won't be maintained anymore, so I made a new one with better features and TypeScript support.

> How can I define a custom compression algorithm?

```ts
import { defineAlgorithm } from 'vite-plugin-compression2'

// Built-in algorithm with custom options
const gzipAlgorithm = defineAlgorithm('gzip', { level: 9 })

// Custom algorithm function
const customAlgorithm = defineAlgorithm(
  async (buffer, options) => {
    // Your custom compression logic
    return compressedBuffer
  },
  { customLevel: 5 }
)
```

> How can I generate multiple compressed assets with different compression algorithms?

```ts
import { defineConfig } from 'vite'
import { compression, defineAlgorithm } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    compression({
      algorithms: [
        'gzip',
        'brotliCompress',
        defineAlgorithm('deflate', { level: 9 })
      ]
    })
  ]
})
```

> Can `tarball` be used independently?

- Yes, you can use the tarball plugin without compression:

```ts
import { tarball } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    tarball({ dest: './dist/archive' })
  ]
})
```

> What's the difference between v1.x and v2.x?

- **v2.x** introduces major improvements:
  - Multiple algorithms support in a single plugin instance
  - `defineAlgorithm()` helper for better type safety
  - Custom algorithm function support
  - Better TypeScript types
  - See [Migration Guide](./MIGRATION_GUIDE.md) for details

> What algorithms are supported?

- **Built-in algorithms:**
  - `gzip` - Standard gzip compression
  - `brotliCompress` - Brotli compression (better ratio)
  - `deflate` - Deflate compression
  - `deflateRaw` - Raw deflate compression
- **Custom functions** - Implement your own compression logic

> How do I configure nginx to serve compressed files?

For nginx, add this to your configuration:

```nginx
# Enable gzip_static module
gzip_static on;

# Enable brotli_static if you have brotli module
brotli_static on;
```

> What file extensions are compressed by default?

The plugin compresses these file types by default:

- `.html`, `.xml`
- `.css`, `.js`, `.mjs`
- `.json`, `.svg`
- `.yaml`, `.yml`, `.toml`

You can customize this with the `include`/`exclude` options.

> How do I compress only large files?

Use the `threshold` option:

```ts
compression({
  threshold: 1024, // Only compress files larger than 1KB
  algorithms: ['gzip']
})
```

> Can I use different filename patterns?

Yes, use the `filename` option:

```ts
compression({
  algorithms: ['gzip'],
  filename: '[path][base].[hash].gz' // Custom pattern
})

// Or use a function for dynamic names
compression({
  algorithms: [defineAlgorithm('gzip')],
  filename: (id, { algorithm }) => {
    return algorithm === 'gzip' ? `${id}.gz` : `${id}.br`
  }
})
```

> How do I delete original files after compression?

```ts
compression({
  algorithms: ['gzip'],
  deleteOriginalAssets: true
})
```

> What's the performance impact?

- Compression happens during build time, not runtime
- Uses concurrent processing with CPU core optimization
- No impact on development server performance
- Build time increases slightly depending on file sizes

> How do I troubleshoot compression issues?

1. Check if files meet the `threshold` size requirement
2. Verify `include`/`exclude` patterns match your files
3. Ensure your server is configured to serve compressed files
4. Check build output for compression statistics
