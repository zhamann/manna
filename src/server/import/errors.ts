export type ImportErrorCode =
  | "blocked-address"
  | "unreachable"
  | "refused"
  | "not-a-page"
  | "too-large"
  | "no-recipe"

/** Why a recipe couldn't be imported from a web address. */
export class ImportError extends Error {
  constructor(readonly code: ImportErrorCode) {
    super(code)
  }
}
