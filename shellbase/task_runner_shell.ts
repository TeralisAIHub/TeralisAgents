import { execCommand, tryExecCommand } from "./execCommand"

export interface ShellTask {
  id: string
  command: string
  description?: string
  retries?: number
}

export interface ShellResult {
  taskId: string
  output?: string
  error?: string
  executedAt: number
  durationMs: number
  attempts: number
}

export class ShellTaskRunner {
  private tasks: ShellTask[] = []

  /**
   * Schedule a shell task for execution.
   */
  scheduleTask(task: ShellTask): void {
    this.tasks.push(task)
  }

  /**
   * Execute all scheduled tasks in sequence.
   * Supports retries for failed commands.
   */
  async runAll(): Promise<ShellResult[]> {
    const results: ShellResult[] = []
    for (const task of this.tasks) {
      const start = Date.now()
      let attempts = 0
      let success = false
      let output: string | undefined
      let error: string | undefined

      const maxRetries = task.retries ?? 0
      while (attempts <= maxRetries && !success) {
        attempts++
        try {
          output = await execCommand(task.command)
          success = true
        } catch (err: any) {
          error = err.message
        }
      }

      results.push({
        taskId: task.id,
        output,
        error,
        executedAt: start,
        durationMs: Date.now() - start,
        attempts,
      })
    }
    this.tasks = []
    return results
  }

  /**
   * Execute a single ad-hoc task without scheduling.
   */
  async runSingle(command: string): Promise<ShellResult> {
    const start = Date.now()
    const output = await tryExecCommand(command)
    return {
      taskId: `adhoc-${start}`,
      output: output ?? undefined,
      error: output ? undefined : "Execution failed",
      executedAt: start,
      durationMs: Date.now() - start,
      attempts: 1,
    }
  }

  /**
   * Clear all scheduled tasks without running them.
   */
  clearTasks(): void {
    this.tasks = []
  }
}
