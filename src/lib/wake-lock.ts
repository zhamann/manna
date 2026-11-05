type WakeLockNavigator = { wakeLock?: Pick<WakeLock, "request"> }
type WakeLockDocument = Pick<
  Document,
  "visibilityState" | "addEventListener" | "removeEventListener"
>

export interface ScreenWakeLock {
  /**
   * Keeps the screen on from now until `disable`, where the browser allows.
   * Resolves to whether the screen is being kept on right away. Safari only
   * allows it while handling a tap or key press, so call this from one.
   */
  enable(): Promise<boolean>
  /** Lets the screen sleep again. */
  disable(): void
  /** Disables and stops listening for good. */
  stop(): void
}

export function canKeepScreenAwake(nav: WakeLockNavigator = navigator) {
  return Boolean(nav.wakeLock)
}

/**
 * Holds a screen wake lock while enabled, reporting whether it holds one.
 * Browsers drop the lock when the page is hidden, so this asks again when the
 * page comes back; Safari refuses that without a tap, and reports it as off.
 */
export function screenWakeLock(
  onChange: (held: boolean) => void,
  nav: WakeLockNavigator = navigator,
  doc: WakeLockDocument = document
): ScreenWakeLock {
  let lock: WakeLockSentinel | undefined
  let enabled = false

  async function request(): Promise<boolean> {
    if (lock) return true
    if (!enabled || !nav.wakeLock || doc.visibilityState !== "visible")
      return false
    try {
      const sentinel = await nav.wakeLock.request("screen")
      // Disabled while waiting, or another request got there first.
      if (!enabled || lock) {
        await sentinel.release()
        return Boolean(lock)
      }
      lock = sentinel
      sentinel.addEventListener("release", () => {
        if (lock !== sentinel) return
        lock = undefined
        onChange(false)
      })
      onChange(true)
      return true
    } catch {
      // Denied, or unsupported (e.g. plain HTTP); the screen may dim.
      return false
    }
  }

  function disable() {
    enabled = false
    const held = lock
    lock = undefined
    held?.release()
    if (held) onChange(false)
  }

  doc.addEventListener("visibilitychange", request)

  return {
    enable() {
      enabled = true
      return request()
    },
    disable,
    stop() {
      doc.removeEventListener("visibilitychange", request)
      disable()
    },
  }
}
