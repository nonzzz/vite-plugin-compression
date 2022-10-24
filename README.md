# vite-plugin-compression2

This is a compression plugin for vite.

### Install

```bash

$ yarn add vite-plugin-compression2 -D

# or

$ npm install vite-plugin-compression2 -D

```

### Usage

```js
import { defineConfig } from 'vite'

import { Compression } from 'vite-compression-plugin'

export default defineConfig({
  plugins: [
    // ...your plugin
    Compression()
  ]
})
```

### Options

| params                 | type                       | default | description                                                                                                                                               |
| ---------------------- | -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`              | `Array<string>`            | `[]`    | Exclude all assets matching any of these conditions,Details see[fast-glob](https://www.npmjs.com/package/fast-glob#how-to-exclude-directory-from-reading) |
| `threshold`            | `number`                   | `100`   | Only assets bigger than this size are processed (in bytes)                                                                                                |
| `algorithm`            | `string`                   | `gzip`  | The compression algorithm                                                                                                                                 |
| `compressionOptions`   | `Record<string,any>`       | `{}`    | Compression options for `algorithm`                                                                                                                       |
| `deleteOriginalAssets` | `boolean\|keep-source-map` | `false` | Whether to delete the original assets or not                                                                                                              |
| `loginfo`              | `silent\|info`             | `info`  | consola compressed info                                                                                                                                   |

### Q & A

> Why not vite-plugin-compression

- `vite-plugin-compression` no longer maintenance.

> Why vite-plugin-compression2

- `vite-plugin-compression` has minimal dependencies and better performance.

### LICENSE

[MIT](./LICENSE)

### Author

Kanno
