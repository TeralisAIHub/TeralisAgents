import { z } from "zod"

/**
 * Schema for scheduling a new task via Typeform submission.
 */
export const TaskFormSchema = z.object({
  taskName: z.string().min(3).max(100),
  taskType: z.enum([
    "anomalyScan",
    "tokenAnalytics",
    "whaleMonitor",
    "depthAnalysis",
    "patternDetection"
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
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  enabled: z.boolean().default(true),
  description: z.string().max(500).optional()
})

export type TaskFormInput = z.infer<typeof TaskFormSchema>
