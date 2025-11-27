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
  - See [Migration Guide](./MIGRATION-GUIDE.md) for details

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

> How to using artifacts?

```ts
compression({
  algorithms: ['gzip'],
  deleteOriginalAssets: true,
  artifacts: () => {
    return [
      {
        src: 'node_modules/xxx/y.js',
        // replace is an optional argument.
        replace: (dest, filename) => {
          // dest mean the vite output dir.
          // filename is the input file basename.
          return path.join(dest, `xzy.js`)
        }
      }
    ]
  }
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

> How do I verify compression is working?

**1. Check build output:**
Look for `.gz` or `.br` files in your dist folder after building.

**2. Check response headers:**
Use browser DevTools (Network tab) or curl:

```bash
curl -I -H "Accept-Encoding: gzip" https://your-site.com/main.js
# Should see: Content-Encoding: gzip

curl -I -H "Accept-Encoding: br" https://your-site.com/main.js
# Should see: Content-Encoding: br
```

**3. Compare file sizes:**
In browser DevTools Network tab:
- **Size**: Actual file size
- **Transferred**: Compressed size sent over network

**4. Test locally:**
```bash
# Build your project
npm run build

# Serve with a static server that supports pre-compressed files
npx serve dist
```

> What's the difference between static and dynamic compression?

**Static Compression (this plugin):**
- Files are compressed during build time
- ✅ Pros: No CPU overhead on server, faster response, consistent performance
- ❌ Cons: Requires more disk space, need to configure server

**Dynamic Compression (nginx gzip module):**
- Files are compressed on-the-fly for each request
- ✅ Pros: No build step needed, saves disk space, automatic
- ❌ Cons: CPU overhead on every request, slower first response, variable performance

**Recommendation:** Use static compression for production deployments to maximize performance.

> Should I use both gzip and brotli?

**Yes!** This is the recommended approach:

```js
compression({
  algorithms: ['gzip', 'brotliCompress']
})
```

**Why both?**
- **Brotli**: 15-20% better compression, supported by all modern browsers (Chrome, Firefox, Safari, Edge)
- **Gzip**: Universal fallback for older browsers and tools
- **Server behavior**: Automatically serves the best format based on client's `Accept-Encoding` header

**Compression comparison example:**
- Original: 1000 KB
- Gzip: ~250 KB (75% reduction)
- Brotli: ~200 KB (80% reduction)

> How much disk space will compressed files take?

**Typical compression ratios:**

| File Type  | Original | Gzip      | Brotli    |
|------------|----------|-----------|-----------|
| JavaScript | 100%     | 20-30%    | 15-25%    |
| CSS        | 100%     | 15-25%    | 10-20%    |
| HTML       | 100%     | 30-40%    | 25-35%    |
| JSON       | 100%     | 10-20%    | 5-15%     |
| SVG        | 100%     | 20-30%    | 15-25%    |

**Example:**
- Original bundle: 5 MB
- With gzip: +1.25 MB (25% of original)
- With brotli: +1 MB (20% of original)
- **Total disk usage**: ~7.25 MB (original + gzip + brotli)

**Trade-off:** 45% more disk space for 75-80% bandwidth savings.

> Can I use this with Docker?

**Yes!** Here's a complete example with nginx:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf for Docker:**

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Enable pre-compressed file serving
    gzip_static on;
    brotli_static on;
    
    # Fallback dynamic compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

> How do I handle CDN caching with compressed files?

**Configure your CDN to:**

1. **Respect Vary header:**
   - Ensure CDN caches different versions based on `Accept-Encoding`
   - Most CDNs (CloudFlare, AWS CloudFront, Fastly) handle this automatically

2. **Set cache-control headers:**

```nginx
location ~* \.(js|css|html)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}
```

3. **CloudFlare specific settings:**
   - Enable "Brotli" in Speed → Optimization
   - Enable "Auto Minify" (optional, works with pre-compressed files)
   - Cache Level: Standard or higher

4. **AWS CloudFront:**

```json
{
  "Compress": true,
  "ViewerProtocolPolicy": "redirect-to-https",
  "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
}
```

**Note:** When using CDN compression + pre-compressed files:
- CDN will serve your pre-compressed files if properly configured
- CDN's own compression acts as a fallback
- Pre-compressed files are typically better optimized (higher compression levels)

> What about source maps?

**Recommendation:** Don't compress source maps in production.

```js
compression({
  exclude: [/\.map$/], // Exclude source maps
  algorithms: ['gzip', 'brotliCompress']
})
```

**Why?**
- Source maps are only downloaded when DevTools is open
- They're already quite large and compress well dynamically if needed
- Saves build time and disk space

**Alternative:** If you must compress them:

```js
compression({
  include: [/\.(js|css|html|json|svg|map)$/],
  threshold: 10240, // Only compress maps larger than 10KB
  algorithms: ['gzip'] // Use only gzip for faster builds
})
```

> How does this affect build time?

**Typical impact:**

| Project Size | Files | Gzip Only | Gzip + Brotli |
|--------------|-------|-----------|---------------|
| Small        | <50   | +2-5s     | +5-10s        |
| Medium       | 50-200| +5-15s    | +15-30s       |
| Large        | >200  | +15-30s   | +30-60s       |

**Optimization tips:**

```js
compression({
  threshold: 1024, // Skip small files
  exclude: [/\.map$/, /\.txt$/], // Exclude unnecessary files
  algorithms: ['gzip'], // Use only gzip in CI for faster builds
  // Use brotli only for production deployments
})
```

**CI/CD strategy:**
- **Development builds:** Skip compression
- **Staging:** Gzip only (faster)
- **Production:** Gzip + Brotli (best compression)

> Can I compress files after build?

**Yes!** You can run compression as a separate step:

```json
{
  "scripts": {
    "build": "vite build",
    "compress": "node compress.js",
    "build:prod": "npm run build && npm run compress"
  }
}
```

**compress.js:**

```js
import { compression } from 'vite-plugin-compression2'
import { build } from 'vite'

// Run compression on existing dist folder
await build({
  build: {
    emptyOutDir: false // Don't delete existing files
  },
  plugins: [
    compression({
      algorithms: ['gzip', 'brotliCompress']
    })
  ]
})
```
