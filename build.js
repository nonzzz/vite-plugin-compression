'use strict'

const fs = require('fs-extra')
const path = require('path')
const rollup = require('rollup')

const typescript = require('@rollup/plugin-typescript')

const { nodeResolve } = require('@rollup/plugin-node-resolve')

const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor')

const { dependencies } = require('./package.json')

const PROJECT_ENTRY = path.join(__dirname, 'src', 'index.ts')

const OUTPUT_DIR = path.join(__dirname, 'dist')

const API_EXTRACTOR = path.join(__dirname, 'api-extractor.json')

const DTS = 'vite-compression-plugin.d.ts'

const external = Object.keys(dependencies)

const generatorDeclaration = async () => {
  const bundle = await rollup.rollup({
    input: PROJECT_ENTRY,
    external,
    plugins: [
      typescript({
        rootDir: path.dirname(PROJECT_ENTRY),
        declaration: true,
        declarationMap: true,
        declarationDir: OUTPUT_DIR
      }),
      nodeResolve()
    ]
  })
  await bundle.write({
    dir: OUTPUT_DIR,
    format: 'es'
  })
  const extractorConfig = ExtractorConfig.loadFileAndPrepare(API_EXTRACTOR)
  const extractorResult = Extractor.invoke(extractorConfig, {
    localBuild: true,
    showVerboseMessages: true
  })
  if (extractorResult.succeeded) {
    console.log(`API Extractor completed successfully`)
  } else {
    console.error(
      `API Extractor completed with ${extractorResult.errorCount} errors` +
        ` and ${extractorResult.warningCount} warnings`
    )
    process.exitCode = 1
  }
  await Promise.all(
    fs.readdirSync(OUTPUT_DIR).map(async (file) => {
      if (file !== DTS) {
        await fs.remove(path.join(OUTPUT_DIR, file))
      }
    })
  )
}

const generatorCode = async (format, fileName) => {
  const bundle = await rollup.rollup({
    input: PROJECT_ENTRY,
    external,
    plugins: [typescript(), nodeResolve()]
  })

  await bundle.write({ file: path.join(OUTPUT_DIR, fileName), format, exports: 'auto' })
}

const build = async () => {
  await fs.remove(OUTPUT_DIR)
  await generatorDeclaration()

  await generatorCode('cjs', 'vite-compression-plugin.cjs.js')
  await generatorCode('esm', 'vite-compression-plugin.esm.js')
}

;(async () => {
  await build()
})()
