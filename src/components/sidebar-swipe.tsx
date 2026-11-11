import { useEffect } from "react"

import { useSidebar } from "@/components/ui/sidebar"
import { readSwipe, type Point } from "@/lib/swipe"

/** Elements where a sideways drag moves the caret or selects text. */
const TEXT_ENTRY = "input, textarea, select, [contenteditable]"

/** Whether something under the finger would scroll sideways instead. */
function scrollsSideways(target: Element | null, direction: "left" | "right") {
  for (let el = target; el; el = el.parentElement) {
    const { overflowX } = getComputedStyle(el)
    if (overflowX !== "auto" && overflowX !== "scroll") continue
    // Swiping right reveals what's to the left, and vice versa.
    if (
      direction === "right"
        ? el.scrollLeft > 0
        : el.scrollLeft + el.clientWidth < el.scrollWidth
    )
      return true
  }
  return false
}

/**
 * On phones, swiping right opens the sidebar and swiping left closes it.
 * Renders nothing; place it inside `SidebarProvider`.
 */
export function SidebarSwipe() {
  const { isMobile, openMobile, setOpenMobile } = useSidebar()

  useEffect(() => {
    if (!isMobile) return
    let start: Point | undefined
    let target: Element | null = null

    function onTouchStart(event: TouchEvent) {
      const touch = event.touches[0]
      target = event.target instanceof Element ? event.target : null
      start =
        event.touches.length === 1 && !target?.closest(TEXT_ENTRY)
          ? { x: touch.clientX, y: touch.clientY }
          : undefined
    }

    function onTouchMove(event: TouchEvent) {
      if (!start) return
      const touch = event.touches[0]
      const swipe = readSwipe(start, { x: touch.clientX, y: touch.clientY })
      if (!swipe) return
      start = undefined
      if (swipe === "scroll" || scrollsSideways(target, swipe)) return
      if (swipe === (openMobile ? "left" : "right")) setOpenMobile(!openMobile)
    }

    function onTouchEnd() {
      start = undefined
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: true })
    document.addEventListener("touchend", onTouchEnd)
    document.addEventListener("touchcancel", onTouchEnd)
    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", onTouchEnd)
      document.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [isMobile, openMobile, setOpenMobile])

  return null
}
