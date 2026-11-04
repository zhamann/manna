/**
 * The sidebar remembers which sections are collapsed in a cookie, so pages
 * render with the same sections open that the user left open.
 */
export const COLLAPSED_SECTIONS_COOKIE = "collapsed_sections"

export function parseCollapsedSections(value: string | undefined): number[] {
  return (value ?? "").split(",").map(Number).filter(Number.isInteger)
}

export function storeCollapsedSections(ids: Iterable<number>) {
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${COLLAPSED_SECTIONS_COOKIE}=${[...ids].join(",")}; path=/; max-age=${maxAge}`
}
