import { describe, expect, it } from "vitest"

import { filterSections } from "./search"

const sections = [
  {
    id: 1,
    name: "Baking",
    recipes: [
      { id: 1, title: "Banana bread" },
      { id: 2, title: "Scones" },
    ],
  },
  {
    id: 2,
    name: "Dinner",
    recipes: [
      { id: 3, title: "Banh mi" },
      { id: 4, title: "Risotto" },
    ],
  },
]

describe("filterSections", () => {
  it("returns everything for a blank query", () => {
    expect(filterSections(sections, "  ")).toBe(sections)
  })

  it("keeps only matching recipes, ignoring case", () => {
    expect(filterSections(sections, "BAN")).toEqual([
      { ...sections[0], recipes: [{ id: 1, title: "Banana bread" }] },
      { ...sections[1], recipes: [{ id: 3, title: "Banh mi" }] },
    ])
  })

  it("keeps every recipe in a section whose name matches", () => {
    expect(filterSections(sections, "dinner")).toEqual([sections[1]])
  })

  it("drops sections with no matches", () => {
    expect(filterSections(sections, "pizza")).toEqual([])
  })
})
