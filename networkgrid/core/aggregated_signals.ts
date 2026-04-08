import type { SightCoreMessage } from "./WebSocketClient"

export interface AggregatedSignal {
  topic: string
  count: number
  lastPayload: any
  lastTimestamp: number
  firstTimestamp?: number
}

export class SignalAggregator {
  private counts: Record<string, AggregatedSignal> = {}

  processMessage(msg: SightCoreMessage): AggregatedSignal {
    const { topic, payload, timestamp } = msg
    const entry =
      this.counts[topic] ||
      { topic, count: 0, lastPayload: null, lastTimestamp: 0, firstTimestamp: timestamp }
    entry.count += 1
    entry.lastPayload = payload
    entry.lastTimestamp = timestamp
    this.counts[topic] = entry
    return entry
  }

  getAggregated(topic: string): AggregatedSignal | undefined {
    return this.counts[topic]
  }

  getAllAggregated(): AggregatedSignal[] {
    return Object.values(this.counts)
  }

  /** Return topics sorted by count descending */
  getTopTopics(limit: number = 5): AggregatedSignal[] {
    return Object.values(this.counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /** Merge another aggregator into this one */
  merge(other: SignalAggregator): void {
    for (const entry of other.getAllAggregated()) {
      const existing = this.counts[entry.topic]
      if (!existing) {
        this.counts[entry.topic] = { ...entry }
      } else {
        existing.count += entry.count
        existing.lastPayload = entry.lastPayload
        existing.lastTimestamp = Math.max(existing.lastTimestamp, entry.lastTimestamp)
        if (!existing.firstTimestamp || entry.firstTimestamp! < existing.firstTimestamp) {
          existing.firstTimestamp = entry.firstTimestamp
        }
      }
    }
  }

  reset(): void {
    this.counts = {}
  }
}
