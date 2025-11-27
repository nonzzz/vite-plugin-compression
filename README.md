<p align="center">
<img src="https://socialify.git.ci/nonzzz/vite-plugin-compression/image?description=1&font=KoHo&language=1&logo=https%3A%2F%2Favatars.githubusercontent.com%2Fu%2F65625612%3Fs%3D200%26v%3D4&name=1&owner=1&pattern=Solid&theme=Auto" width="640" height="320" />
</p>

[![codecov](https://codecov.io/gh/nonzzz/vite-plugin-compression/branch/master/graph/badge.svg?token=NG4475OP6B)](https://codecov.io/gh/nonzzz/vite-compression-plugin)
[![Download](https://img.shields.io/npm/dm/vite-plugin-compression2)](https://www.npmjs.com/package/vite-plugin-compression2)

## Install

```bash
$ yarn add vite-plugin-compression2 -D

# or

$ npm install vite-plugin-compression2 -D

# or

$ pnpm add vite-plugin-compression2 -D
```

## Usage

### Basic Usage

```js
import { defineConfig } from 'vite'
import { compression } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    // ...your plugins
    compression()
  ]
})
```

### Multiple Algorithms

```js
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

### Custom Algorithm Function

```js
import { compression, defineAlgorithm } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    compression({
      algorithms: [
        defineAlgorithm(
          async (buffer, options) => {
            // Your custom compression logic
            return compressedBuffer
          },
          { customOption: true }
        )
      ]
    })
  ]
})
```

### With Tarball

```js
import { compression, tarball } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    compression(),
    // If you want to create a tarball archive, use tarball plugin after compression
    tarball({ dest: './dist/archive' })
  ]
})
```

## Options

### Compression Plugin Options

| params                 | type                                          | default                                                                                   | description                                                                                |
| ---------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `include`              | `string \| RegExp \| Array<string \| RegExp>` | `/\.(html\|xml\|css\|json\|js\|mjs\|svg\|yaml\|yml\|toml)$/`                              | Include all assets matching any of these conditions.                                       |
| `exclude`              | `string \| RegExp \| Array<string \| RegExp>` | `-`                                                                                       | Exclude all assets matching any of these conditions.                                       |
| `threshold`            | `number`                                      | `0`                                                                                       | Only assets bigger than this size are processed (in bytes)                                 |
| `algorithms`           | `Algorithms`                                  | `['gzip', 'brotliCompress']`                                                              | Array of compression algorithms or defineAlgorithm results                                 |
| `filename`             | `string \| function`                          | `[path][base].gz` or `[path][base]. br` If algorithm is `zstandard` be `[path][base].zst` | The target asset filename pattern                                                          |
| `deleteOriginalAssets` | `boolean`                                     | `false`                                                                                   | Whether to delete the original assets or not                                               |
| `skipIfLargerOrEqual`  | `boolean`                                     | `true`                                                                                    | Whether to skip the compression if the result is larger than or equal to the original file |
| `logLevel`             | `string`                                      | `info`                                                                                    | Control sdout info                                                                         |
| `artifacts`            | `function`                                    | `undefined`                                                                               | Sometimes you need to copy something to the final output. This option may help you.        |

### Tarball Plugin Options

| params | type     | default | description                       |
| ------ | -------- | ------- | --------------------------------- |
| `dest` | `string` | `-`     | Destination directory for tarball |

## API

### `defineAlgorithm(algorithm, options?)`

Define a compression algorithm with options.

**Parameters:**

- `algorithm`: Algorithm name (`'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw' | 'zstandard' | 'gz' | 'br' | 'brotli' | 'zstd'`) or custom function
- `options`: Compression options for the algorithm

**Returns:** `[algorithm, options]` tuple

**Examples:**

```js
// Built-in algorithm with default options
defineAlgorithm('gzip')

// Built-in algorithm with custom options
defineAlgorithm('gzip', { level: 9 })

