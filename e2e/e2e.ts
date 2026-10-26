import fs from 'fs'
import http from 'http'
import path from 'path'
import { chromium } from 'playwright'
import type { Page } from 'playwright'
import sirv from 'sirv'
import { expect, test } from 'vitest'
import zlib from 'zlib'
import { compression } from '../src'
import { readAll } from '../src/shared'

interface E2EBuildConfig {
  root: string
  build: {
    manifest?: boolean,
    outDir: string
  }
  logLevel: 'silent'
  plugins: unknown[]
}

type ViteBuild = (config: E2EBuildConfig) => Promise<unknown>

type Server = http.Server & {
  ip: string
}

export interface TestOptions {
  vite: unknown
  compressOption?: Parameters<typeof compression>[number]
  orderedHooks?: boolean
}

function getViteBuild(vite: unknown): ViteBuild {
  if (typeof vite !== 'object' || vite === null || !('build' in vite) || typeof vite.build !== 'function') {
    throw new TypeError('Expected a Vite module with a build function')
  }
  return vite.build.bind(vite) as ViteBuild
}

function createGetter<T>(obj: T, key: string, getter: () => unknown) {
  Object.defineProperty(obj, key, {
    get: getter
  })
}

const defaultWd = __dirname

// generator assets
function prepareAssets(taskName: string, options: TestOptions) {
  const { vite, compressOption = {} } = options
  return getViteBuild(vite)({
    root: defaultWd,
    build: {
      outDir: path.join(defaultWd, 'dist', taskName)
    },
    logLevel: 'silent',
    plugins: [compression({ ...compressOption, include: [/\.(js)$/, /\.(css)$/] })]
  })
}

function createServer(taskName: string) {
  const server = http.createServer()
  const publicPath = path.join(defaultWd, 'dist', taskName)
  const assets = sirv(publicPath, { gzip: true })

  const handleRequest = (req: http.IncomingMessage, res: http.ServerResponse) => {
    assets(req, res, () => {
      res.statusCode = 404
      res.end(`404 Not Found: ${req.url}`)
    })
  }
  server.on('request', handleRequest)
  createGetter(server, 'ip', () => {
    const address = server.address()
    if (typeof address === 'string') { return address }
    if (!address) { throw new Error('Invalid data') }
    return `http://127.0.0.1:${address.port}`
  })
  server.listen(0)
  return { server: server as Server }
}

async function createChromeBrowser(server: Server) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const localUrl = server.ip

  return { page, localUrl }
}

async function expectTestCase(taskName: string, page: Awaited<Page>, localUrl: Awaited<string>) {
  const expect2 = new Promise((resolve) => {
    page.on('console', (message) => {
      if (message.type() === 'log' && message.text() === 'append child') {
        resolve(message.text())
      }
    })
  })

  test(`${taskName} page first load`, async () => {
    const waitLoad = page.waitForEvent('console', (m) => m.type() === 'log' && m.text() === 'load main process')
    await page.goto(localUrl)
    expect((await waitLoad).text()).toBe('load main process')
  })

  test(`${taskName} insert line`, async () => {
    await page.click('.button--insert')
    await page.waitForSelector('text=p-1', { timeout: 5000 })
    expect(await expect2).toBe('append child')
  })
  await page.goto(localUrl)
}

function registerBundleOrderTest(taskName: string, options: TestOptions) {
  test(`${taskName} compresses the final post-processed bundle`, async () => {
    const marker = '<!-- transformed by post hook -->'
    const output = path.join(defaultWd, 'dist', `${taskName}-bundle-order`)
    const transformBundle = function(_outputOptions: unknown, bundle: Record<string, { type: string, source?: string | Uint8Array }>) {
      const html = bundle['index.html']
      if (!html || html.type !== 'asset' || html.source === undefined) { return }
      const source = typeof html.source === 'string' ? html.source : Buffer.from(html.source).toString()
      html.source = source + marker
    }
    const postPlugin = {
      name: 'e2e-post-bundle-transform',
      enforce: 'post',
      generateBundle: options.orderedHooks
        ? { order: 'post', handler: transformBundle }
        : transformBundle
    }

    await getViteBuild(options.vite)({
      root: defaultWd,
      build: {
        manifest: true,
        outDir: output
      },
      logLevel: 'silent',
      plugins: [
        compression({ algorithms: ['gzip'], include: [/\.html$/, /\.json$/], skipIfLargerOrEqual: false }),
        postPlugin
      ]
    })

    const html = fs.readFileSync(path.join(output, 'index.html'))
    const compressedHtml = zlib.gunzipSync(fs.readFileSync(path.join(output, 'index.html.gz')))
    const files = await readAll(output)
    const compressedManifest = files.find((file) => file.endsWith('manifest.json.gz'))

    expect(html.toString()).toContain(marker)
    expect(compressedHtml.equals(html)).toBe(true)
    expect(compressedManifest).toBeDefined()
    expect(() => {
      JSON.parse(zlib.gunzipSync(fs.readFileSync(compressedManifest!)).toString())
    }).not.toThrow()
  })
}

export async function runTest(taskName: string, options: TestOptions) {
  registerBundleOrderTest(taskName, options)
  await prepareAssets(taskName, options)
  await new Promise((resolve) => setTimeout(resolve, 5000))
  const { server } = createServer(taskName)
  const { page, localUrl } = await createChromeBrowser(server)
  await expectTestCase(taskName, page, localUrl)
}
