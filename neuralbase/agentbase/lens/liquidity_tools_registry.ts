import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Extended toolkit for liquidity analysis:
 * – fetch raw pool data
 * – run pool health / risk analysis
 * – utility helpers for execution and composition
 */
export const EXTENDED_LIQUIDITY_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction())
})

/**
 * Get a specific liquidity tool by key
 */
export function getLiquidityTool(key: string): Toolkit | undefined {
  return EXTENDED_LIQUIDITY_TOOLS[key]
}

/**
 * Run both fetch and health-check actions for a pool
 */
export async function runExtendedLiquidityAnalysis(poolId: string) {
  const fetcher = getLiquidityTool(`liquidityscan-${FETCH_POOL_DATA_KEY}`)
  const checker = getLiquidityTool(`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`)

  if (!fetcher || !checker) {
    throw new Error("Extended liquidity tools not available")
  }

  const rawData = await fetcher.execute({ poolId })
  const health = await checker.execute({ poolId, data: rawData })

  return { rawData, health }
}
