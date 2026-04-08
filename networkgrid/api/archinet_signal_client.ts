export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export type ListOptions = {
  limit?: number
  cursor?: string
  type?: string
  since?: number // epoch ms
  until?: number // epoch ms
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  timeoutMs?: number
  headers?: Record<string, string>
}

/** Build a query string with defined values only */
function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    q.append(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}

/** Fetch with timeout using AbortController (no randomness) */
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs))
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Normalize JSON parsing errors */
async function toJsonSafe<T>(res: Response): Promise<T | undefined> {
  try {
    return (await res.json()) as T
  } catch {
    return undefined
  }
}

/**
 * Simple HTTP client for fetching and managing signals
 */
export class SignalApiClient {
  constructor(private baseUrl: string, private apiKey?: string, private defaultTimeoutMs: number = 15000) {}

  private getHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    if (extra) Object.assign(headers, extra)
    return headers
  }

  private async request<T>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const timeout = opts.timeoutMs ?? this.defaultTimeoutMs
    const init: RequestInit = {
      method: opts.method ?? "GET",
      headers: this.getHeaders(opts.headers),
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    }

    try {
      const res = await fetchWithTimeout(url, init, timeout)
      if (!res.ok) {
        const errBody = await toJsonSafe<any>(res)
        const msg = errBody?.error || `HTTP ${res.status}`
        return { success: false, error: msg, statusCode: res.status }
      }
      const data = (await toJsonSafe<T>(res)) as T
      return { success: true, data, statusCode: res.status }
    } catch (err: any) {
      const msg = err?.name === "AbortError" ? "Request timed out" : err?.message || "Request failed"
      return { success: false, error: msg }
    }
  }

  /** List signals with optional pagination and filters */
  async fetchAllSignals(options: ListOptions = {}): Promise<ApiResponse<Signal[]>> {
    const query = buildQuery({
      limit: options.limit,
      cursor: options.cursor,
      type: options.type,
      since: options.since,
      until: options.until
    })
    return this.request<Signal[]>(`/signals${query}`)
  }

  /** Retrieve a single signal by id */
  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    return this.request<Signal>(`/signals/${encodeURIComponent(id)}`)
  }

  /** Create a new signal (server assigns id/timestamp if not provided) */
  async createSignal(signal: Omit<Signal, "id" | "timestamp"> & Partial<Pick<Signal, "timestamp">>): Promise<ApiResponse<Signal>> {
    const body = { ...signal, timestamp: signal.timestamp ?? Date.now() }
    return this.request<Signal>("/signals", { method: "POST", body })
  }

  /** Update an existing signal by id (partial update) */
  async updateSignal(id: string, patch: Partial<Omit<Signal, "id">>): Promise<ApiResponse<Signal>> {
    return this.request<Signal>(`/signals/${encodeURIComponent(id)}`, { method: "PUT", body: patch })
  }

  /** Delete a signal by id */
  async deleteSignal(id: string): Promise<ApiResponse<null>> {
    const res = await this.request<null>(`/signals/${encodeURIComponent(id)}`, { method: "DELETE" })
    return res
  }

  /** Search signals by free-text query with optional filters */
  async searchSignals(queryText: string, options: ListOptions = {}): Promise<ApiResponse<Signal[]>> {
    const query = buildQuery({
      q: queryText,
      limit: options.limit,
      cursor: options.cursor,
      type: options.type,
      since: options.since,
      until: options.until
    })
    return this.request<Signal[]>(`/signals/search${query}`)
  }
}
