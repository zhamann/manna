// Each device remembers the step cook mode was on, per recipe, until the
// recipe is finished. Storage can be unavailable (private browsing), so
// failures just mean starting from the first step.
const storageKey = (recipeId: number) => `cook-step:${recipeId}`

/** The step to pick up from, or undefined when there's nothing to resume. */
export function savedStep(
  recipeId: number,
  stepCount: number
): number | undefined {
  try {
    const stored = localStorage.getItem(storageKey(recipeId))
    if (stored === null) return undefined
    const step = Number(stored)
    return Number.isInteger(step) && step >= 0 && step < stepCount
      ? step
      : undefined
  } catch {
    return undefined
  }
}

/** Remembers `step`, or forgets the recipe's progress when undefined. */
export function saveStep(recipeId: number, step: number | undefined) {
  try {
    if (step === undefined) localStorage.removeItem(storageKey(recipeId))
    else localStorage.setItem(storageKey(recipeId), String(step))
  } catch {
    // Not remembering the step is harmless.
  }
}
