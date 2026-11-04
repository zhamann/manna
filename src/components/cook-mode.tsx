import {
  IconBasket,
  IconChevronLeft,
  IconChevronRight,
  IconConfetti,
  IconPencil,
  IconX,
} from "@tabler/icons-react"
import { cn } from "cn"
import { useEffect, useRef, useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Item, ItemContent } from "@/components/ui/item"
import { Progress } from "@/components/ui/progress"
import type { Recipe } from "@/server/library"

type CookRecipe = Pick<Recipe, "id" | "title" | "ingredients" | "steps">

/**
 * Follows a recipe one step at a time, lyrics-style: every step stays on
 * screen and the current one is centered and emphasized. `current` runs from
 * 0 to `steps.length`, where `steps.length` means the recipe is finished.
 */
export function CookMode({ recipe }: { recipe: CookRecipe }) {
  const { steps, ingredients } = recipe
  const [current, setCurrent] = useState(() =>
    savedStep(recipe.id, steps.length)
  )
  const [currentInView, setCurrentInView] = useState(true)
  const scroller = useRef<HTMLElement>(null)
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([])
  const scrolledOnce = useRef(false)
  const done = current === steps.length

  useWakeLock()

  const go = (step: number) =>
    setCurrent(Math.max(0, Math.min(step, steps.length)))

  function scrollToCurrent() {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
    stepRefs.current[current]?.scrollIntoView({
      block: "center",
      behavior: scrolledOnce.current && !reduceMotion ? "smooth" : "instant",
    })
    scrolledOnce.current = true
  }

  // Only a step change moves the list, so scrolling away by hand sticks.
  useEffect(scrollToCurrent, [current])

  useEffect(
    () => saveStep(recipe.id, done ? undefined : current),
    [recipe.id, current, done]
  )

  useEffect(() => {
    const step = stepRefs.current[current]
    if (!step) return
    const observer = new IntersectionObserver(
      ([entry]) => setCurrentInView(entry.isIntersecting),
      { root: scroller.current }
    )
    observer.observe(step)
    return () => observer.disconnect()
  }, [current])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      // Space on a focused control activates it instead of advancing.
      const onControl =
        event.target instanceof Element && event.target.closest("button, a")
      if (["ArrowDown", "ArrowRight", "PageDown"].includes(event.key)) {
        event.preventDefault()
        setCurrent((step) => Math.min(step + 1, steps.length))
      } else if (event.key === " " && !onControl) {
        event.preventDefault()
        setCurrent((step) => Math.min(step + 1, steps.length))
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault()
        setCurrent((step) => Math.max(step - 1, 0))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [steps.length])

  const recipeHref = `/recipes/${recipe.id}`
  const ingredientList = (
    <ul className="ml-6 list-disc [&>li]:mt-2">
      {ingredients.map((ingredient, index) => (
        <li key={index}>{ingredient}</li>
      ))}
    </ul>
  )

  return (
    <div className="flex h-svh flex-col">
      <header className="flex items-center gap-3 px-4 pt-3">
        <a
          href={recipeHref}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Exit cook mode"
        >
          <IconX />
        </a>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate font-semibold">{recipe.title}</h1>
          <p className="text-sm text-muted-foreground">
            {steps.length === 0
              ? "No steps"
              : done
                ? "Done"
                : `Step ${current + 1} of ${steps.length}`}
          </p>
        </div>
        {ingredients.length > 0 && (
          <Drawer>
            <DrawerTrigger
              render={<Button variant="outline" className="lg:hidden" />}
            >
              <IconBasket />
              Ingredients
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Ingredients</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-8">{ingredientList}</div>
            </DrawerContent>
          </Drawer>
        )}
      </header>
      <Progress
        value={steps.length === 0 ? 0 : (current / steps.length) * 100}
        aria-label="Progress"
        className="px-4 py-3"
      />
      <div className="flex min-h-0 flex-1">
        {ingredients.length > 0 && (
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-r p-6 lg:block">
            <h2 className="mb-3 text-lg font-semibold">Ingredients</h2>
            {ingredientList}
          </aside>
        )}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <main ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
            {steps.length === 0 ? (
              <Empty className="h-full">
                <EmptyHeader>
                  <EmptyTitle>No steps yet</EmptyTitle>
                  <EmptyDescription>
                    Add steps to this recipe to cook along with it.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <a
                    href={`${recipeHref}/edit`}
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    <IconPencil />
                    Edit recipe
                  </a>
                </EmptyContent>
              </Empty>
            ) : done ? (
              <Empty className="h-full">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconConfetti />
                  </EmptyMedia>
                  <EmptyTitle>All done</EmptyTitle>
                  <EmptyDescription>
                    Enjoy your {recipe.title}.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="flex-row justify-center">
                  <Button variant="outline" onClick={() => go(0)}>
                    Start over
                  </Button>
                  <a href={recipeHref} className={cn(buttonVariants())}>
                    Back to recipe
                  </a>
                </EmptyContent>
              </Empty>
            ) : (
              <ol className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-[40svh]">
                {steps.map((step, index) => (
                  <li key={index}>
                    <Item
                      render={
                        <button
                          type="button"
                          ref={(element) => {
                            stepRefs.current[index] = element
                          }}
                          aria-current={index === current ? "step" : undefined}
                          onClick={() => go(index)}
                        />
                      }
                      className={cn(
                        "text-left text-2xl leading-snug font-semibold transition-opacity md:text-3xl",
                        index < current && "opacity-30",
                        index > current && "opacity-60"
                      )}
                    >
                      <ItemContent className="whitespace-pre-line">
                        {step}
                      </ItemContent>
                    </Item>
                  </li>
                ))}
              </ol>
            )}
          </main>
          {!done && !currentInView && (
            <Button
              variant="secondary"
              className="absolute bottom-4 left-1/2 -translate-x-1/2"
              onClick={scrollToCurrent}
            >
              Back to current step
            </Button>
          )}
        </div>
      </div>
      {steps.length > 0 && (
        <footer className="flex gap-2 p-4">
          <Button
            size="lg"
            variant="outline"
            className="h-12 flex-1 sm:flex-none"
            disabled={current === 0}
            onClick={() => go(current - 1)}
          >
            <IconChevronLeft />
            Previous
          </Button>
          {!done && (
            <Button
              size="lg"
              className="h-12 flex-1 sm:ml-auto sm:flex-none"
              onClick={() => go(current + 1)}
            >
              {current === steps.length - 1 ? "Finish" : "Next"}
              <IconChevronRight />
            </Button>
          )}
        </footer>
      )}
    </div>
  )
}

