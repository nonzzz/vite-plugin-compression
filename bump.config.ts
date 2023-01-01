import { define } from 'no-bump'

const argvs = process.argv.slice(2)
const watch = argvs.includes('-w')
const clean = argvs.includes('-c')

export default define({
  input: 'src/index.ts',
  output: {
    dts: !watch,
    exports: 'named',
    file: ({ format }) => (format === 'cjs' ? '[name][ext]' : '[name].mjs')
  },
  watch,
  clean
})
