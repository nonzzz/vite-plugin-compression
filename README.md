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

```js
import { defineConfig } from 'vite'

import { compression } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    // ...your plugin
    compression()
  ]
})
```

## Options

| params                 | type                                          | default           | description                                                    |
| ---------------------- | --------------------------------------------- | ----------------- | -------------------------------------------------------------- |
| `include`              | `string \| RegExp \| Array<string \| RegExp>` | `/\.(html\|xml\|css\|json\|js\|mjs\|svg)$/`             | Include all assets matching any of these conditions.           |
| `exclude`              | `string \| RegExp \| Array<string \| RegExp>` | `-`               | Exclude all assets matching any of these conditions.           |
| `threshold`            | `number`                                      | `0`               | Only assets bigger than this size are processed (in bytes)     |
| `algorithm`            | `string\| function`                           | `gzip`            | The compression algorithm                                      |
| `compressionOptions`   | `Record<string,any>`                          | `{}`              | Compression options for `algorithm`(details see `zlib module`) |
| `deleteOriginalAssets` | `boolean`                                     | `false`           | Whether to delete the original assets or not                   |
| `skipIfLargerOrEqual`  | `boolean`                                     | `true`            | Whether to skip the compression if the result is larger than or equal to the original file |
| `filename`             | `string`                                      | `[path][base].gz` | The target asset filename                                      |

## Q & A

> Why not vite-plugin-compression

- `vite-plugin-compression` no longer maintenance.

> Why vite-plugin-compression2

- `vite-plugin-compression2` has minimal dependencies and better performance.

> Can i custom the compression algorithm?

- Yes, you can see the unit test case.

> Can i generate multiple compressed assets with difference compression algorithm?

```js
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

> Can i create a tarball for all of assets after compressed?
- Yes, you can import `tarball` plugin from this package(>=1.0.0)
```js
import { defineComponent } from 'vite'
import { compression, tarball } from 'vite-plugin-compression2'

export default defineComponent({
  plugins: [
    // ...your plugin
    compression(),
    tarball()
  ]
})

```

### Others

If you want to analysis your bundle assets. Maybe you can try [vite-bundle-analyzer](https://github.com/nonzzz/vite-bundle-analyzer)

### LICENSE

[MIT](./LICENSE)

### Author

Kanno