// Each device remembers the step it was on, per recipe, until the recipe is
// finished. Storage can be unavailable (private browsing), so failures just
// mean starting from the first step.
const storageKey = (recipeId: number) => `cook-step:${recipeId}`

function savedStep(recipeId: number, stepCount: number): number {
  try {
    const step = Number(localStorage.getItem(storageKey(recipeId)))
    return Number.isInteger(step) && step >= 0 && step < stepCount ? step : 0
  } catch {
    return 0
  }
}

function saveStep(recipeId: number, step: number | undefined) {
  try {
    if (step === undefined) localStorage.removeItem(storageKey(recipeId))
    else localStorage.setItem(storageKey(recipeId), String(step))
  } catch {
    // Not remembering the step is harmless.
  }
}

/** Keeps the screen on while cook mode is open, where the browser allows. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | undefined
    let active = true

    async function request() {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible")
        return
      try {
        lock = await navigator.wakeLock.request("screen")
        if (!active) await lock.release()
      } catch {
        // Denied or unsupported (e.g. plain HTTP); the screen may dim.
      }
    }

    request()
    // Browsers drop the lock when the page is hidden; take it back on return.
    document.addEventListener("visibilitychange", request)
    return () => {
      active = false
      document.removeEventListener("visibilitychange", request)
      lock?.release()
    }
  }, [])
}
