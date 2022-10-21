// For performance. I think we should need worker process.
// That's why need it. Because in past. us tasks is serial.
// Just for an example. When we have at least 1000 modules need
// compress. we should serial transform them. it's a long time task
// If we use the worker. Each worker who can up to 100 tasks.
// So only 10 worker to compress them. its' parallel. We can make
//  full use of cpu.
// vite-plugin-compress2 only work in the latest stage of the rollup.

import { EventEmitter } from 'stream'
import os from 'os'
import worker_threads from 'worker_threads'

// refer https://github.com/nodejs/node/issues/19022
const MAX_CPUS = (() => {
  const cpus = os.cpus() || { length: 1 }
  return Math.max(1, cpus.length - 1)
})()

interface ThreadsOptions {
  limit?: number
}

export class Threads extends EventEmitter {
  private _limit: number
  constructor(options: ThreadsOptions = {}) {
    super()
    this.limit = options.limit
  }

  get limit() {
    if (this._limit) return this._limit
    return MAX_CPUS
  }
  set limit(value) {
    this._limit = value
  }
}
