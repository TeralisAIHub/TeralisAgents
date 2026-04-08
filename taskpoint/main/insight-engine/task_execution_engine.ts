/**
 * Task execution engine: registers, queues, and runs tasks by type.
 */
type Handler = (params: any) => Promise<any>

export interface ExecutionResult {
  id: string
  result?: any
  error?: string
  startedAt: number
  finishedAt: number
  durationMs: number
}

export class ExecutionEngine {
  private handlers: Record<string, Handler> = {}
  private queue: Array<{ id: string; type: string; params: any }> = []

  /**
   * Register a handler for a given task type.
   */
  register(type: string, handler: Handler): void {
    this.handlers[type] = handler
  }

  /**
   * Enqueue a new task for later execution.
   */
  enqueue(id: string, type: string, params: any): void {
    if (!this.handlers[type]) {
      throw new Error(`No handler for type "${type}"`)
    }
    this.queue.push({ id, type, params })
  }

  /**
   * Run all queued tasks sequentially.
   * Returns detailed results with timing.
   */
  async runAll(): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = []
    while (this.queue.length) {
      const task = this.queue.shift()!
      const startedAt = Date.now()
      try {
        const data = await this.handlers[task.type](task.params)
        const finishedAt = Date.now()
        results.push({
          id: task.id,
          result: data,
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
        })
      } catch (err: any) {
        const finishedAt = Date.now()
        results.push({
          id: task.id,
          error: err.message,
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
        })
      }
    }
    return results
  }

  /**
   * Clear all pending tasks without running them.
   */
  clearQueue(): void {
    this.queue = []
  }

  /**
   * Get the number of queued tasks.
   */
  getQueueLength(): number {
    return this.queue.length
  }
}
