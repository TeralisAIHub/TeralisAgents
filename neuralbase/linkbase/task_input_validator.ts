import { z } from "zod"

/**
 * Schema for scheduling a new task via Typeform submission.
 * Validates essential fields: task name, type, parameters, and cron expression.
 */
export const TaskFormSchema = z.object({
  taskName: z
    .string()
    .min(3, "Task name must have at least 3 characters")
    .max(100, "Task name cannot exceed 100 characters"),
  taskType: z.enum(["anomalyScan", "tokenAnalytics", "whaleMonitor", "liquidityCheck", "priceAlert"]),
  parameters: z
    .record(z.string(), z.string())
    .refine(obj => Object.keys(obj).length > 0, "Parameters must include at least one key"),
  scheduleCron: z
    .string()
    .regex(
      /^(\*|[0-5]?\d) (\*|[01]?\d|2[0-3]) (\*|[1-9]|[12]\d|3[01]) (\*|[1-9]|1[0-2]) (\*|[0-6])$/,
      "Invalid cron expression"
    ),
  enabled: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(5),
  createdBy: z.string().optional(),
})

export type TaskFormInput = z.infer<typeof TaskFormSchema>

/**
 * Utility to validate raw input safely.
 */
export function validateTaskInput(raw: unknown): { success: boolean; data?: TaskFormInput; error?: string } {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join("; ") }
  }
  return { success: true, data: parsed.data }
}
