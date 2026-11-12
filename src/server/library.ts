import { Buffer } from "node:buffer"
import type { DatabaseSync } from "node:sqlite"

import { transaction } from "./database"
import { BACKUP_SIZE_LIMIT } from "./limits"

export interface Section {
  id: number
  name: string
}

export interface SectionWithRecipes extends Section {
  recipes: { id: number; title: string }[]
}

export interface RecipeInput {
  sectionId: number
  title: string
  description: string
  servings: string
  prepTime: string
  cookTime: string
  sourceUrl: string
  ingredients: string[]
  steps: string[]
  notes: string
}

export interface StoredRecipe extends RecipeInput {
  id: number
}

export interface Recipe extends StoredRecipe {
  sectionName: string
}

export type LibraryErrorCode =
  | "duplicate-section"
  | "section-not-empty"
  | "section-not-found"
  | "recipe-not-found"
  | "library-full"

export class LibraryError extends Error {
  constructor(readonly code: LibraryErrorCode) {
    super(code)
  }
}

// Extended SQLite result codes for the constraints the schema enforces.
const SQLITE_CONSTRAINT_FOREIGNKEY = 787
const SQLITE_CONSTRAINT_UNIQUE = 2067
// What SQLite reports when `ON DELETE RESTRICT` blocks a delete.
const SQLITE_CONSTRAINT_TRIGGER = 1811

function translate(
  error: unknown,
  codes: Partial<Record<number, LibraryErrorCode>>
): never {
  const code = codes[(error as { errcode?: number }).errcode ?? -1]
  throw code ? new LibraryError(code) : error
}

/**
 * Runs a change that can grow the library, undoing it if the library would no
 * longer fit in a backup that can be restored.
 */
function growing<T>(db: DatabaseSync, change: () => T): T {
  return transaction(db, () => {
    const result = change()
    // A restore sends the backup as compact JSON, so measure exactly that.
    const size = Buffer.byteLength(JSON.stringify(exportLibrary(db)))
    if (size > BACKUP_SIZE_LIMIT) throw new LibraryError("library-full")
    return result
  })
}

/** All sections with their recipes, both sorted by name. */
export function listSections(db: DatabaseSync): SectionWithRecipes[] {
  const sections = db
    .prepare("SELECT id, name FROM sections ORDER BY name COLLATE NOCASE")
    .all() as unknown as Section[]
  const recipes = db
    .prepare(
      "SELECT id, section_id, title FROM recipes ORDER BY title COLLATE NOCASE"
    )
    .all() as { id: number; section_id: number; title: string }[]

  return sections.map((section) => ({
    ...section,
    recipes: recipes
      .filter((recipe) => recipe.section_id === section.id)
      .map(({ id, title }) => ({ id, title })),
  }))
}

export function createSection(db: DatabaseSync, name: string): Section {
  try {
    return growing(db, () => {
      const { lastInsertRowid } = db
        .prepare("INSERT INTO sections (name) VALUES (?)")
        .run(name)
      return { id: Number(lastInsertRowid), name }
    })
  } catch (error) {
    translate(error, { [SQLITE_CONSTRAINT_UNIQUE]: "duplicate-section" })
  }
}

export function renameSection(db: DatabaseSync, id: number, name: string) {
  try {
    growing(db, () => {
      const { changes } = db
        .prepare("UPDATE sections SET name = ? WHERE id = ?")
        .run(name, id)
      if (changes === 0) throw new LibraryError("section-not-found")
    })
  } catch (error) {
    translate(error, { [SQLITE_CONSTRAINT_UNIQUE]: "duplicate-section" })
  }
}

/** Deletes an empty section; sections that still hold recipes are kept. */
export function deleteSection(db: DatabaseSync, id: number) {
  try {
    const { changes } = db.prepare("DELETE FROM sections WHERE id = ?").run(id)
    if (changes === 0) throw new LibraryError("section-not-found")
  } catch (error) {
    translate(error, { [SQLITE_CONSTRAINT_TRIGGER]: "section-not-empty" })
  }
}

interface RecipeRow {
  id: number
  section_id: number
  title: string
  description: string
  servings: string
  prep_time: string
  cook_time: string
  source_url: string
  ingredients: string
  steps: string
  notes: string
}

function fromRow(row: RecipeRow): StoredRecipe {
  return {
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    description: row.description,
    servings: row.servings,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    sourceUrl: row.source_url,
    ingredients: JSON.parse(row.ingredients),
    steps: JSON.parse(row.steps),
    notes: row.notes,
  }
}

function recipeParams(recipe: RecipeInput) {
  return {
    section_id: recipe.sectionId,
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    prep_time: recipe.prepTime,
    cook_time: recipe.cookTime,
    source_url: recipe.sourceUrl,
    ingredients: JSON.stringify(recipe.ingredients),
    steps: JSON.stringify(recipe.steps),
    notes: recipe.notes,
  }
}

