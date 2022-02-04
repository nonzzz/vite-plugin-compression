# Vite-Compression-Plugin

This is a compression plugin for vite. Use node stream cover bundle to zlib.

## WIP

- [x] support exclude option.
- [x] support threshold option.
- [] support algorithm option.
- [] support compressionOptions option.
- [] support filename option.
- [x] support deleteOriginalAssets option.
- [] support loginfo option.

## Options

| params                 | type                       | default           | description                                                                                                                                               |
| ---------------------- | -------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`              | `Array<string>`            | `[]`              | Exclude all assets matching any of these conditions,Details see[fast-glob](https://www.npmjs.com/package/fast-glob#how-to-exclude-directory-from-reading) |
| `threshold`            | `number`                   | `[]`              | Only assets bigger than this size are processed (in bytes)                                                                                                |
| `algorithm`            | `string`                   | `gzip`            | The compression algorithm/function                                                                                                                        |
| `compressionOptions`   | `Record<string,any>`       | `gzip`            | Compression options for `algorithm`                                                                                                                       |
| `filename`             | `string\|()=>string`       | `[path][base].gz` | The target asset filename                                                                                                                                 |
| `deleteOriginalAssets` | `boolean\|keep-source-map` | `false`           | Whether to delete the original assets or not                                                                                                              |

## LICENSE

[MIT](./LICENSE)

## Author

Kanno
