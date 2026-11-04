import { describe, expect, it } from "vitest"

import { onRequest, securityHeaders } from "./middleware"

describe("middleware", () => {
  it("adds the security headers to every response", async () => {
    const response = (await onRequest(
      {} as Parameters<typeof onRequest>[0],
      async () =>
        new Response("ok", { headers: { "Content-Type": "text/html" } })
    )) as Response

    expect(Object.fromEntries(response.headers)).toEqual({
      "content-type": "text/html",
      ...Object.fromEntries(
        Object.entries(securityHeaders).map(([k, v]) => [k.toLowerCase(), v])
      ),
    })
    expect(await response.text()).toBe("ok")
  })
})
