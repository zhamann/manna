/**
 * The largest backup, in bytes, that a restore accepts. The library refuses
 * any change that would grow its backup past this, so every export restores.
 */
export const BACKUP_SIZE_LIMIT = 16 * 1024 * 1024

/** The longest each recipe field may be, in characters or entries. */
export const RECIPE_LIMITS = {
  title: 200,
  description: 2000,
  /** Servings, prep time, and cook time. */
  detail: 100,
  notes: 5000,
  /** Each ingredient or step. */
  line: 2000,
  /** Ingredients or steps per recipe. */
  lines: 200,
}
