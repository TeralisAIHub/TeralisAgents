import { z } from "zod"

/**
 * Schema for scheduling a new task via Typeform submission.
 * - Validates task name, type, parameters, and cron schedule
 * - Adds optional flags (enabled, priority, description, timezone)
 * - Normalizes whitespace and enforces safe characters in taskName
 */

const CRON_5_FIELD_REGEX =
  /^(\*|[0-5]?\d)\s+(\*|[01]?\d|2[0-3])\s+(\*|[1-9]|[12]\d|3[01])\s+(\*|[1-9]|1[0-2])\s+(\*|[0-6])$/

export const TaskFormSchema = z.object({
  taskName: z
    .string()
    .min(3, "Task name must have at least 3 characters")
    .max(100, "Task name must not exceed 100 characters")
    .transform(s => s.trim())
    .refine(s => /^[\w .:,\-]+$/.test(s), "Task name contains invalid characters"),
  taskType: z.enum([
    "anomalyScan",
    "tokenAnalytics",
    "whaleMonitor",
    "liquidityCheck",
    "priceAlert"
  ]),
  parameters: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .refine(obj => Object.keys(obj).length > 0, "Parameters must include at least one key"),
  scheduleCron: z
    .string()
    .transform(s => s.trim().replace(/\s+/g, " "))
    .regex(CRON_5_FIELD_REGEX, "Invalid cron expression"),
  enabled: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(5),
  description: z.string().max(300).optional(),
  timezone: z.string().optional()
})

export type TaskFormInput = z.infer<typeof TaskFormSchema>

/**
 * Helper: validate and normalize a raw submission safely.
 */
export function validateTaskSubmission(
  raw: unknown
): { success: true; data: TaskFormInput } | { success: false; error: string } {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join("; ") }
  }
  return { success: true, data: parsed.data }
}
