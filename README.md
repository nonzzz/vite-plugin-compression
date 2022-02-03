# Vite-Compression-Plugin

This is a compression plugin for vite. Use node stream cover bundle to zlib.

## WIP

- [] support all options.
- [] support use stream.

## Options

| params                   | type                          | default           | description                                                                                                                                               |
| ------------------------ | ----------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **exclude**              | `Array<string>`               | `[]`              | Exclude all assets matching any of these conditions,Details see[fast-glob](https://www.npmjs.com/package/fast-glob#how-to-exclude-directory-from-reading) |
| **algorithm**            | `'string','function'`         | `gzip`            | The compression algorithm/function                                                                                                                        |
| **compressionOptions**   | `Record<string,any>`          | `gzip`            | Compression options for `algorithm`                                                                                                                       |
| **filename**             | `string\|()=>string`          | `[path][base].gz` | The target asset filename                                                                                                                                 |
| **deleteOriginalAssets** | `'boolean','keep-source-map'` | `false`           | Whether to delete the original assets or not                                                                                                              |

## LICENSE

[MIT](./LICENSE)

## Author

Kanno
