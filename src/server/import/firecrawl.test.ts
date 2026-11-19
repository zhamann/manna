import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createServer, type IncomingMessage, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import { importRecipe } from "."
import { PAGE_SIZE_LIMIT } from "./fetch-page"
import { fetchRenderedPage, firecrawlFromEnv } from "./firecrawl"

const recipePage = `<html><head><script type="application/ld+json">${JSON.stringify(
  { "@type": "Recipe", name: "Toast", recipeIngredient: ["1 slice bread"] }
)}</script></head></html>`

// The recipe site: turns Manna away, or serves a page whose recipe only
// appears once its scripts run.
let site: Server
let siteBase: string

// A stand-in for Firecrawl's POST /v2/scrape. `reply` decides each answer.
let firecrawl: Server
let firecrawlBase: string
let reply: (body: { url: string }) => { status?: number; json: unknown }
let requests: { headers: IncomingMessage["headers"]; body: unknown }[]

const allowLocal = { isAllowed: () => true }

async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

beforeAll(async () => {
  site = createServer((request, response) => {
    if (request.url === "/forbidden") {
      response.statusCode = 403
      return response.end("no bots")
    }
    if (request.url === "/script-only") {
      response.setHeader("content-type", "text/html")
      return response.end("<html><body><div id=app></div></body></html>")
    }
    if (request.url === "/image") {
      response.setHeader("content-type", "image/png")
      return response.end("png")
    }
    response.statusCode = 404
    response.end()
  })
  siteBase = await listen(site)

  firecrawl = createServer(async (request, response) => {
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(chunk as Buffer)
    const body = JSON.parse(Buffer.concat(chunks).toString())
    requests.push({ headers: request.headers, body })
    const { status = 200, json } = reply(body)
    response.statusCode = status
    response.setHeader("content-type", "application/json")
    response.end(JSON.stringify(json))
  })
  firecrawlBase = await listen(firecrawl)
})

beforeEach(() => {
  requests = []
  reply = () => ({
    json: {
      success: true,
      data: { rawHtml: recipePage, metadata: { statusCode: 200 } },
    },
  })
})

afterAll(() => {
  for (const server of [site, firecrawl]) {
    server.closeAllConnections()
    server.close()
  }
})

describe("importRecipe with Firecrawl", () => {
  it("asks Firecrawl for the page when the site turns Manna away", async () => {
    const recipe = await importRecipe(`${siteBase}/forbidden`, {
      ...allowLocal,
      firecrawl: { apiUrl: firecrawlBase, apiKey: "secret" },
    })
    expect(recipe).toMatchObject({
      title: "Toast",
      sourceUrl: `${siteBase}/forbidden`,
    })
    expect(requests).toHaveLength(1)
    expect(requests[0].headers.authorization).toBe("Bearer secret")
    expect(requests[0].body).toMatchObject({
      url: `${siteBase}/forbidden`,
      formats: ["rawHtml"],
    })
  })

  it("asks Firecrawl when the page only has its recipe after scripts run", async () => {
    const recipe = await importRecipe(`${siteBase}/script-only`, {
      ...allowLocal,
      firecrawl: { apiUrl: `${firecrawlBase}/` },
    })
    expect(recipe.title).toBe("Toast")
    expect(requests[0].headers.authorization).toBeUndefined()
  })

  it("reports Manna's own error when Firecrawl can't get the recipe either", async () => {
    const answers = [
      { json: { success: true, data: { blocked: true, metadata: {} } } },
      { status: 500, json: { success: false, error: "Chrome crashed" } },
      {
        json: {
          success: true,
          data: { rawHtml: "<html></html>", metadata: { statusCode: 200 } },
        },
      },
    ]
    for (const answer of answers) {
      reply = () => answer
      await expect(
        importRecipe(`${siteBase}/forbidden`, {
          ...allowLocal,
          firecrawl: { apiUrl: firecrawlBase },
        })
      ).rejects.toMatchObject({ code: "refused" })
    }

    await expect(
      importRecipe(`${siteBase}/forbidden`, {
        ...allowLocal,
        firecrawl: { apiUrl: "http://127.0.0.1:1" },
      })
    ).rejects.toMatchObject({ code: "refused" })
  })

  it("doesn't ask Firecrawl about failures a browser wouldn't fix", async () => {
    const options = { firecrawl: { apiUrl: firecrawlBase } }
    await expect(
      importRecipe(`${siteBase}/forbidden`, options)
    ).rejects.toMatchObject({ code: "blocked-address" })
    await expect(
      importRecipe(`${siteBase}/image`, { ...allowLocal, ...options })
    ).rejects.toMatchObject({ code: "not-a-page" })
    expect(requests).toHaveLength(0)
  })

  it("doesn't ask Firecrawl when none is configured", async () => {
    await expect(
      importRecipe(`${siteBase}/forbidden`, { ...allowLocal, firecrawl: null })
    ).rejects.toMatchObject({ code: "refused" })
    expect(requests).toHaveLength(0)
  })
})

describe("fetchRenderedPage", () => {
  const config = () => ({ apiUrl: firecrawlBase })

  it("passes on the status the site answered Firecrawl with", async () => {
    for (const [statusCode, code] of [
      [403, "refused"],
      [404, "unreachable"],
    ] as const) {
      reply = () => ({
        json: {
          success: true,
          data: { rawHtml: "", metadata: { statusCode } },
        },
      })
      await expect(
        fetchRenderedPage("https://example.com/", config())
      ).rejects.toMatchObject({ code })
    }
  })

  it("refuses documents and pages that are too big", async () => {
    reply = () => ({
      json: { success: true, data: { markdown: "# A PDF", metadata: {} } },
    })
    await expect(
      fetchRenderedPage("https://example.com/", config())
    ).rejects.toMatchObject({ code: "not-a-page" })

    reply = () => ({
      json: {
        success: true,
        data: { rawHtml: "x".repeat(PAGE_SIZE_LIMIT + 1), metadata: {} },
      },
    })
    await expect(
      fetchRenderedPage("https://example.com/", config())
    ).rejects.toMatchObject({ code: "too-large" })
  })
})

describe("firecrawlFromEnv", () => {
  it("reads FIRECRAWL_API_URL and FIRECRAWL_API_KEY", () => {
    expect(firecrawlFromEnv({})).toBeUndefined()
    expect(firecrawlFromEnv({ FIRECRAWL_API_URL: " " })).toBeUndefined()
    expect(
      firecrawlFromEnv({ FIRECRAWL_API_URL: "http://firecrawl:3002" })
    ).toEqual({ apiUrl: "http://firecrawl:3002" })
    expect(
      firecrawlFromEnv({
        FIRECRAWL_API_URL: "https://api.firecrawl.dev",
        FIRECRAWL_API_KEY: "fc-123",
      })
    ).toEqual({ apiUrl: "https://api.firecrawl.dev", apiKey: "fc-123" })
  })
})
