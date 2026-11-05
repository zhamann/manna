import { splitLines } from "@/lib/lines"
import type { RecipeInput } from "@/server/library"
import { RECIPE_LIMITS } from "@/server/limits"

/** The parts of a recipe an import fills in; the cook picks the section. */
export type ImportedRecipe = Omit<RecipeInput, "sectionId" | "notes">

type Node = Record<string, unknown>

const jsonLdScript =
  /<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json\b[^>]*>([\s\S]*?)<\/script\s*>/gi

/**
 * Reads the schema.org Recipe that most recipe sites embed in their pages as
 * JSON-LD for search engines. Returns undefined when the page has none.
 */
export function parseRecipe(
  html: string,
  sourceUrl: string
): ImportedRecipe | undefined {
  for (const [, script] of html.matchAll(jsonLdScript)) {
    const node = findRecipe(parseJson(script))
    if (!node) continue

    const recipe: ImportedRecipe = {
      title: clip(text(node.name ?? node.headline), RECIPE_LIMITS.title),
      description: clip(text(node.description), RECIPE_LIMITS.description),
      servings: clip(servings(node.recipeYield), RECIPE_LIMITS.detail),
      prepTime: clip(duration(node.prepTime), RECIPE_LIMITS.detail),
      cookTime: clip(duration(node.cookTime), RECIPE_LIMITS.detail),
      sourceUrl,
      ingredients: lines(
        list(node.recipeIngredient ?? node.ingredients).map(text)
      ),
      steps: lines(instructions(node.recipeInstructions)),
    }
    if (recipe.title || recipe.ingredients.length || recipe.steps.length) {
      return recipe
    }
  }
  return undefined
}

function parseJson(script: string): unknown {
  const json = script
    .trim()
    .replace(/^(?:<!--|\/\/\s*<!\[CDATA\[)/, "")
    .replace(/(?:-->|\/\/\s*\]\]>)$/, "")
  try {
    return JSON.parse(json)
  } catch {
    return undefined
  }
}

/** Searches JSON-LD, including `@graph` and nested entities, for a Recipe. */
function findRecipe(value: unknown, depth = 0): Node | undefined {
  if (depth > 8 || !value || typeof value !== "object") return undefined
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipe(item, depth + 1)
      if (found) return found
    }
    return undefined
  }
  const node = value as Node
  if (list(node["@type"]).some((type) => typeName(type) === "Recipe")) {
    return node
  }
  for (const child of Object.values(node)) {
    const found = findRecipe(child, depth + 1)
    if (found) return found
  }
  return undefined
}

/** "Recipe", "schema:Recipe", and "https://schema.org/Recipe" alike. */
function typeName(type: unknown): string | undefined {
  return typeof type === "string" ? type.split(/[/:#]/).pop() : undefined
}

function list(value: unknown): unknown[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

/** Steps from a string, a list of strings, HowToSteps, or HowToSections. */
function instructions(value: unknown, depth = 0): string[] {
  if (depth > 4) return []
  if (typeof value === "string") return paragraphs(value)
  return list(value).flatMap((item): string[] => {
    if (typeof item === "string") return paragraphs(item)
    if (!item || typeof item !== "object") return []
    const node = item as Node
    if (node.itemListElement) {
      return instructions(node.itemListElement, depth + 1)
    }
    return paragraphs(str(node.text ?? node.name ?? node.description))
  })
}

/** Splits text that may be HTML into one entry per paragraph or line. */
function paragraphs(value: string): string[] {
  const broken = value.replace(/<\s*(?:br|\/p|\/li|\/div)\b[^>]*>/gi, "\n")
  return splitLines(decodeEntities(stripTags(broken)))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
}

function lines(values: string[]): string[] {
  return values
    .filter(Boolean)
    .slice(0, RECIPE_LIMITS.lines)
    .map((line) => clip(line, RECIPE_LIMITS.line))
}

/** One line of plain text, from a string or number that may hold HTML. */
function text(value: unknown): string {
  return decodeEntities(stripTags(str(value)))
    .replace(/\s+/g, " ")
    .trim()
}

function str(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  if (Array.isArray(value)) return str(value[0])
  if (value && typeof value === "object" && "@value" in value) {
    return str(value["@value"])
  }
  return ""
}

/** Prefers a yield with words ("4 servings") over a bare number ("4"). */
function servings(value: unknown): string {
  const yields = list(value).map(text).filter(Boolean)
  return yields.find((item) => /[a-z]/i.test(item)) ?? yields[0] ?? ""
}

const isoDuration =
  /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i

/** Turns an ISO 8601 duration like "PT1H30M" into "1 hr 30 min". */
function duration(value: unknown): string {
  const raw = text(value)
  const match = isoDuration.exec(raw)
  if (!match || raw.toUpperCase() === "P" || raw.toUpperCase() === "PT") {
    return raw
  }
  const [days, hours, minutes, seconds] = match
    .slice(1)
    .map((part) => Number(part ?? 0))
  const total = Math.round(days * 24 * 60 + hours * 60 + minutes + seconds / 60)
  if (total <= 0) return ""
  const h = Math.floor(total / 60)
  const m = total % 60
  return [h && `${h} hr`, m && `${m} min`].filter(Boolean).join(" ")
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value
}

/** Removes tags, spacing out block-level ones but not inline ones like <b>. */
function stripTags(value: string): string {
  return value
    .replace(/<\/?(?:p|br|li|ol|ul|div|h\d|tr|td|th)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "")
}

const namedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  deg: "°",
  frac12: "½",
  frac13: "⅓",
  frac14: "¼",
  frac23: "⅔",
  frac34: "¾",
  times: "×",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  ntilde: "ñ",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z][a-z\d]*));/gi,
    (entity, decimal, hex, name) => {
      if (decimal || hex) {
        const code = decimal ? Number(decimal) : parseInt(hex, 16)
        return code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : entity
      }
      return namedEntities[name.toLowerCase()] ?? entity
    }
  )
}
