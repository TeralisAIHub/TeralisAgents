/**
 * Unique identifier for the Solana Knowledge Agent.
 * Used across the system to ensure consistent invocation and routing.
 */
export const SOLANA_AGENT_ID = "solana-agent" as const

/**
 * Human-readable name for logging and debugging.
 */
export const SOLANA_AGENT_NAME = "Solana Knowledge Agent" as const

/**
 * Namespace to group Solana agent–related constants.
 */
export const SOLANA_AGENT_META = Object.freeze({
  id: SOLANA_AGENT_ID,
  name: SOLANA_AGENT_NAME,
  version: "1.0.0",
  description:
    "Provides authoritative answers about Solana protocols, tokens, tooling, RPCs, validators, and ecosystem news",
})