// Brotli with custom quality
defineAlgorithm('brotliCompress', {
  params: {
    [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11
  }
})

// Custom algorithm function
defineAlgorithm(
  async (buffer, options) => {
    // Your compression implementation
    return compressedBuffer
  },
  { customOption: 'value' }
)
```

### Supported Algorithms

| Algorithm        | Aliases        | Extension | Node.js Support         | Description                                                    |
| ---------------- | -------------- | --------- | ----------------------- | -------------------------------------------------------------- |
| `gzip`           | `gz`           | `.gz`     | All versions            | Standard gzip compression with good balance of speed and ratio |
| `brotliCompress` | `brotli`, `br` | `.br`     | All versions            | Brotli compression with better compression ratio than gzip     |
| `deflate`        | -              | `.gz`     | All versions            | Deflate compression algorithm                                  |
| `deflateRaw`     | -              | `.gz`     | All versions            | Raw deflate compression without headers                        |
| `zstandard`      | `zstd`         | `.zst`    | >= 22.15.0 or >= 23.8.0 | Zstandard compression with excellent speed/ratio balance       |
| Custom Function  | -              | Custom    | All versions            | Your own compression algorithm implementation                  |

### Algorithm Types

The `algorithms` option accepts:

```typescript
type Algorithms =
  | Algorithm[] // ['gzip', 'brotliCompress']
  | DefineAlgorithmResult[] // [defineAlgorithm('gzip'), ...]
  | (Algorithm | DefineAlgorithmResult)[] // Mixed array
```

## Migration

If you're upgrading from v1.x, please check the [Migration Guide](./MIGRATION-GUIDE.md).

## Q & A

[FAQ](./Q&A.md)

### Examples

#### Basic Gzip Only

```js
compression({
  algorithms: ['gzip']
})
```

#### Multiple Algorithms with Custom Options

```js
compression({
  algorithms: [
    defineAlgorithm('gzip', { level: 9 }),
    defineAlgorithm('brotliCompress', {
      params: {
        [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11
      }
    })
  ]
})
```

#### Custom Filename Pattern

```js
compression({
  algorithms: ['gzip'],
  filename: '[path][base].[hash].gz'
})
```

#### Delete Original Files

```js
compression({
  algorithms: ['gzip'],
  deleteOriginalAssets: true
})
```

#### Size Threshold

```js
compression({
  algorithms: ['gzip'],
  threshold: 1000 // Only compress files larger than 1KB
})
```

## Production Deployment

After building your project with compressed assets, you need to configure your web server to serve these pre-compressed files.

### Nginx Configuration

```nginx
http {
    # Enable gzip_static module to serve pre-compressed .gz files
    gzip_static on;
    
    # Enable brotli_static to serve pre-compressed .br files
    # Requires ngx_brotli module: https://github.com/google/ngx_brotli
    brotli_static on;
    
    # Fallback to dynamic compression if static file not found
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    server {
        listen 80;
        server_name example.com;
        root /var/www/html;
        
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### Apache Configuration

```apache
# Enable mod_deflate for fallback dynamic compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Serve pre-compressed files
<IfModule mod_rewrite.c>
    RewriteEngine On
    
    # Serve .br file if it exists and client supports brotli
    RewriteCond %{HTTP:Accept-Encoding} br
    RewriteCond %{REQUEST_FILENAME}.br -f
    RewriteRule ^(.*)$ $1.br [L]
    
    # Serve .gz file if it exists and client supports gzip
    RewriteCond %{HTTP:Accept-Encoding} gzip
    RewriteCond %{REQUEST_FILENAME}.gz -f
    RewriteRule ^(.*)$ $1.gz [L]
</IfModule>

# Set correct content-type and encoding headers
<FilesMatch "\.js\.gz$">
    Header set Content-Type "application/javascript"
    Header set Content-Encoding "gzip"
</FilesMatch>

<FilesMatch "\.css\.gz$">
    Header set Content-Type "text/css"
    Header set Content-Encoding "gzip"
</FilesMatch>

<FilesMatch "\.js\.br$">
    Header set Content-Type "application/javascript"
    Header set Content-Encoding "br"
</FilesMatch>

<FilesMatch "\.css\.br$">
    Header set Content-Type "text/css"
    Header set Content-Encoding "br"
</FilesMatch>
```

## Framework Integration

### Next.js

For Next.js projects, add the plugin to your Vite configuration if using the App Router with custom server:

```js
// vite.config.js (for custom Next.js setups)
import { defineConfig } from 'vite'
import { compression } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    compression({
      algorithms: ['gzip', 'brotliCompress'],
      threshold: 1024
    })
  ]
})
```

For standard Next.js builds, configure in `next.config.js`:

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js handles compression differently
  // Use this plugin with custom server or static export
  output: 'export', // For static export
  compress: false // Disable Next.js built-in compression to use pre-compressed files
}

module.exports = nextConfig
```

### Nuxt 3

```js
// nuxt.config.ts
import { compression } from 'vite-plugin-compression2'

export default defineNuxtConfig({
  vite: {
    plugins: [
      compression({
        algorithms: ['gzip', 'brotliCompress'],
        threshold: 1024,
        exclude: [/\.map$/, /stats\.html$/]
      })
    ]
  }
})
```

### SvelteKit

```js
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite'
import { compression } from 'vite-plugin-compression2'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    sveltekit(),
    compression({
      algorithms: ['gzip', 'brotliCompress'],
      threshold: 1024
    })
  ]
})
```

### Astro

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import { compression } from 'vite-plugin-compression2'

export default defineConfig({
  vite: {
    plugins: [
      compression({
        algorithms: ['gzip', 'brotliCompress']
      })
    ]
  }
})
```

