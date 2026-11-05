import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { gzipSync } from "node:zlib"

import { importRecipe } from "."
import { fetchPage, isPublicAddress, PAGE_SIZE_LIMIT } from "./fetch-page"

describe("isPublicAddress", () => {
  it("allows public addresses", () => {
    for (const address of ["93.184.215.14", "8.8.8.8", "2606:4700::1111"]) {
      expect(isPublicAddress(address), address).toBe(true)
    }
  })

  it("refuses loopback, private, link-local, and reserved addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "192.168.1.10",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
      "::1",
      "::",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "::ffff:a9fe:a9fe",
      "2002:c0a8:0101::1",
      "localhost",
    ]) {
      expect(isPublicAddress(address), address).toBe(false)
    }
  })
})

const recipePage = `<html><head><script type="application/ld+json">${JSON.stringify(
  { "@type": "Recipe", name: "Toast", recipeIngredient: ["1 slice bread"] }
)}</script></head></html>`

let server: Server
let base: string
const allowLocal = { isAllowed: () => true }

beforeAll(async () => {
  server = createServer((request, response) => {
    const path = request.url ?? "/"
    if (path === "/recipe") {
      response.setHeader("content-type", "text/html; charset=utf-8")
      return response.end(recipePage)
    }
    if (path === "/gzip") {
      response.setHeader("content-type", "text/html")
      response.setHeader("content-encoding", "gzip")
      return response.end(gzipSync(recipePage))
    }
    if (path === "/redirect") {
      response.statusCode = 302
      response.setHeader("location", "/recipe")
      return response.end()
    }
    if (path === "/loop") {
      response.statusCode = 301
      response.setHeader("location", "/loop")
      return response.end()
    }
    if (path === "/plain") {
      response.setHeader("content-type", "text/html")
      return response.end("<html><body>Just a page</body></html>")
    }
    if (path === "/image") {
      response.setHeader("content-type", "image/png")
      return response.end("png")
    }
    if (path === "/huge") {
      response.setHeader("content-type", "text/html")
      response.write("x".repeat(PAGE_SIZE_LIMIT))
      return response.end("x")
    }
    if (path === "/forbidden") {
      response.statusCode = 403
      return response.end("no bots")
    }
    if (path === "/slow") return
    response.statusCode = 404
    response.end("missing")
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.closeAllConnections()
  server.close()
})

describe("fetchPage", () => {
  it("refuses private addresses by default, in the URL or through DNS", async () => {
    await expect(fetchPage(`${base}/recipe`)).rejects.toMatchObject({
      code: "blocked-address",
    })
    const port = new URL(base).port
    await expect(
      fetchPage(`http://localhost:${port}/recipe`)
    ).rejects.toMatchObject({ code: "blocked-address" })
    await expect(fetchPage("http://[::1]/")).rejects.toMatchObject({
      code: "blocked-address",
    })
  })

  it("checks every redirect", async () => {
    const onlyFirstHop = {
      isAllowed: (() => {
        let calls = 0
        return () => calls++ === 0
      })(),
    }
    await expect(
      fetchPage(`${base}/redirect`, onlyFirstHop)
    ).rejects.toMatchObject({ code: "blocked-address" })
  })

  it("follows redirects and decompresses pages", async () => {
    expect(await fetchPage(`${base}/redirect`, allowLocal)).toBe(recipePage)
    expect(await fetchPage(`${base}/gzip`, allowLocal)).toBe(recipePage)
  })

  it("gives up on redirect loops, errors, and timeouts", async () => {
    for (const path of ["/loop", "/missing"]) {
      await expect(
        fetchPage(`${base}${path}`, allowLocal)
      ).rejects.toMatchObject({ code: "unreachable" })
    }
    await expect(
      fetchPage(`${base}/slow`, { ...allowLocal, timeoutMs: 100 })
    ).rejects.toMatchObject({ code: "unreachable" })
  })

  it("reports a site that turns the request away", async () => {
    await expect(
      fetchPage(`${base}/forbidden`, allowLocal)
    ).rejects.toMatchObject({ code: "refused" })
  })

  it("refuses files that aren't pages and pages that are too big", async () => {
    await expect(fetchPage(`${base}/image`, allowLocal)).rejects.toMatchObject({
      code: "not-a-page",
    })
    await expect(fetchPage(`${base}/huge`, allowLocal)).rejects.toMatchObject({
      code: "too-large",
    })
  })
})

describe("importRecipe", () => {
  it("reads the recipe from a page", async () => {
    const recipe = await importRecipe(`${base}/recipe`, allowLocal)
    expect(recipe).toMatchObject({
      title: "Toast",
      ingredients: ["1 slice bread"],
      sourceUrl: `${base}/recipe`,
    })
  })

  it("reports a page without a recipe", async () => {
    await expect(
      importRecipe(`${base}/plain`, allowLocal)
    ).rejects.toMatchObject({ code: "no-recipe" })
  })
})