export function getRecipe(db: DatabaseSync, id: number): Recipe | undefined {
  const row = db
    .prepare(
      `SELECT recipes.*, sections.name AS section_name
       FROM recipes JOIN sections ON sections.id = recipes.section_id
       WHERE recipes.id = ?`
    )
    .get(id) as (RecipeRow & { section_name: string }) | undefined
  return row && { ...fromRow(row), sectionName: row.section_name }
}

/** Inserts a recipe with the given id, or the next free one when null. */
function insertRecipe(
  db: DatabaseSync,
  recipe: RecipeInput,
  id: number | null
): number {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO recipes (id, section_id, title, description, servings,
         prep_time, cook_time, source_url, ingredients, steps, notes)
       VALUES (:id, :section_id, :title, :description, :servings,
         :prep_time, :cook_time, :source_url, :ingredients, :steps, :notes)`
    )
    .run({ ...recipeParams(recipe), id })
  return Number(lastInsertRowid)
}

export function createRecipe(db: DatabaseSync, recipe: RecipeInput): number {
  try {
    return growing(db, () => insertRecipe(db, recipe, null))
  } catch (error) {
    translate(error, { [SQLITE_CONSTRAINT_FOREIGNKEY]: "section-not-found" })
  }
}

export function updateRecipe(
  db: DatabaseSync,
  id: number,
  recipe: RecipeInput
) {
  try {
    growing(db, () => {
      const { changes } = db
        .prepare(
          `UPDATE recipes SET section_id = :section_id, title = :title,
             description = :description, servings = :servings,
             prep_time = :prep_time, cook_time = :cook_time,
             source_url = :source_url, ingredients = :ingredients,
             steps = :steps, notes = :notes
           WHERE id = :id`
        )
        .run({ ...recipeParams(recipe), id })
      if (changes === 0) throw new LibraryError("recipe-not-found")
    })
  } catch (error) {
    translate(error, { [SQLITE_CONSTRAINT_FOREIGNKEY]: "section-not-found" })
  }
}

export function deleteRecipe(db: DatabaseSync, id: number) {
  const { changes } = db.prepare("DELETE FROM recipes WHERE id = ?").run(id)
  if (changes === 0) throw new LibraryError("recipe-not-found")
}

/** A recipe as listed on the home page. */
export interface RecipeSummary {
  id: number
  title: string
  sectionName: string
}

const SUMMARY_COLUMNS = `recipes.id, recipes.title, sections.name AS sectionName
  FROM recipes JOIN sections ON sections.id = recipes.section_id`

/** Notes that a recipe was opened, for the recently viewed list. */
export function recordView(db: DatabaseSync, id: number, at = Date.now()) {
  db.prepare("UPDATE recipes SET viewed_at = ? WHERE id = ?").run(at, id)
}

/** Recipes opened most recently first; ones never opened are left out. */
export function listRecentlyViewed(
  db: DatabaseSync,
  limit: number
): RecipeSummary[] {
  return db
    .prepare(
      `SELECT ${SUMMARY_COLUMNS}
       WHERE recipes.viewed_at IS NOT NULL
       ORDER BY recipes.viewed_at DESC, recipes.id DESC
       LIMIT ?`
    )
    .all(limit) as unknown as RecipeSummary[]
}

/** The newest recipes first: each new recipe gets the highest id. */
export function listRecentlyAdded(
  db: DatabaseSync,
  limit: number
): RecipeSummary[] {
  return db
    .prepare(`SELECT ${SUMMARY_COLUMNS} ORDER BY recipes.id DESC LIMIT ?`)
    .all(limit) as unknown as RecipeSummary[]
}

export const BACKUP_FORMAT = "manna-backup"
export const BACKUP_VERSION = 1

/** The whole library as a portable file, ids included. */
export interface Backup {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  sections: Section[]
  recipes: StoredRecipe[]
}

export function exportLibrary(db: DatabaseSync): Backup {
  const sections = db
    .prepare("SELECT id, name FROM sections ORDER BY id")
    .all() as unknown as Section[]
  const recipes = db
    .prepare("SELECT * FROM recipes ORDER BY id")
    .all() as unknown as RecipeRow[]

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    sections,
    recipes: recipes.map(fromRow),
  }
}

/**
 * Replaces the whole library with a backup, keeping its ids so existing
 * links keep working. Nothing changes if any part of the backup is rejected.
 */
export function restoreLibrary(db: DatabaseSync, backup: Backup) {
  try {
    transaction(db, () => {
      db.exec("DELETE FROM recipes")
      db.exec("DELETE FROM sections")
      const insertSection = db.prepare(
        "INSERT INTO sections (id, name) VALUES (?, ?)"
      )
      for (const section of backup.sections) {
        insertSection.run(section.id, section.name)
      }
      for (const recipe of backup.recipes) insertRecipe(db, recipe, recipe.id)
    })
  } catch (error) {
    translate(error, {
      [SQLITE_CONSTRAINT_UNIQUE]: "duplicate-section",
      [SQLITE_CONSTRAINT_FOREIGNKEY]: "section-not-found",
    })
  }
}
