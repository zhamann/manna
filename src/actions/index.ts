import { ActionError, defineAction, type ActionErrorCode } from "astro:actions"
import { z } from "astro/zod"

import { getDatabase } from "@/server/database"
import {
  ImportError,
  importRecipe,
  type ImportErrorCode,
} from "@/server/import"
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  createRecipe,
  createSection,
  deleteRecipe,
  deleteSection,
  LibraryError,
  renameSection,
  restoreLibrary,
  updateRecipe,
  type LibraryErrorCode,
} from "@/server/library"
import { RECIPE_LIMITS } from "@/server/limits"

const libraryErrors: Record<
  LibraryErrorCode,
  { code: ActionErrorCode; message: string }
> = {
  "duplicate-section": {
    code: "CONFLICT",
    message: "A section with that name already exists.",
  },
  "section-not-empty": {
    code: "CONFLICT",
    message: "Move or delete this section's recipes first.",
  },
  "section-not-found": {
    code: "NOT_FOUND",
    message: "That section no longer exists.",
  },
  "recipe-not-found": {
    code: "NOT_FOUND",
    message: "That recipe no longer exists.",
  },
  "library-full": {
    code: "CONTENT_TOO_LARGE",
    message:
      "Your library is too big to back up. Shorten or delete recipes to make room.",
  },
}

/** Runs a library call, reporting its domain errors as action errors. */
function library<T>(run: (db: ReturnType<typeof getDatabase>) => T): T {
  try {
    return run(getDatabase())
  } catch (error) {
    if (error instanceof LibraryError) {
      throw new ActionError(libraryErrors[error.code])
    }
    throw error
  }
}

const importErrors: Record<
  ImportErrorCode,
  { code: ActionErrorCode; message: string }
> = {
  "blocked-address": {
    code: "FORBIDDEN",
    message:
      "That address is on a private network. Import from a public website.",
  },
  unreachable: {
    code: "BAD_GATEWAY",
    message: "Couldn't load that page. Check the address and try again.",
  },
  refused: {
    code: "BAD_GATEWAY",
    message:
      "That site doesn't allow importing. Copy the recipe in yourself instead.",
  },
  "not-a-page": {
    code: "UNSUPPORTED_MEDIA_TYPE",
    message: "That address isn't a web page.",
  },
  "too-large": {
    code: "CONTENT_TOO_LARGE",
    message: "That page is too big to import.",
  },
  "no-recipe": {
    code: "UNPROCESSABLE_CONTENT",
    message:
      "Couldn't find a recipe on that page. Enter it yourself, or try another site.",
  },
}

const id = z.number().int().positive()
const sectionName = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(100, "Keep it under 100 characters.")

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max.toLocaleString("en-US")} characters.`)
const lines = z
  .array(text(RECIPE_LIMITS.line))
  .max(
    RECIPE_LIMITS.lines,
    `Keep the list under ${RECIPE_LIMITS.lines} entries.`
  )
  .transform((lines) => lines.filter(Boolean))

const webAddress = z.url({
  protocol: /^https?$/,
  error: "Enter a full web address, like https://example.com.",
})

const recipe = z.object({
  sectionId: id,
  title: text(RECIPE_LIMITS.title).min(1, "Enter a title."),
  description: text(RECIPE_LIMITS.description),
  servings: text(RECIPE_LIMITS.detail),
  prepTime: text(RECIPE_LIMITS.detail),
  cookTime: text(RECIPE_LIMITS.detail),
  sourceUrl: z.union([z.literal(""), webAddress]),
  ingredients: lines,
  steps: lines,
  notes: text(RECIPE_LIMITS.notes),
})

/**
 * A web address typed or pasted without its scheme, like `example.com/soup`,
 * gets `https://`. Checking for `://` keeps `example.com:8080` from reading
 * as a scheme.
 */
const pastedAddress = z.preprocess(
  (value) =>
    typeof value === "string" && !value.includes("://")
      ? `https://${value.trim()}`
      : value,
  z.string().trim().pipe(webAddress)
)

const unique = (ids: number[]) => new Set(ids).size === ids.length

const backup = z
  .object({
    format: z.literal(BACKUP_FORMAT, "This file isn't a Manna backup."),
    version: z.literal(
      BACKUP_VERSION,
      "This backup is from a newer version of the app."
    ),
    sections: z.array(z.object({ id, name: sectionName })),
    recipes: z.array(recipe.extend({ id })),
  })
  .refine(
    ({ sections, recipes }) =>
      unique(sections.map(({ id }) => id)) &&
      unique(recipes.map(({ id }) => id)),
    "The backup lists the same section or recipe twice."
  )

export const server = {
  importRecipe: defineAction({
    input: z.object({ url: pastedAddress }),
    handler: async ({ url }) => {
      try {
        return await importRecipe(url)
      } catch (error) {
        if (error instanceof ImportError) {
          throw new ActionError(importErrors[error.code])
        }
        throw error
      }
    },
  }),
  createSection: defineAction({
    input: z.object({ name: sectionName }),
    handler: ({ name }) => library((db) => createSection(db, name)),
  }),
  renameSection: defineAction({
    input: z.object({ id, name: sectionName }),
    handler: ({ id, name }) => library((db) => renameSection(db, id, name)),
  }),
  deleteSection: defineAction({
    input: z.object({ id }),
    handler: ({ id }) => library((db) => deleteSection(db, id)),
  }),
  createRecipe: defineAction({
    input: recipe,
    handler: (input) => ({ id: library((db) => createRecipe(db, input)) }),
  }),
  updateRecipe: defineAction({
    input: recipe.extend({ id }),
    handler: ({ id, ...input }) => library((db) => updateRecipe(db, id, input)),
  }),
  deleteRecipe: defineAction({
    input: z.object({ id }),
    handler: ({ id }) => library((db) => deleteRecipe(db, id)),
  }),
  restoreBackup: defineAction({
    input: backup,
    handler: (input) => library((db) => restoreLibrary(db, input)),
  }),
}
