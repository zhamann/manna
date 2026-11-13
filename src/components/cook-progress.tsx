import { IconToolsKitchen2 } from "@tabler/icons-react"
import { cn } from "cn"
import { useSyncExternalStore } from "react"

import { buttonVariants } from "@/components/ui/button"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import { savedStep } from "@/lib/cook-progress"

/**
 * Where this device left off cooking a recipe, with a button to carry on, or
 * to start when it hasn't been cooked here yet.
 */
export function CookProgress({
  recipeId,
  stepCount,
}: {
  recipeId: number
  stepCount: number
}) {
  // Storage is only readable in the browser, so the server renders the
  // button to start and progress appears once hydrated.
  const step = useSyncExternalStore(
    noSubscription,
    () => savedStep(recipeId, stepCount),
    () => undefined
  )

  if (stepCount === 0) return null
  const href = `/recipes/${recipeId}/cook`

  return (
    <div className="relative z-10 flex items-end gap-4">
      {step !== undefined && (
        <Progress
          value={(step / stepCount) * 100}
          className="flex-1 gap-2 [&_[data-slot=progress-track]]:h-1.5"
        >
          <ProgressLabel className="font-semibold">
            Step {step + 1} of {stepCount}
          </ProgressLabel>
        </Progress>
      )}
      <a href={href} className={cn(buttonVariants(), "ml-auto")}>
        <IconToolsKitchen2 />
        {step === undefined ? "Start cooking" : "Keep cooking"}
      </a>
    </div>
  )
}

// Progress only changes in cook mode, on another page.
const noSubscription = () => () => {}
