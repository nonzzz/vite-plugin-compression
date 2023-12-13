import path from 'path'
import http from 'http'
import test from 'ava'
import sirv from 'sirv'
import { chromium } from 'playwright'
import type { Page } from 'playwright'
import { compression } from '../src'

import type { Vite2Instance } from './vite2/interface'
import type { Vite3Instance } from './vite3/interface'
import type { Vite4Instance } from './vite4/interface'
import type { Vite5Instance } from './vite5/interface'

type ViteInstance = Vite2Instance | Vite3Instance | Vite4Instance | Vite5Instance

type Server = http.Server & {
  ip: string
}

export interface TestOptions {
  vite: ViteInstance
  compressOption?: Parameters<typeof compression>[number]
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
  vite.build({
    root: defaultWd,
    build: {
      outDir: path.join(defaultWd, 'dist', taskName)
    },
    logLevel: 'silent',
    plugins: [compression(compressOption) as any]
  })
}

function createServer(taskName: string) {
  const server = http.createServer()
  const publicPath = path.join(defaultWd, 'dist', taskName)
  const assets = sirv(publicPath, { gzip: true })

  const handleRequest = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    assets(req, res, () => {
      res.statusCode = 404
      res.end(`404 Not Found: ${req.url}`)
    })
  }
  server.on('request', handleRequest)
  createGetter(server, 'ip', () => {
    const address = server.address()
    if (typeof address === 'string') return address
    return `http://127.0.0.1:${address.port}`
  })
  server.listen(0)
  return { server: server as Server }
}

async function createChromeBrowser(server: Server) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const localUrl = server.ip
  page.goto(localUrl)

  return { page }
}

async function expectTestCase(taskName: string, page: Awaited<Page>) {
  const expect1 = new Promise((resolve) => {
    page.on('console', (message) => resolve(message.text()))
  })

  const expect2 = new Promise((resolve) => {
    page.on('console', (message) => {
      if (message.type() === 'log' && message.text() === 'append child') {
        resolve(message.text())
      }
    })
    ;(async () => {
      await page.click('.button--insert')
      await page.waitForSelector('text=Insert', { timeout: 5000 })
    })()
  })

  test(`${taskName} page first load`, async (t) => t.is(await expect1, 'load main process'))
  test(`${taskName} insert line`, async (t) => t.is(await expect2, 'append child'))
}

export async function runTest(taskName: string, options: TestOptions) {
  await prepareAssets(taskName, options)
  await new Promise((resolve) => setTimeout(resolve, 5000))
  const { server } = createServer(taskName)
  const { page } = await createChromeBrowser(server)
  await expectTestCase(taskName, page)
}
