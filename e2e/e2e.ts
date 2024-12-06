import http from 'http'
import path from 'path'
import { chromium } from 'playwright'
import type { Page } from 'playwright'
import sirv from 'sirv'
import { expect, test } from 'vitest'
import { compression } from '../src'

import type { Vite2Instance } from './vite2/interface'
import type { Vite3Instance } from './vite3/interface'
import type { Vite4Instance } from './vite4/interface'
import type { Vite5Instance } from './vite5/interface'
import type { Vite6Instance } from './vite6/interface'

type ViteInstance = Vite2Instance | Vite3Instance | Vite4Instance | Vite5Instance | Vite6Instance

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
  return vite.build({
    root: defaultWd,
    build: {
      outDir: path.join(defaultWd, 'dist', taskName)
    },
    logLevel: 'silent',
    // @ts-expect-error vite type error
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
  const expect1 = new Promise((resolve) => {
    page.on('console', (message) => resolve(message.text()))
  })

  const expect2 = new Promise((resolve) => {
    page.on('console', (message) => {
      if (message.type() === 'log' && message.text() === 'append child') {
        resolve(message.text())
      }
    })
  })

  test(`${taskName} page first load`, async () => {
    expect(await expect1).toBe('load main process')
  })
  test(`${taskName} insert line`, async () => {
    await page.click('.button--insert')
    await page.waitForSelector('text=p-1', { timeout: 5000 })
    expect(await expect2).toBe('append child')
  })
  await page.goto(localUrl)
}

export async function runTest(taskName: string, options: TestOptions) {
  await prepareAssets(taskName, options)
  await new Promise((resolve) => setTimeout(resolve, 5000))
  const { server } = createServer(taskName)
  const { page, localUrl } = await createChromeBrowser(server)
  await expectTestCase(taskName, page, localUrl)
}
