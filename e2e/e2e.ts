import path from 'path'
import http from 'http'

import type { Vite2Instance } from './vite2/interface'
import type { Vite3Instance } from './vite3/interface'
import type { Vite4Instance } from './vite4/interface'

type ViteInstance = Vite2Instance | Vite3Instance | Vite4Instance

const defaultWd = __dirname
// generator assets
function prepareAssets(vite: Vite2Instance) {
  vite.build({
    root: __dirname
  })
}

function createServer() {
  const server = http.createServer()

  const handleRequest = (req: http.IncomingMessage, res: http.ServerResponse) => {
    //
  }

  server.on('request', handleRequest)

  return { server }
}

function createChromeBrowser() {}

export interface TestOptions {
  vite: ViteInstance
}

export async function runTest(taskName, options: TestOptions) {
  const { server } = createServer()
  await prepareAssets(options.vite)
  const browser = createChromeBrowser()
  server.listen(0)
  //
}
