import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Toolkit exposing liquidity-related actions:
 * – fetch raw pool data
 * – run health / risk analysis on a liquidity pool
 * – calculate liquidity metrics and imbalances
 */
export const LIQUIDITY_ANALYSIS_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction())
})

/**
 * Utility for composing multiple liquidity toolkits into one bundle.
 */
export function combineLiquidityToolkits(keys: string[]): Toolkit[] {
  return keys
    .map(key => LIQUIDITY_ANALYSIS_TOOLS[key])
    .filter((t): t is Toolkit => typeof t !== "undefined")
}

/**
 * Example: run all liquidity analysis actions for a given pool.
 */
export async function runFullLiquidityAnalysis(poolId: string) {
  const fetcher = LIQUIDITY_ANALYSIS_TOOLS[`liquidityscan-${FETCH_POOL_DATA_KEY}`]
  const checker = LIQUIDITY_ANALYSIS_TOOLS[`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]

  if (!fetcher || !checker) {
    throw new Error("Liquidity analysis tools not available")
  }

  const rawData = await fetcher.execute({ poolId })
  const health = await checker.execute({ poolId, data: rawData })

  return { rawData, health }
}
