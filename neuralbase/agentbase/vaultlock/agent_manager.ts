import type { BaseAction, ActionResponse } from "./baseAction"
import { z } from "zod"

interface AgentContext {
  apiEndpoint: string
  apiKey: string
  timeoutMs?: number
}

/**
 * Core Agent: manages registration and execution of actions.
 */
export class CoreAgent {
  private actions = new Map<string, BaseAction<any, any, AgentContext>>()

  register<S, R>(action: BaseAction<S, R, AgentContext>): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action with id "${action.id}" already registered`)
    }
    this.actions.set(action.id, action)
  }

  async invoke<R>(
    actionId: string,
    payload: unknown,
    ctx: AgentContext
  ): Promise<ActionResponse<R>> {
    const action = this.actions.get(actionId)
    if (!action) throw new Error(`Unknown action "${actionId}"`)
    try {
      // @ts-ignore
      return await action.execute({ payload, context: ctx }) as ActionResponse<R>
    } catch (err: any) {
      return {
        notice: `Execution failed: ${err.message}`,
      }
    }
  }

  listActions(): string[] {
    return Array.from(this.actions.keys())
  }

  clear(): void {
    this.actions.clear()
  }
}
