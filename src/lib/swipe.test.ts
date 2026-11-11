import { describe, expect, it } from "vitest"

import { SWIPE_DISTANCE, readSwipe } from "./swipe"

const start = { x: 100, y: 300 }

describe("readSwipe", () => {
  it("waits while the finger has barely moved", () => {
    expect(readSwipe(start, start)).toBeUndefined()
    expect(readSwipe(start, { x: 105, y: 303 })).toBeUndefined()
  })

  it("waits while a sideways move is still short", () => {
    expect(readSwipe(start, { x: 130, y: 305 })).toBeUndefined()
  })

  it("reads a long sideways move as a swipe in its direction", () => {
    expect(readSwipe(start, { x: 100 + SWIPE_DISTANCE, y: 310 })).toBe("right")
    expect(readSwipe(start, { x: 100 - SWIPE_DISTANCE, y: 290 })).toBe("left")
  })

  it("reads a mostly vertical move as a scroll", () => {
    expect(readSwipe(start, { x: 100, y: 320 })).toBe("scroll")
    expect(readSwipe(start, { x: 160, y: 380 })).toBe("scroll")
    expect(readSwipe(start, { x: 90, y: 200 })).toBe("scroll")
  })
})
