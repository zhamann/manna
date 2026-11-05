import { ImportError } from "./errors"
import { fetchPage, type FetchPageOptions } from "./fetch-page"
import { parseRecipe, type ImportedRecipe } from "./parse-recipe"

export { ImportError, type ImportErrorCode } from "./errors"
export type { ImportedRecipe } from "./parse-recipe"

/** Fetches the page at `url` and reads the recipe it describes. */
export async function importRecipe(
  url: string,
  options?: FetchPageOptions
): Promise<ImportedRecipe> {
  const recipe = parseRecipe(await fetchPage(url, options), url)
  if (!recipe) throw new ImportError("no-recipe")
  return recipe
}
