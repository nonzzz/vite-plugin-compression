import { define } from 'no-bump'
import cleanUp from 'rollup-plugin-cleanup'

export default define({
  input: 'src/index.ts',
  output: {
    dts: true,
    exports: 'named',
  },
  clean: true,
  plugins: [cleanUp({ extensions: ['.ts'] })],
})
