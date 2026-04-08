import { z } from "zod"

/**
 * Base types for any action.
 */

export type ActionSchema = z.ZodObject<z.ZodRawShape>

export interface ActionResponse<T> {
  /** Human-readable note about the execution outcome */
  notice: string
  /** The result data when execution succeeds (or partial data when partially successful) */
  data?: T
  /** Success flag for quick checks */
  ok: boolean
  /** Optional warnings collected during execution */
  warnings?: string[]
  /** Optional metadata for diagnostics */
  meta?: Record<string, unknown>
  /** Execution duration in milliseconds */
  durationMs?: number
}

export interface BaseAction<
  S extends ActionSchema,
  R,
  Ctx = unknown
> {
  /** Unique stable identifier */
  id: string
  /** Short, human-readable summary */
  summary: string
  /** Zod schema describing the expected payload */
  input: S
  /** Execute the action with validated payload and a context object */
  execute(args: { payload: z.infer<S>; context: Ctx }): Promise<ActionResponse<R>>
}

/** Convenience alias to extract the payload type from an ActionSchema */
export type InferPayload<S extends ActionSchema> = z.infer<S>

/** Result of validating an incoming payload against the schema */
export type ValidationResult<S extends ActionSchema> =
  | { success: true; value: z.infer<S> }
  | { success: false; errors: string[] }

/** Type guard for ActionResponse */
export function isActionResponse<T = unknown>(val: unknown): val is ActionResponse<T> {
  return typeof val === "object" && val !== null && "notice" in (val as any) && "ok" in (val as any)
}

/**
 * Abstract base implementation providing:
 * - schema-based validation
 * - timing & standardized ActionResponse envelope
 * Subclasses implement `run` with the core logic.
 */
export abstract class Action<
  S extends ActionSchema,
  R,
  Ctx = unknown
> implements BaseAction<S, R, Ctx> {
  readonly id: string
  readonly summary: string
  readonly input: S

  protected constructor(params: { id: string; summary: string; input: S }) {
    this.id = params.id
    this.summary = params.summary
    this.input = params.input
  }

  /** Validate payload against the action schema */
  protected validate(payload: unknown): ValidationResult<S> {
    const parsed = this.input.safeParse(payload)
    if (parsed.success) return { success: true, value: parsed.data }
    const errors = parsed.error.issues.map(i => i.message)
    return { success: false, errors }
  }

  /** Core logic to be implemented by subclasses */
  protected abstract run(args: { payload: z.infer<S>; context: Ctx }): Promise<R>

  /** Standardized execute wrapper with validation and timing */
  async execute(args: { payload: z.infer<S>; context: Ctx }): Promise<ActionResponse<R>> {
    const start = Date.now()
    const validation = this.validate(args.payload)
    if (!validation.success) {
      return {
        notice: `Validation failed: ${validation.errors.join("; ")}`,
        ok: false,
        meta: { id: this.id, summary: this.summary },
        durationMs: Date.now() - start
      }
    }

    try {
      const result = await this.run({ payload: validation.value, context: args.context })
      return {
        notice: "Action executed successfully",
        ok: true,
        data: result,
        meta: { id: this.id, summary: this.summary },
        durationMs: Date.now() - start
      }
    } catch (err: any) {
      return {
        notice: `Execution error: ${err?.message || "unknown error"}`,
        ok: false,
        meta: { id: this.id, summary: this.summary },
        durationMs: Date.now() - start
      }
    }
  }
}

/**
 * Factory helper to build a simple action without subclassing.
 */
export function createAction<
  S extends ActionSchema,
  R,
  Ctx = unknown
>(params: {
  id: string
  summary: string
  input: S
  run: (args: { payload: z.infer<S>; context: Ctx }) => Promise<R>
}): BaseAction<S, R, Ctx> {
  class InlineAction extends Action<S, R, Ctx> {
    private readonly _run: (args: { payload: z.infer<S>; context: Ctx }) => Promise<R>
    constructor() {
      super({ id: params.id, summary: params.summary, input: params.input })
      this._run = params.run
    }
    protected run(args: { payload: z.infer<S>; context: Ctx }): Promise<R> {
      return this._run(args)
    }
  }
  return new InlineAction()
}
