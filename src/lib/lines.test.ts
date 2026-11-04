import { describe, expect, it } from "vitest"

import { splitLines } from "./lines"

describe("splitLines", () => {
  it("returns one entry per non-empty line", () => {
    expect(splitLines("2 eggs\r\n\n  1 cup milk  \n")).toEqual([
      "2 eggs",
      "1 cup milk",
    ])
  })

  it("drops list markers", () => {
    expect(
      splitLines("1. Preheat the oven.\n2) Mix.\n- Salt\n* Pepper\n• Oil")
    ).toEqual(["Preheat the oven.", "Mix.", "Salt", "Pepper", "Oil"])
  })

  it("keeps leading quantities", () => {
    expect(
      splitLines("1 cup flour\n1.5 cups sugar\n2-3 cloves garlic")
    ).toEqual(["1 cup flour", "1.5 cups sugar", "2-3 cloves garlic"])
  })
})
