import path from 'node:path'
import { build, watch } from 'no-bump'

const defaultWd = process.cwd()

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const { dependencies } = require('./package.json')

const ensureService = (mode) => {
  switch (mode) {
    case 'dev':
      return watch
    case 'build':
      return build
    default:
      throw new Error('Invalid mode.')
  }
}

const getBundleConfig = (mode, other) => {
  /**
   * @type {import('no-bump').BumpOptions}
   */
  const config = {
    output: {
      extractHelpers: false,
      dts: mode === 'build',
      sourceMap: false,
      exports: 'named'
    },
    external: ['vite', ...Object.keys(dependencies)],
    clean: mode === 'build'
  }
  return { ...config, ...other }
}

function main() {
  ;(async () => {
    const argvs = process.argv.slice(2)
    try {
      const mode = argvs.length >= 1 ? argvs[argvs.length - 1] : 'build'

      const server = ensureService(mode)
      const config = getBundleConfig(mode, {
        input: path.join(defaultWd, 'src', 'index.ts')
      })

      await server(config)
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
  })()
}

main()
