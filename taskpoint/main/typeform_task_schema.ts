import { z } from "zod"

/**
 * Schema for scheduling a new task via Typeform submission.
 */
export const TaskFormSchema = z.object({
  taskName: z
    .string()
    .min(3, "Task name must have at least 3 characters")
    .max(100, "Task name must not exceed 100 characters")
    .transform(s => s.trim())
    .refine(s => /^[\w .:-]+$/.test(s), "Task name contains invalid characters"),
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
    .regex(
      /^(\*|[0-5]?\d)\s+(\*|[01]?\d|2[0-3])\s+(\*|[1-9]|[12]\d|3[01])\s+(\*|[1-9]|1[0-2])\s+(\*|[0-6])$/,
      "Invalid cron expression"
    ),
  enabled: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(5),
  description: z.string().max(200).optional(),
  timezone: z.string().optional()
})

export type TaskFormInput = z.infer<typeof TaskFormSchema>
