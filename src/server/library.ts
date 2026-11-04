import type { DatabaseSync } from "node:sqlite"

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

export interface Recipe extends RecipeInput {
  id: number
  sectionName: string
}

export type LibraryErrorCode =
  | "duplicate-section"
  | "section-not-empty"
  | "section-not-found"
  | "recipe-not-found"

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

function violates(error: unknown, errcode: number) {
  return (error as { errcode?: number }).errcode === errcode
}

function translate(
  error: unknown,
  errcode: number,
  code: LibraryErrorCode
): never {
  throw violates(error, errcode) ? new LibraryError(code) : error
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
    const { lastInsertRowid } = db
      .prepare("INSERT INTO sections (name) VALUES (?)")
      .run(name)
    return { id: Number(lastInsertRowid), name }
  } catch (error) {
    translate(error, SQLITE_CONSTRAINT_UNIQUE, "duplicate-section")
  }
}

export function renameSection(db: DatabaseSync, id: number, name: string) {
  try {
    const { changes } = db
      .prepare("UPDATE sections SET name = ? WHERE id = ?")
      .run(name, id)
    if (changes === 0) throw new LibraryError("section-not-found")
  } catch (error) {
    translate(error, SQLITE_CONSTRAINT_UNIQUE, "duplicate-section")
  }
}

/** Deletes an empty section; sections that still hold recipes are kept. */
export function deleteSection(db: DatabaseSync, id: number) {
  try {
    const { changes } = db.prepare("DELETE FROM sections WHERE id = ?").run(id)
    if (changes === 0) throw new LibraryError("section-not-found")
  } catch (error) {
    translate(error, SQLITE_CONSTRAINT_TRIGGER, "section-not-empty")
  }
}

interface RecipeRow {
  id: number
  section_id: number
  section_name: string
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

export function getRecipe(db: DatabaseSync, id: number): Recipe | undefined {
  const row = db
    .prepare(
      `SELECT recipes.*, sections.name AS section_name
       FROM recipes JOIN sections ON sections.id = recipes.section_id
       WHERE recipes.id = ?`
    )
    .get(id) as RecipeRow | undefined
  if (!row) return undefined

  return {
    id: row.id,
    sectionId: row.section_id,
    sectionName: row.section_name,
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

export function createRecipe(db: DatabaseSync, recipe: RecipeInput): number {
  try {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO recipes (section_id, title, description, servings,
           prep_time, cook_time, source_url, ingredients, steps, notes)
         VALUES (:section_id, :title, :description, :servings,
           :prep_time, :cook_time, :source_url, :ingredients, :steps, :notes)`
      )
      .run(recipeParams(recipe))
    return Number(lastInsertRowid)
  } catch (error) {
    translate(error, SQLITE_CONSTRAINT_FOREIGNKEY, "section-not-found")
  }
}

export function updateRecipe(
  db: DatabaseSync,
  id: number,
  recipe: RecipeInput
) {
  try {
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
  } catch (error) {
    translate(error, SQLITE_CONSTRAINT_FOREIGNKEY, "section-not-found")
  }
}

export function deleteRecipe(db: DatabaseSync, id: number) {
  const { changes } = db.prepare("DELETE FROM recipes WHERE id = ?").run(id)
  if (changes === 0) throw new LibraryError("recipe-not-found")
}
