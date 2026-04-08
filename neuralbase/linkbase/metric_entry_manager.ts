export interface MetricEntry {
  key: string
  value: number
  updatedAt: number
  source?: string
}

export class MetricsCache {
  private cache = new Map<string, MetricEntry>()

  get(key: string): MetricEntry | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: number, source?: string): void {
    this.cache.set(key, { key, value, updatedAt: Date.now(), source })
  }

  hasRecent(key: string, maxAgeMs: number): boolean {
    const entry = this.cache.get(key)
    return !!entry && Date.now() - entry.updatedAt < maxAgeMs
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  entries(): MetricEntry[] {
    return Array.from(this.cache.values())
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  values(): number[] {
    return Array.from(this.cache.values()).map(e => e.value)
  }

  size(): number {
    return this.cache.size
  }

  getOrDefault(key: string, defaultValue: number = 0): number {
    return this.cache.get(key)?.value ?? defaultValue
  }

  prune(maxAgeMs: number): void {
    const now = Date.now()
    for (const [k, v] of this.cache.entries()) {
      if (now - v.updatedAt >= maxAgeMs) {
        this.cache.delete(k)
      }
    }
  }
}
