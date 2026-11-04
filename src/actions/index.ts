import { ActionError, defineAction, type ActionErrorCode } from "astro:actions"
import { z } from "astro/zod"

import { getDatabase } from "@/server/database"
import {
  createSection,
  deleteSection,
  LibraryError,
  renameSection,
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
}
