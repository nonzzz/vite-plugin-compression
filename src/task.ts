import { len } from './utils'

class Queue {
  maxConcurrent: number
  queue: Array<() => Promise<void>>
  running: number
  errors: Array<Error>
  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent
    this.queue = []
    this.errors = []
    this.running = 0
  }

  enqueue(task) {
    this.queue.push(task)
    this.run()
  }

  async run() {
    while (this.running < this.maxConcurrent && this.queue.length) {
      const task = this.queue.shift()
      this.running++
      try {
        await task()
      } catch (error) {
        this.errors.push(error)
      } finally {
        this.running--
        this.run()
      }
    }
  }

  async wait() {
    while (this.running) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    if (len(this.errors)) throw new AggregateError(this.errors, 'task failed')
  }
}

export function createConcurrentQueue(max: number) {
  return new Queue(max)
}
