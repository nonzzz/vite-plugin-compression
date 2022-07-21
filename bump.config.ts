import { define } from 'no-bump'
import { dependencies } from './package.json'

export default define({
  input: 'src/index.ts',
  output: {
    dts: true,
    sourceMap: false,
    extractHelpers: false
  },
  external: ['vite', ...Object.keys(dependencies)]
})
