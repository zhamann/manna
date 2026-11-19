import { ImportError, type ImportErrorCode } from "./errors"
import { fetchPage, type FetchPageOptions } from "./fetch-page"
import {
  fetchRenderedPage,
  firecrawlFromEnv,
  type FirecrawlConfig,
} from "./firecrawl"
import { parseRecipe, type ImportedRecipe } from "./parse-recipe"

export { ImportError, type ImportErrorCode } from "./errors"
export type { ImportedRecipe } from "./parse-recipe"

export interface ImportOptions extends FetchPageOptions {
  /**
   * The Firecrawl API to try when Manna can't read the recipe itself, or
   * `null` for none. Defaults to `FIRECRAWL_API_URL`.
   */
  firecrawl?: FirecrawlConfig | null
}

// The failures a browser might get past: a site turning away requests that
// don't come from one, a connection it drops, or a page that only has its
// recipe once its scripts run. The others would fail the same way again.
const retryable = new Set<ImportErrorCode>([
  "refused",
  "unreachable",
  "no-recipe",
])

/**
 * Fetches the page at `url` and reads the recipe it describes. If that
 * fails in a way a browser might not, and a Firecrawl API is configured,
 * Firecrawl loads the page and Manna reads that instead.
 */
export async function importRecipe(
  url: string,
  { firecrawl = firecrawlFromEnv(), ...options }: ImportOptions = {}
): Promise<ImportedRecipe> {
  try {
    return readRecipe(await fetchPage(url, options), url)
  } catch (error) {
    if (
      !firecrawl ||
      !(error instanceof ImportError) ||
      !retryable.has(error.code)
    ) {
      throw error
    }
    try {
      return readRecipe(await fetchRenderedPage(url, firecrawl), url)
    } catch {
      // Report what Manna saw itself; Firecrawl was only a second try.
      throw error
    }
  }
}

function readRecipe(html: string, url: string): ImportedRecipe {
  const recipe = parseRecipe(html, url)
  if (!recipe) throw new ImportError("no-recipe")
  return recipe
}
