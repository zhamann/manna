import { beforeEach, describe, expect, it } from "vitest"
import type { DatabaseSync } from "node:sqlite"

import { openDatabase } from "./database"
import {
  createRecipe,
  createSection,
  deleteRecipe,
  deleteSection,
  getRecipe,
  LibraryError,
  listSections,
  renameSection,
  updateRecipe,
  type RecipeInput,
} from "./library"

let db: DatabaseSync

beforeEach(() => {
  db = openDatabase(":memory:")
})

function recipe(sectionId: number, title: string): RecipeInput {
  return {
    sectionId,
    title,
    description: "",
    servings: "4",
    prepTime: "10 min",
    cookTime: "",
    sourceUrl: "",
    ingredients: ["2 cups flour", "1 egg"],
    steps: ["Mix.", "Bake."],
    notes: "",
  }
}

function errorCode(run: () => unknown) {
  try {
    run()
  } catch (error) {
    if (error instanceof LibraryError) return error.code
    throw error
  }
  return undefined
}

describe("sections", () => {
  it("lists sections and their recipes alphabetically", () => {
    const mains = createSection(db, "mains")
    const baking = createSection(db, "Baking")
    createRecipe(db, recipe(baking.id, "scones"))
    createRecipe(db, recipe(baking.id, "Banana bread"))

    expect(listSections(db)).toEqual([
      {
        id: baking.id,
        name: "Baking",
        recipes: [
          { id: expect.any(Number), title: "Banana bread" },
          { id: expect.any(Number), title: "scones" },
        ],
      },
      { id: mains.id, name: "mains", recipes: [] },
    ])
  })

  it("rejects names that differ only by case", () => {
    createSection(db, "Baking")
    const other = createSection(db, "Mains")

    expect(errorCode(() => createSection(db, "baking"))).toBe(
      "duplicate-section"
    )
    expect(errorCode(() => renameSection(db, other.id, "BAKING"))).toBe(
      "duplicate-section"
    )
  })

  it("renames a section", () => {
    const section = createSection(db, "Baking")
    renameSection(db, section.id, "Breads")

    expect(listSections(db).map(({ name }) => name)).toEqual(["Breads"])
  })

  it("deletes only empty sections", () => {
    const baking = createSection(db, "Baking")
    const empty = createSection(db, "Empty")
    createRecipe(db, recipe(baking.id, "Scones"))

    expect(errorCode(() => deleteSection(db, baking.id))).toBe(
      "section-not-empty"
    )
    deleteSection(db, empty.id)

    expect(listSections(db).map(({ name }) => name)).toEqual(["Baking"])
  })

  it("reports missing sections", () => {
    expect(errorCode(() => renameSection(db, 99, "Nope"))).toBe(
      "section-not-found"
    )
    expect(errorCode(() => deleteSection(db, 99))).toBe("section-not-found")
  })
})

describe("recipes", () => {
  it("round-trips every field", () => {
    const section = createSection(db, "Baking")
    const input = {
      ...recipe(section.id, "Scones"),
      description: "Flaky.",
      cookTime: "20 min",
      sourceUrl: "https://example.com/scones",
      notes: "Freeze well.",
    }
    const id = createRecipe(db, input)

    expect(getRecipe(db, id)).toEqual({
      ...input,
      id,
      sectionName: "Baking",
    })
  })

  it("updates a recipe, including moving it to another section", () => {
    const baking = createSection(db, "Baking")
    const breakfast = createSection(db, "Breakfast")
    const id = createRecipe(db, recipe(baking.id, "Scones"))

    updateRecipe(db, id, {
      ...recipe(breakfast.id, "Cheese scones"),
      steps: ["Grate cheese.", "Mix.", "Bake."],
    })

    expect(getRecipe(db, id)).toMatchObject({
      sectionId: breakfast.id,
      sectionName: "Breakfast",
      title: "Cheese scones",
      steps: ["Grate cheese.", "Mix.", "Bake."],
    })
  })

  it("deletes a recipe", () => {
    const section = createSection(db, "Baking")
    const id = createRecipe(db, recipe(section.id, "Scones"))
    deleteRecipe(db, id)

    expect(getRecipe(db, id)).toBeUndefined()
    expect(errorCode(() => deleteRecipe(db, id))).toBe("recipe-not-found")
  })

  it("requires an existing section", () => {
    expect(errorCode(() => createRecipe(db, recipe(99, "Scones")))).toBe(
      "section-not-found"
    )
  })

  it("reports missing recipes on update", () => {
    const section = createSection(db, "Baking")

    expect(
      errorCode(() => updateRecipe(db, 99, recipe(section.id, "Scones")))
    ).toBe("recipe-not-found")
  })
})
