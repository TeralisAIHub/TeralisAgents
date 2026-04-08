export interface VolumePoint {
  timestamp: number
  volumeUsd: number
}

export interface SpikeEvent {
  timestamp: number
  volume: number
  spikeRatio: number
  baselineAvg?: number
  zScore?: number
}

export type DetectOptions = {
  /**
   * If provided, spikes with volume below this absolute USD value are ignored
   */
  minVolumeUsd?: number
  /**
   * Minimum milliseconds between consecutive spikes (debounce)
   */
  minGapMs?: number
  /**
   * Use "mean" (default) or "median" as the baseline estimator
   */
  baseline?: "mean" | "median"
}

/** Compute mean and standard deviation of a numeric array */
function meanStd(values: number[]): { mean: number; std: number } {
  const n = values.length || 1
  const mean = values.reduce((s, v) => s + v, 0) / n
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (n > 1 ? n : 1)
  return { mean, std: Math.sqrt(variance) }
}

/** Compute median of a numeric array (non-mutating) */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const arr = [...values].sort((a, b) => a - b)
  const mid = Math.floor(arr.length / 2)
  return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid]
}

/**
 * Detects spikes in trading volume compared to a rolling average window.
 * Backwards-compatible defaults:
 *  - windowSize = 10
 *  - spikeThreshold = 2.0 (current / average)
 * Extended via `options`:
 *  - minVolumeUsd, minGapMs, baseline estimator, z-score
 */
export function detectVolumeSpikes(
  points: VolumePoint[],
  windowSize: number = 10,
  spikeThreshold: number = 2.0,
  options: DetectOptions = {}
): SpikeEvent[] {
  const events: SpikeEvent[] = []
  if (!Array.isArray(points) || points.length === 0 || windowSize <= 0) return events

  const minVol = options.minVolumeUsd ?? 0
  const minGap = options.minGapMs ?? 0
  const useMedian = (options.baseline ?? "mean") === "median"

  // Pre-extract volumes for quick windowing
  const volumes = points.map(p => (Number.isFinite(p.volumeUsd) ? p.volumeUsd : 0))

  let lastSpikeTs = -Infinity

  // Use a sliding window sum to avoid O(n*k) work for mean baseline.
  // For median baseline, we still slice since correctness > complexity here.
  let runningSum = 0
  for (let i = 0; i < volumes.length; i++) {
    // build window [i - windowSize, i)
    if (i < windowSize) {
      runningSum += volumes[i]
      continue
    }

    const windowStart = i - windowSize
    let baselineAvg: number
    let windowValues: number[] | undefined

    if (useMedian) {
      // Build the window values for median and z-score
      windowValues = volumes.slice(windowStart, i)
      baselineAvg = median(windowValues)
    } else {
      // Maintain running sum for mean
      runningSum += volumes[i - 1]
      runningSum -= volumes[windowStart - 1] ?? 0
      baselineAvg = runningSum / windowSize
      // Build window values lazily only when needed for z-score
      windowValues = volumes.slice(windowStart, i)
    }

    const curr = volumes[i]
    const ratio = baselineAvg > 0 ? curr / baselineAvg : Infinity
    if (ratio >= spikeThreshold && curr >= minVol) {
      const ts = points[i].timestamp
      if (ts - lastSpikeTs >= minGap) {
        const { mean, std } = meanStd(windowValues!)
        const z = std > 0 ? (curr - mean) / std : Infinity
        events.push({
          timestamp: ts,
          volume: curr,
          spikeRatio: Math.round(ratio * 100) / 100,
          baselineAvg: Math.round(baselineAvg * 100) / 100,
          zScore: Math.round(z * 100) / 100
        })
        lastSpikeTs = ts
      }
    }
  }

  return events
}
