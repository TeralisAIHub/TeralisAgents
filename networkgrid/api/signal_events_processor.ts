import type { Signal } from "./SignalApiClient"

/**
 * Processes raw signals into actionable events and summaries.
 */
export class SignalProcessor {
  /**
   * Filter signals by type and recency.
   * @param signals Array of Signal
   * @param type Desired signal type
   * @param sinceTimestamp Only include signals after this time
   */
  filter(signals: Signal[], type: string, sinceTimestamp: number): Signal[] {
    return signals.filter(s => s.type === type && s.timestamp > sinceTimestamp)
  }

  /**
   * Aggregate signals by type, counting occurrences.
   * @param signals Array of Signal
   */
  aggregateByType(signals: Signal[]): Record<string, number> {
    return signals.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Aggregate signals by day (UTC), grouped into counts.
   */
  aggregateByDay(signals: Signal[]): Record<string, number> {
    return signals.reduce((acc, s) => {
      const day = new Date(s.timestamp).toISOString().slice(0, 10)
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Transform a signal into a human-readable summary string.
   */
  summarize(signal: Signal): string {
    const time = new Date(signal.timestamp).toISOString()
    return `[${time}] ${signal.type.toUpperCase()}: ${JSON.stringify(signal.payload)}`
  }

  /**
   * Group signals by type, returning arrays of signals for each type.
   */
  groupByType(signals: Signal[]): Record<string, Signal[]> {
    return signals.reduce((acc, s) => {
      if (!acc[s.type]) acc[s.type] = []
      acc[s.type].push(s)
      return acc
    }, {} as Record<string, Signal[]>)
  }

  /**
   * Compute basic statistics (min, max, avg timestamp) for signals of a given type.
   */
  statsForType(signals: Signal[], type: string): { count: number; minTs: number; maxTs: number; avgTs: number } {
    const filtered = signals.filter(s => s.type === type)
    if (filtered.length === 0) return { count: 0, minTs: 0, maxTs: 0, avgTs: 0 }
    const ts = filtered.map(s => s.timestamp)
    const minTs = Math.min(...ts)
    const maxTs = Math.max(...ts)
    const avgTs = ts.reduce((a, b) => a + b, 0) / ts.length
    return { count: filtered.length, minTs, maxTs, avgTs }
  }
}
