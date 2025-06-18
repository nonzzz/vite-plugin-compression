<p align="center">
<img src="https://socialify.git.ci/nonzzz/vite-plugin-compression/image?description=1&font=KoHo&language=1&logo=https%3A%2F%2Favatars.githubusercontent.com%2Fu%2F65625612%3Fs%3D200%26v%3D4&name=1&owner=1&pattern=Solid&theme=Auto" width="640" height="320" />
</p>

[![codecov](https://codecov.io/gh/nonzzz/vite-plugin-compression/branch/master/graph/badge.svg?token=NG4475OP6B)](https://codecov.io/gh/nonzzz/vite-compression-plugin)

## Install

```bash
$ yarn add vite-plugin-compression2 -D

# or

$ npm install vite-plugin-compression2 -D
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

| params                 | type                                          | default                                                                              | description                                                                                |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `include`              | `string \| RegExp \| Array<string \| RegExp>` | `/\.(html\|xml\|css\|json\|js\|mjs\|svg\|yaml\|yml\|toml)$/`                         | Include all assets matching any of these conditions.                                       |
| `exclude`              | `string \| RegExp \| Array<string \| RegExp>` | `-`                                                                                  | Exclude all assets matching any of these conditions.                                       |
| `threshold`            | `number`                                      | `0`                                                                                  | Only assets bigger than this size are processed (in bytes)                                 |
| `algorithms`           | `Algorithms`                                  | `['gzip', 'brotliCompress']`                                                         | Array of compression algorithms or defineAlgorithm results                                 |
| `filename`             | `string \| function`                          | `[path][base].gz` or `[path][base]. br` If algorithm is `zstd` be `[path][base].zst` | The target asset filename pattern                                                          |
| `deleteOriginalAssets` | `boolean`                                     | `false`                                                                              | Whether to delete the original assets or not                                               |
| `skipIfLargerOrEqual`  | `boolean`                                     | `true`                                                                               | Whether to skip the compression if the result is larger than or equal to the original file |

### Tarball Plugin Options

| params | type     | default | description                       |
| ------ | -------- | ------- | --------------------------------- |
| `dest` | `string` | `-`     | Destination directory for tarball |

## API

### `defineAlgorithm(algorithm, options?)`

Define a compression algorithm with options.

**Parameters:**

- `algorithm`: Algorithm name (`'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw' | 'zstandard'`) or custom function
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
