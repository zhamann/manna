import { ImportError } from "./errors"
import { PAGE_SIZE_LIMIT } from "./fetch-page"

/** Where to reach a Firecrawl API: Firecrawl Local, a self-hosted server, or Firecrawl Cloud. */
export interface FirecrawlConfig {
  apiUrl: string
  apiKey?: string
}

const TIMEOUT_MS = 45_000

/** The Firecrawl API set by `FIRECRAWL_API_URL` (and `FIRECRAWL_API_KEY`), if any. */
export function firecrawlFromEnv(
  env: Record<string, string | undefined> = process.env
): FirecrawlConfig | undefined {
  const apiUrl = env.FIRECRAWL_API_URL?.trim()
  if (!apiUrl) return undefined
  const apiKey = env.FIRECRAWL_API_KEY?.trim()
  return apiKey ? { apiUrl, apiKey } : { apiUrl }
}

/**
 * Has Firecrawl load the page at `url`, in a browser if the page needs one,
 * and returns its HTML. Firecrawl applies its own checks to the addresses it
 * connects to; Firecrawl Local refuses private ones unless told otherwise.
 */
export async function fetchRenderedPage(
  url: string,
  { apiUrl, apiKey }: FirecrawlConfig,
  timeoutMs = TIMEOUT_MS
): Promise<string> {
  let response: Response
  try {
    response = await fetch(new URL("v2/scrape", withSlash(apiUrl)), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        url,
        formats: ["rawHtml"],
        onlyMainContent: false,
        timeout: timeoutMs - 5_000,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw new ImportError("unreachable")
  }

  // HTML is escaped inside the JSON, so allow it room to grow.
  const body = await readLimited(response, 2 * PAGE_SIZE_LIMIT + 64 * 1024)
  if (!response.ok) throw new ImportError("unreachable")

  let data: unknown
  try {
    data = (JSON.parse(body) as { data?: unknown }).data
  } catch {
    throw new ImportError("unreachable")
  }
  const { rawHtml, blocked, metadata } = (data ?? {}) as {
    rawHtml?: unknown
    blocked?: unknown
    metadata?: { statusCode?: unknown }
  }
  if (blocked === true) throw new ImportError("refused")
  const status = metadata?.statusCode
  if (typeof status === "number" && (status < 200 || status >= 300)) {
    const refused = status === 401 || status === 403 || status === 429
    throw new ImportError(refused ? "refused" : "unreachable")
  }
  if (typeof rawHtml !== "string") throw new ImportError("not-a-page")
  if (Buffer.byteLength(rawHtml) > PAGE_SIZE_LIMIT) {
    throw new ImportError("too-large")
  }
  return rawHtml
}

function withSlash(apiUrl: string): string {
  return apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`
}

async function readLimited(response: Response, limit: number) {
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body?.cancel()
    throw new ImportError("too-large")
  }
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for await (const chunk of response.body ?? []) {
      size += chunk.length
      if (size > limit) throw new ImportError("too-large")
      chunks.push(chunk)
    }
  } catch (error) {
    await response.body?.cancel().catch(() => {})
    throw error instanceof ImportError ? error : new ImportError("unreachable")
  }
  return Buffer.concat(chunks).toString("utf-8")
}
