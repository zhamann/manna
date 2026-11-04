const listMarker = /^(?:\d+[.)]|[-*•])\s+/

/**
 * Splits pasted text into one entry per non-empty line, dropping list
 * markers like "1." or "-" that recipes copied from the web often carry.
 * Quantities such as "1 cup" or "1.5 cups" are kept.
 */
export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(listMarker, ""))
    .filter(Boolean)
}
