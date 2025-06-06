import commonjs from '@rollup/plugin-commonjs'
import shim from '@rollup/plugin-esm-shim'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { builtinModules } from 'module'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import { minify, swc } from 'rollup-plugin-swc3'
import { adapter, analyzer } from 'vite-bundle-analyzer'
import pkg from './package.json' with { type: 'json' }

const external = [...builtinModules, ...Object.keys(pkg.dependencies)]

export default defineConfig([{
  input: 'src/index.ts',
  external,
  output: [
    { dir: 'dist', format: 'cjs', exports: 'named', entryFileNames: '[name].js' },
    { dir: 'dist', format: 'es', exports: 'named', entryFileNames: '[name].mjs' }
  ],
  plugins: [
    commonjs(),
    nodeResolve(),
    shim(),
    swc(),
    minify({ mangle: true, module: true, compress: true, sourceMap: process.env.ANALYZE === 'true' }),
    adapter(analyzer({ enabled: process.env.ANALYZE === 'true' }))
  ]
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
