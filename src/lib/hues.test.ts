import { describe, expect, it } from "vitest"

import { hueAt, HUES, isHue, nextHue } from "./hues"

describe("nextHue", () => {
  it("starts at the beginning of the rotation", () => {
    expect(nextHue([])).toBe(HUES[0])
  })

  it("picks the first color no section uses yet", () => {
    expect(nextHue([HUES[0], HUES[2]])).toBe(HUES[1])
  })

  it("repeats the least-used color once every color is taken", () => {
    expect(nextHue([...HUES, HUES[0], HUES[1]])).toBe(HUES[2])
  })
})

describe("hueAt", () => {
  it("wraps around the rotation", () => {
    expect(hueAt(0)).toBe(HUES[0])
    expect(hueAt(HUES.length + 1)).toBe(HUES[1])
  })
})

describe("isHue", () => {
  it("accepts only palette names", () => {
    expect(isHue("blue")).toBe(true)
    expect(isHue("chartreuse")).toBe(false)
    expect(isHue(undefined)).toBe(false)
  })
})
