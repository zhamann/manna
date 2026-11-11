export interface Point {
  x: number
  y: number
}

/** How far a finger moves before a touch counts as a scroll or a swipe. */
export const SWIPE_SLOP = 10

/** How far a finger must travel sideways for a swipe to count. */
export const SWIPE_DISTANCE = 48

/**
 * Reads a touch that started at `start` and is now at `current`: a sideways
 * `"left"` or `"right"` swipe once it has travelled far enough, `"scroll"` once
 * it has moved as much up or down as sideways, and `undefined` while it could
 * still become either.
 */
export function readSwipe(
  start: Point,
  current: Point
): "left" | "right" | "scroll" | undefined {
  const dx = current.x - start.x
  const dy = current.y - start.y
  if (Math.hypot(dx, dy) < SWIPE_SLOP) return undefined
  if (Math.abs(dy) >= Math.abs(dx)) return "scroll"
  if (Math.abs(dx) < SWIPE_DISTANCE) return undefined
  return dx > 0 ? "right" : "left"
}
