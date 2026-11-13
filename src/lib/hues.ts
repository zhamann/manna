/**
 * The colors a section can take. Each one names a palette in
 * `src/styles/global.css`, applied with `data-hue` on any element. Listed so
 * that neighbors in the rotation look nothing alike.
 */
export const HUES = [
  "orange",
  "blue",
  "green",
  "rose",
  "honey",
  "violet",
  "teal",
  "tomato",
] as const

export type Hue = (typeof HUES)[number]

/** Manna's own color, used wherever no section applies. */
export const APP_HUE: Hue = "orange"

export const HUE_LABELS: Record<Hue, string> = {
  orange: "Orange",
  blue: "Blue",
  green: "Green",
  rose: "Rose",
  honey: "Honey",
  violet: "Violet",
  teal: "Teal",
  tomato: "Tomato",
}

export function isHue(value: unknown): value is Hue {
  return HUES.includes(value as Hue)
}

/** The hue `index` places along, wrapping around the rotation. */
export function hueAt(index: number): Hue {
  return HUES[index % HUES.length]
}

/**
 * A color for a new section: the one the fewest sections use, earliest in the
 * rotation on a tie, so a library fills the whole palette before repeating.
 */
export function nextHue(used: Iterable<Hue>): Hue {
  const counts = new Map<Hue, number>(HUES.map((hue) => [hue, 0]))
  for (const hue of used) counts.set(hue, (counts.get(hue) ?? 0) + 1)
  return HUES.reduce((best, hue) =>
    counts.get(hue)! < counts.get(best)! ? hue : best
  )
}
