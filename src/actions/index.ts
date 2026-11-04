import { ActionError, defineAction, type ActionErrorCode } from "astro:actions"
import { z } from "astro/zod"

import { getDatabase } from "@/server/database"
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

const id = z.number().int().positive()
const sectionName = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(100, "Keep it under 100 characters.")

const text = (max: number) => z.string().trim().max(max)
const lines = z
  .array(text(2000))
  .max(200)
  .transform((lines) => lines.filter(Boolean))

const recipe = z.object({
  sectionId: id,
  title: text(200).min(1, "Enter a title."),
  description: text(2000),
  servings: text(100),
  prepTime: text(100),
  cookTime: text(100),
  sourceUrl: z.union([
    z.literal(""),
    z.url({
      protocol: /^https?$/,
      error: "Enter a full web address, like https://example.com.",
    }),
  ]),
  ingredients: lines,
  steps: lines,
  notes: text(5000),
})

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
