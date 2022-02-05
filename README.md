# Vite-Compression-Plugin

This is a compression plugin for vite. Use node stream.

## Install

```bash

$ yarn add vite-compression-plugin -D

# or

$ npm install vite-compression-plugin -D

```

## Usage

```js
import { defineConfig } from 'vite'

import Compression from 'vite-compression-plugin'

export default defineConfig({
  plugins: [
    // ...your plugin
    Compression()
  ]
})
```

## Options

| params                 | type                       | default | description                                                                                                                                               |
| ---------------------- | -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`              | `Array<string>`            | `[]`    | Exclude all assets matching any of these conditions,Details see[fast-glob](https://www.npmjs.com/package/fast-glob#how-to-exclude-directory-from-reading) |
| `threshold`            | `number`                   | `[]`    | Only assets bigger than this size are processed (in bytes)                                                                                                |
| `algorithm`            | `string`                   | `gzip`  | The compression algorithm/function                                                                                                                        |
| `compressionOptions`   | `Record<string,any>`       | `gzip`  | Compression options for `algorithm`                                                                                                                       |
| `deleteOriginalAssets` | `boolean\|keep-source-map` | `false` | Whether to delete the original assets or not                                                                                                              |
| `loginfo`              | `silent\|info`             | `info`  | consola compressed info                                                                                                                                   |

## LICENSE

[MIT](./LICENSE)

## Author

Kanno

```

```
