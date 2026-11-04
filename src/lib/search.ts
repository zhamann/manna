import type { SectionWithRecipes } from "@/server/library"

/**
 * Narrows the sidebar to a search query. A section whose name matches keeps
 * all of its recipes; otherwise it keeps only the recipes whose titles match.
 */
export function filterSections(
  sections: SectionWithRecipes[],
  query: string
): SectionWithRecipes[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return sections

  const matches = (text: string) => text.toLocaleLowerCase().includes(needle)

  return sections.flatMap((section) => {
    if (matches(section.name)) return [section]
    const recipes = section.recipes.filter((recipe) => matches(recipe.title))
    return recipes.length > 0 ? [{ ...section, recipes }] : []
  })
}
