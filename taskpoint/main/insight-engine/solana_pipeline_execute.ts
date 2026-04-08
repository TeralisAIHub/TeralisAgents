/**
 * Orchestrated token analysis pipeline
 * Steps:
 *  1) Analyze recent on-chain activity
 *  2) Analyze market depth
 *  3) Detect volume-based patterns
 *  4) Execute custom tasks via a simple execution engine
 *  5) Sign and verify the final payload
 */

/** Compute a fast deterministic checksum (FNV-1a 32-bit) for integrity tagging */
function fnv1a(text) {
  let hash = 0x811c9dc5 >>> 0
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return ("0000000" + hash.toString(16)).slice(-8)
}

/** Extract numeric, non-negative volumes from records safely */
function extractVolumes(records) {
  if (!Array.isArray(records)) return []
  return records
    .map(r => (r && typeof r.amount === "number" ? r.amount : null))
    .filter(v => typeof v === "number" && Number.isFinite(v) && v >= 0)
}

/** Simple timeout helper without randomness */
function withTimeout(promise, ms, label = "operation") {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/** Compute quick stats from a numeric array */
function stats(numbers) {
  const n = numbers.length
  if (!n) return { count: 0, avg: 0, max: 0, min: 0 }
  const sum = numbers.reduce((a, b) => a + b, 0)
  const avg = sum / n
  const max = numbers.reduce((a, b) => (b > a ? b : a), numbers[0])
  const min = numbers.reduce((a, b) => (b < a ? b : a), numbers[0])
  return { count: n, avg, max, min }
}

;(async () => {
  try {
    // 1) Analyze activity
    const activityAnalyzer = new TokenActivityAnalyzer("https://solana.rpc")
    const activityStart = Date.now()
    const records = await withTimeout(
      activityAnalyzer.analyzeActivity("MintPubkeyHere", 20),
      30000,
      "analyzeActivity"
    )
    const activityMs = Date.now() - activityStart

    // 2) Analyze depth
    const depthAnalyzer = new TokenDepthAnalyzer("https://dex.api", "MarketPubkeyHere")
    const depthStart = Date.now()
    const depthMetrics = await withTimeout(depthAnalyzer.analyze(30), 30000, "analyzeDepth")
    const depthMs = Date.now() - depthStart

    // 3) Detect patterns
    const volumes = extractVolumes(records)
    const volumeStats = stats(volumes)
    const patterns = detectVolumePatterns(volumes, 5, 100)

    // 4) Execute custom tasks
    const engine = new ExecutionEngine()
    engine.register("report", async (params) => ({ records: params.records.length }))
    engine.register("metrics", async (params) => {
      const vols = extractVolumes(params.records)
      const s = stats(vols)
      return { count: s.count, avgVolume: s.avg, maxVolume: s.max, minVolume: s.min }
    })
    engine.enqueue("task1", "report", { records })
    engine.enqueue("task2", "metrics", { records })
    const taskResults = await engine.runAll()

    // 5) Sign the results
    const signer = new SigningEngine()
    const payloadObj = {
      depthMetrics,
      patterns,
      taskResults,
      meta: {
        activityMs,
        depthMs,
        volumeStats
      }
    }
    const payload = JSON.stringify(payloadObj)
    const checksum = fnv1a(payload)
    const signature = await signer.sign(payload)
    const signatureValid = await signer.verify(payload, signature)

    if (!signatureValid) {
      throw new Error("Signature verification failed")
    }

    console.log({
      recordsCount: records?.length ?? 0,
      volumeStats,
      depthMetrics,
      patternsCount: Array.isArray(patterns) ? patterns.length : 0,
      taskResults,
      checksum,
      signatureValid
    })
  } catch (err) {
    console.error("Pipeline error:", err && err.message ? err.message : err)
  }
})()
