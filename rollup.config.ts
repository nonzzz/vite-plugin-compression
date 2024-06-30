import { builtinModules, createRequire } from 'module'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import { minify, swc } from 'rollup-plugin-swc3'

const _require = createRequire(import.meta.url)
const { dependencies } = _require('./package.json')

const external = [...Object.keys(dependencies), ...builtinModules]

export default defineConfig([
  {
    input: 'src/index.ts',
    external,
    output: [
      { file: 'dist/index.mjs', format: 'esm', exports: 'named' },
      { file: 'dist/index.js', format: 'cjs', exports: 'named' }
    ],
    plugins: [
      swc(),
      minify({ mangle: true, module: true, compress: true, sourceMap: true })
    ]
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts' },
    plugins: [dts()],
    external
  }
])
