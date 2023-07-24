// This is a very simple task limit

class Queue {
  maxConcurrent: number
  queue: Array<()=> Promise<void>>
  running: number
  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent
    this.queue = []
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
  }
}

export function createConcurrentQueue(max: number) {
  return new Queue(max)
}
