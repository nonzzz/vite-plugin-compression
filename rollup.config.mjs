import { builtinModules } from 'module'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import { swc } from 'rollup-plugin-swc3'
import { adapter, analyzer } from 'vite-bundle-analyzer'

const external = [...builtinModules]

export default defineConfig([{
  input: 'src/index.ts',
  external,
  output: [
    { dir: 'dist', format: 'cjs', exports: 'named', entryFileNames: '[name].js' },
    { dir: 'dist', format: 'es', exports: 'named', entryFileNames: '[name].mjs' }
  ],
  plugins: [swc(), adapter(analyzer({ enabled: process.env.ANALYZE === 'true' }))]
}, {
  input: {
    index: 'src/index.ts'
  },
  external,
  output: [
    { dir: 'dist', format: 'esm', entryFileNames: '[name].d.mts' },
    { dir: 'dist', format: 'cjs', entryFileNames: '[name].d.ts' }
  ],
  plugins: [
    dts()
  ]
}])