## Performance Tips

### Compression Level Selection

Choose compression levels based on your deployment strategy:

```js
compression({
  algorithms: [
    // Development: faster builds, lower compression
    defineAlgorithm('gzip', { level: 6 }), // Default level
    
    // Production: slower builds, better compression
    defineAlgorithm('gzip', { level: 9 }), // Maximum compression
    
    // Brotli: quality 10-11 recommended for static assets
    defineAlgorithm('brotliCompress', {
      params: {
        [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11
      }
    })
  ]
})
```

**Recommendations:**
- **Development/CI**: Level 6 (gzip) or Quality 4-6 (brotli) - faster builds
- **Production**: Level 9 (gzip) or Quality 10-11 (brotli) - best compression
- **Balance**: Level 7-8 (gzip) or Quality 8-9 (brotli) - good compromise

### File Size Threshold

Only compress files that benefit from compression:

```js
compression({
  threshold: 1024, // 1KB minimum - recommended
  algorithms: ['gzip', 'brotliCompress']
})
```

**Why use a threshold?**
- Files smaller than 1KB may not benefit from compression
- HTTP overhead can make tiny compressed files slower
- Saves build time and disk space

### Multi-Algorithm Strategy

Use both gzip and brotli for maximum compatibility and performance:

```js
compression({
  algorithms: [
    defineAlgorithm('gzip', { level: 9 }),      // Wide browser support (all browsers)
    defineAlgorithm('brotliCompress', {         // Better compression (modern browsers)
      params: {
        [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11
      }
    })
  ]
})
```

**Benefits:**
- Brotli: 15-20% better compression than gzip
- Gzip: Fallback for older browsers
- Server automatically serves the best format based on `Accept-Encoding` header

### Selective Compression

Compress only specific file types for optimal results:

```js
compression({
  include: [/\.(js|mjs|json|css|html|svg)$/], // Text-based files
  exclude: [/\.(png|jpg|jpeg|gif|webp|woff|woff2)$/], // Already compressed formats
  threshold: 1024
})
```

**File types that compress well:**
- JavaScript/TypeScript (`.js`, `.mjs`, `.ts`)
- CSS (`.css`)
- HTML (`.html`)
- JSON (`.json`)
- SVG (`.svg`)
- XML (`.xml`)

**File types to skip:**
- Images (`.png`, `.jpg`, `.webp`) - already compressed
- Fonts (`.woff`, `.woff2`) - already compressed
- Videos (`.mp4`, `.webm`) - already compressed

### Others

- If you want to analyze your bundle assets, try [vite-bundle-analyzer](https://github.com/nonzzz/vite-bundle-analyzer)
- `tarball` option `dest` means to generate a tarball somewhere
- `tarball` is based on the `ustar` format. It should be compatible with all popular tar distributions (gnutar, bsdtar etc)

### Node.js Version Requirements

- **gzip, brotliCompress, deflate, deflateRaw**: All Node.js versions supported
- **zstd**: Requires Node.js >= 22.15.0 or >= 23.8.0

> **Note**: If you try to use zstd compression on an unsupported Node.js version, the plugin will throw a helpful error message indicating the required version.

### Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/nonzzz/sponsors/sponsorkit/sponsors.svg">
    <img src="https://cdn.jsdelivr.net/gh/nonzzz/sponsors/sponsorkit/sponsors.svg"/>
  </a>
</p>

### LICENSE

[MIT](./LICENSE)

## Acknowledgements

[NWYLZW](https://github.com/NWYLZW)

### Author

[Kanno](https://github.com/nonzzz)
