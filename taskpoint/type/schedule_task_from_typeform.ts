import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"

type HandleResult = {
  success: boolean
  message: string
  taskId?: string
  details?: {
    taskName: string
    taskType: string
    scheduleCron: string
    createdAt: string
  }
}

/** Create a compact deterministic id from task attributes */
function makeTaskId(input: Pick<TaskFormInput, "taskName" | "taskType" | "scheduleCron" | "parameters">): string {
  const base = `${input.taskName}:${input.taskType}:${input.scheduleCron}:${JSON.stringify(
    input.parameters
  )}`
  // Simple 32-bit FNV-1a
  let hash = 0x811c9dc5 >>> 0
  for (let i = 0; i < base.length; i++) {
    hash ^= base.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `tsk_${hash.toString(16)}`
}

/** (Stub) Persist task to a store; replace with real DB call */
async function persistTask(record: {
  id: string
  payload: TaskFormInput
  createdAt: string
}): Promise<void> {
  // no-op persistence; integrate with your DB/scheduler here
  void record
}

/**
 * Processes a Typeform webhook payload to schedule a new task.
 */
export async function handleTypeformSubmission(raw: unknown): Promise<HandleResult> {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: `Validation error: ${parsed.error.issues.map(i => i.message).join("; ")}`
    }
  }

  const { taskName, taskType, parameters, scheduleCron } = parsed.data as TaskFormInput

  const createdAt = new Date().toISOString()
  const taskId = makeTaskId({ taskName, taskType, scheduleCron, parameters })

  await persistTask({
    id: taskId,
    payload: parsed.data as TaskFormInput,
    createdAt
  })

  return {
    success: true,
    message: `Task "${taskName}" scheduled with ID ${taskId}`,
    taskId,
    details: { taskName, taskType, scheduleCron, createdAt }
  }
}
