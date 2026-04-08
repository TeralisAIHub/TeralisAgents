import { exec } from "child_process"

/**
 * Execute a shell command and return stdout.
 * Rejects with detailed error information if execution fails or times out.
 * @param command Shell command to run (e.g., "ls -la")
 * @param timeoutMs Timeout in milliseconds (default: 30s)
 * @param cwd Optional working directory
 * @param env Optional environment variables
 */
export function execCommand(
  command: string,
  timeoutMs: number = 30_000,
  cwd?: string,
  env?: NodeJS.ProcessEnv
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = exec(
      command,
      { timeout: timeoutMs, cwd, env },
      (error, stdout, stderr) => {
        if (error) {
          return reject(
            new Error(
              `Command failed with code ${error.code ?? "unknown"}: ${
                stderr || error.message
              }`
            )
          )
        }
        resolve(stdout.trim())
      }
    )

    // Handle unexpected termination
    proc.on("exit", code => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`))
      }
    })
  })
}

/**
 * Convenience wrapper: try executing a command, returning null on failure.
 */
export async function tryExecCommand(command: string, timeoutMs?: number): Promise<string | null> {
  try {
    return await execCommand(command, timeoutMs)
  } catch {
    return null
  }
}
