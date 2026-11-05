import { describe, expect, it, vi } from "vitest"

import { canKeepScreenAwake, screenWakeLock } from "./wake-lock"

class FakeSentinel extends EventTarget {
  released = false
  async release() {
    if (this.released) return
    this.released = true
    this.dispatchEvent(new Event("release"))
  }
}

/** A browser that grants the lock only while `allowed` is true. */
function fakeBrowser() {
  const sentinels: FakeSentinel[] = []
  const changes: boolean[] = []
  const browser = {
    allowed: true,
    sentinels,
    changes,
    onChange: (held: boolean) => changes.push(held),
    held: () => sentinels.filter((s) => !s.released),
    nav: {
      wakeLock: {
        request: vi.fn(async () => {
          if (!browser.allowed) throw new DOMException("", "NotAllowedError")
          const sentinel = new FakeSentinel()
          sentinels.push(sentinel)
          return sentinel as unknown as WakeLockSentinel
        }),
      },
    },
    doc: Object.assign(new EventTarget(), {
      visibilityState: "visible" as DocumentVisibilityState,
    }),
    fire: (event: string) => browser.doc.dispatchEvent(new Event(event)),
    lock: () => screenWakeLock(browser.onChange, browser.nav, browser.doc),
  }
  return browser
}

const settle = () => new Promise((resolve) => setTimeout(resolve))

describe("screenWakeLock", () => {
  it("takes the lock on enable when the browser allows it", async () => {
    const browser = fakeBrowser()
    const lock = browser.lock()
    lock.enable()
    await settle()
    expect(browser.held()).toHaveLength(1)
    expect(browser.changes).toEqual([true])

    lock.stop()
    expect(browser.held()).toHaveLength(0)
    expect(browser.changes).toEqual([true, false])
  })

  it("reports whether enable kept the screen on", async () => {
    const browser = fakeBrowser()
    browser.allowed = false
    const lock = browser.lock()
    await expect(lock.enable()).resolves.toBe(false)

    browser.allowed = true
    await expect(lock.enable()).resolves.toBe(true)
    await expect(lock.enable()).resolves.toBe(true)
    expect(browser.held()).toHaveLength(1)
    lock.stop()
  })

  it("doesn't ask until enabled, nor after disable", async () => {
    const browser = fakeBrowser()
    const lock = browser.lock()
    browser.fire("visibilitychange")
    await settle()
    expect(browser.nav.wakeLock.request).not.toHaveBeenCalled()

    lock.enable()
    await settle()
    lock.disable()
    expect(browser.held()).toHaveLength(0)
    expect(browser.changes).toEqual([true, false])

    browser.fire("visibilitychange")
    await settle()
    expect(browser.nav.wakeLock.request).toHaveBeenCalledTimes(1)
    lock.stop()
  })

  it("leaves taps alone when enable was refused", async () => {
    const browser = fakeBrowser()
    browser.allowed = false
    const lock = browser.lock()
    await lock.enable()

    browser.allowed = true
    for (const event of ["pointerup", "click", "keydown"]) browser.fire(event)
    await settle()
    expect(browser.nav.wakeLock.request).toHaveBeenCalledTimes(1)
    expect(browser.changes).toEqual([])
    lock.stop()
  })

  it("takes the lock back after the system releases it", async () => {
    const browser = fakeBrowser()
    const lock = browser.lock()
    lock.enable()
    await settle()
    await browser.sentinels[0].release()
    expect(browser.changes).toEqual([true, false])

    browser.fire("visibilitychange")
    await settle()
    expect(browser.held()).toHaveLength(1)
    expect(browser.changes).toEqual([true, false, true])
    lock.stop()
  })

  it("doesn't ask while the page is hidden", async () => {
    const browser = fakeBrowser()
    browser.doc.visibilityState = "hidden"
    const lock = browser.lock()
    lock.enable()
    browser.fire("visibilitychange")
    await settle()
    expect(browser.nav.wakeLock.request).not.toHaveBeenCalled()
    lock.stop()
  })

  it("releases a lock granted after it stopped", async () => {
    const browser = fakeBrowser()
    const lock = browser.lock()
    lock.enable()
    lock.stop()
    await settle()
    expect(browser.sentinels).toHaveLength(1)
    expect(browser.held()).toHaveLength(0)
    expect(browser.changes).toEqual([])
  })

  it("does nothing where the API is missing", () => {
    const browser = fakeBrowser()
    expect(canKeepScreenAwake({})).toBe(false)
    expect(canKeepScreenAwake(browser.nav)).toBe(true)

    const lock = screenWakeLock(browser.onChange, {}, browser.doc)
    lock.enable()
    browser.fire("click")
    lock.stop()
    expect(browser.changes).toEqual([])
  })
})
