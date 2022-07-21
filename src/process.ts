import worker_threads from 'worker_threads'

/**
 *
 * see: https://nodejs.org/api/worker_threads.html#class-worker
 */

const DEFAULT_WD = process.cwd()

const workWithThread = (worker_threads: typeof import('worker_threads')) => {
  const { port1: mainPort, port2: workerPort } = new worker_threads.MessageChannel()
  const worker = new worker_threads.Worker(__filename, {
    workerData: { workerPort, DEFAULT_WD },
    transferList: [workerPort],
    execArgv: []
  })
  let nextId = 0
  let stoped = false
  
}
