import { beforeEach, describe, expect, it } from "vitest"
import { Buffer } from "node:buffer"
import type { DatabaseSync } from "node:sqlite"

import { openDatabase } from "./database"
import {
  createRecipe,
  createSection,
  deleteRecipe,
  deleteSection,
  exportLibrary,
  getRecipe,
  LibraryError,
  listRecentlyAdded,
  listRecentlyViewed,
  listSections,
  recordView,
  restoreLibrary,
  updateRecipe,
  updateSection,
  type RecipeInput,
} from "./library"
import { BACKUP_SIZE_LIMIT } from "./limits"
import { HUES } from "@/lib/hues"

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
    const mains = createSection(db, "mains", "teal")
    const baking = createSection(db, "Baking", "honey")
    createRecipe(db, recipe(baking.id, "scones"))
    createRecipe(db, recipe(baking.id, "Banana bread"))

    expect(listSections(db)).toEqual([
      {
        id: baking.id,
        name: "Baking",
        color: "honey",
        recipes: [
          { id: expect.any(Number), title: "Banana bread" },
          { id: expect.any(Number), title: "scones" },
        ],
      },
      { id: mains.id, name: "mains", color: "teal", recipes: [] },
    ])
  })

  it("rejects names that differ only by case", () => {
    createSection(db, "Baking")
    const other = createSection(db, "Mains")

    expect(errorCode(() => createSection(db, "baking"))).toBe(
      "duplicate-section"
    )
    expect(
      errorCode(() =>
        updateSection(db, other.id, { name: "BAKING", color: "blue" })
      )
    ).toBe("duplicate-section")
  })

  it("renames and recolors a section", () => {
    const section = createSection(db, "Baking", "orange")
    updateSection(db, section.id, { name: "Breads", color: "violet" })

    expect(listSections(db)).toMatchObject([
      { name: "Breads", color: "violet" },
    ])
  })

  it("gives new sections the colors no other section uses yet", () => {
    createSection(db, "First", HUES[1])
    createSection(db, "Second")
    createSection(db, "Third")

    expect(listSections(db).map(({ color }) => color)).toEqual([
      HUES[1],
      HUES[0],
      HUES[2],
    ])
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
    expect(
      errorCode(() => updateSection(db, 99, { name: "Nope", color: "blue" }))
    ).toBe("section-not-found")
    expect(errorCode(() => deleteSection(db, 99))).toBe("section-not-found")
  })
})

describe("recipes", () => {
  it("round-trips every field", () => {
    const section = createSection(db, "Baking", "rose")
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
      sectionColor: "rose",
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

describe("recent recipes", () => {
  it("lists recipes by when they were last viewed", () => {
    const baking = createSection(db, "Baking", "orange")
    const mains = createSection(db, "Mains", "green")
    const scones = createRecipe(db, recipe(baking.id, "Scones"))
    const stew = createRecipe(db, {
      ...recipe(mains.id, "Stew"),
      steps: ["Brown.", "Simmer.", "Season."],
    })
    createRecipe(db, recipe(mains.id, "Never opened"))

    recordView(db, scones, 1000)
    recordView(db, stew, 2000)
    const stewSummary = {
      id: stew,
      title: "Stew",
      sectionName: "Mains",
      sectionColor: "green",
      stepCount: 3,
    }
    const sconesSummary = {
      id: scones,
      title: "Scones",
      sectionName: "Baking",
      sectionColor: "orange",
      stepCount: 2,
    }
    expect(listRecentlyViewed(db, 10)).toEqual([stewSummary, sconesSummary])

    recordView(db, scones, 3000)
    expect(listRecentlyViewed(db, 1)).toEqual([sconesSummary])
  })

  it("lists the newest recipes first", () => {
    const section = createSection(db, "Baking")
    const first = createRecipe(db, recipe(section.id, "First"))
    const second = createRecipe(db, recipe(section.id, "Second"))
    const third = createRecipe(db, recipe(section.id, "Third"))

    expect(listRecentlyAdded(db, 2).map(({ id }) => id)).toEqual([
      third,
      second,
    ])
    deleteRecipe(db, third)
    expect(listRecentlyAdded(db, 5).map(({ id }) => id)).toEqual([
      second,
      first,
    ])
  })

  it("keeps view history out of backups", () => {
    const section = createSection(db, "Baking")
    const id = createRecipe(db, recipe(section.id, "Scones"))
    recordView(db, id)

    expect(exportLibrary(db).recipes[0]).not.toHaveProperty("viewedAt")
    expect(exportLibrary(db).recipes[0]).not.toHaveProperty("viewed_at")
  })
})

describe("backups", () => {
  function seed() {
    const baking = createSection(db, "Baking")
    createSection(db, "Empty")
    const scones = createRecipe(db, recipe(baking.id, "Scones"))
    createRecipe(db, recipe(baking.id, "Bread"))
    deleteRecipe(db, scones)
  }

  it("restores an export into another database with the same ids", () => {
    seed()
    const backup = exportLibrary(db)
    const other = openDatabase(":memory:")
    restoreLibrary(other, backup)

    expect(exportLibrary(other)).toEqual(backup)
    expect(backup.recipes.map(({ id }) => id)).toEqual([2])
  })

  it("replaces everything that was there", () => {
    seed()
    const backup = exportLibrary(db)
    const other = openDatabase(":memory:")
    const old = createSection(other, "Old")
    createRecipe(other, recipe(old.id, "Old recipe"))
    restoreLibrary(other, backup)

    expect(listSections(other).map(({ name }) => name)).toEqual([
      "Baking",
      "Empty",
    ])
  })

  it("leaves the library untouched when the backup is rejected", () => {
    seed()
    const before = exportLibrary(db)
    const broken = {
      ...before,
      recipes: [{ ...before.recipes[0], sectionId: 99 }],
    }

    expect(errorCode(() => restoreLibrary(db, broken))).toBe(
      "section-not-found"
    )
    expect(exportLibrary(db)).toEqual(before)
  })

  it("colors sections from backups made before sections had colors", () => {
    restoreLibrary(db, {
      ...exportLibrary(db),
      sections: [
        { id: 1, name: "Baking" },
        { id: 2, name: "Mains" },
      ],
    })

    expect(listSections(db).map(({ color }) => color)).toEqual([
      HUES[0],
      HUES[1],
    ])
  })

  it("rejects sections whose names collide", () => {
    const backup = {
      ...exportLibrary(db),
      sections: [
        { id: 1, name: "Baking" },
        { id: 2, name: "baking" },
      ],
    }

    expect(errorCode(() => restoreLibrary(db, backup))).toBe(
      "duplicate-section"
    )
  })

  it("refuses changes that would make the backup too big to restore", () => {
    const section = createSection(db, "Baking")
    const small = createRecipe(db, recipe(section.id, "Small"))
    const long = Array<string>(200).fill("a".repeat(2000))
    const big = { ...recipe(section.id, "Big"), ingredients: long, steps: long }

    let recipes = 1
    let code: string | undefined
    while ((code = errorCode(() => createRecipe(db, big))) === undefined) {
      recipes++
    }

    expect(code).toBe("library-full")
    expect(exportLibrary(db).recipes).toHaveLength(recipes)
    expect(errorCode(() => updateRecipe(db, small, big))).toBe("library-full")
    expect(getRecipe(db, small)?.title).toBe("Small")
    const backup = JSON.stringify(exportLibrary(db))
    expect(Buffer.byteLength(backup)).toBeLessThanOrEqual(BACKUP_SIZE_LIMIT)
  })
})
