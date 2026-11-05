import { Buffer } from "node:buffer"
import { lookup, type LookupAddress, type LookupOptions } from "node:dns"
import http, { type IncomingMessage } from "node:http"
import https from "node:https"
import { BlockList, isIP } from "node:net"
import type { Readable } from "node:stream"
import zlib from "node:zlib"

import { ImportError } from "./errors"

/** The largest page, in bytes after decompressing, that an import reads. */
export const PAGE_SIZE_LIMIT = 5 * 1024 * 1024
const TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 5

const USER_AGENT =
  "Mozilla/5.0 (compatible; Manna; +https://github.com/zhamann/manna)"

// Addresses that aren't on the public internet: loopback, private networks,
// link-local (including cloud metadata services), shared and reserved
// ranges. IPv4-mapped IPv6 addresses are checked against the IPv4 ranges.
const nonPublic = new BlockList()
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  nonPublic.addSubnet(network, prefix, "ipv4")
}
for (const [network, prefix] of [
  ["::", 96], // Unspecified, loopback, and IPv4-compatible
  ["64:ff9b:1::", 48], // Local-use IPv4/IPv6 translation
  ["100::", 64], // Discard
  ["2001:db8::", 32], // Documentation
  ["2002::", 16], // 6to4, which can wrap a private IPv4 address
  ["fc00::", 7], // Unique local
  ["fe80::", 10], // Link-local
  ["ff00::", 8], // Multicast
] as const) {
  nonPublic.addSubnet(network, prefix, "ipv6")
}

/** Whether `address` is an IP address on the public internet. */
export function isPublicAddress(address: string): boolean {
  const version = isIP(address)
  if (!version) return false
  return !nonPublic.check(address, version === 4 ? "ipv4" : "ipv6")
}

export interface FetchPageOptions {
  /** Decides which addresses may be connected to; tests widen it. */
  isAllowed?: (address: string) => boolean
  timeoutMs?: number
}

/**
 * Downloads the HTML page at `url`, following redirects. Every connection,
 * including each redirect, goes only to allowed (by default, public)
 * addresses. The check runs on the addresses actually connected to, so DNS
 * can't swap in a private one after the check.
 */
export async function fetchPage(
  url: string,
  { isAllowed = isPublicAddress, timeoutMs = TIMEOUT_MS }: FetchPageOptions = {}
): Promise<string> {
  const signal = AbortSignal.timeout(timeoutMs)
  let target = new URL(url)

  for (let redirects = 0; ; redirects++) {
    const response = await get(target, isAllowed, signal)
    const status = response.statusCode ?? 0
    const location = response.headers.location

    if (status >= 300 && status < 400 && location) {
      response.destroy()
      if (redirects === MAX_REDIRECTS) throw new ImportError("unreachable")
      target = new URL(location, target)
      continue
    }
    if (status < 200 || status >= 300) {
      response.destroy()
      // Many big recipe sites turn away requests that don't come from a
      // browser; say so rather than suggest the address is wrong.
      const refused = status === 401 || status === 403 || status === 429
      throw new ImportError(refused ? "refused" : "unreachable")
    }

    const type = response.headers["content-type"] ?? "text/html"
    if (!/^\s*(text\/html|application\/xhtml\+xml)\b/i.test(type)) {
      response.destroy()
      throw new ImportError("not-a-page")
    }
    return decode(await readBody(response), charset(type))
  }
}

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number
) => void

function get(
  url: URL,
  isAllowed: (address: string) => boolean,
  signal: AbortSignal
): Promise<IncomingMessage> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return Promise.reject(new ImportError("unreachable"))
  }
  // Node connects to an IP address in the URL without looking it up, so the
  // lookup below never sees it; check it here instead.
  const host = url.hostname.replace(/^\[(.*)\]$/, "$1")
  if (isIP(host) && !isAllowed(host)) {
    return Promise.reject(new ImportError("blocked-address"))
  }

  function guardedLookup(
    hostname: string,
    options: LookupOptions,
    callback: LookupCallback
  ) {
    lookup(hostname, { ...options, all: true }, (error, addresses) => {
      if (error) return callback(error, "")
      const allowed = addresses.filter(({ address }) => isAllowed(address))
      if (!allowed.length) {
        return callback(new ImportError("blocked-address"), "")
      }
      if (options.all) return callback(null, allowed)
      callback(null, allowed[0].address, allowed[0].family)
    })
  }

  const client = url.protocol === "https:" ? https : http
  return new Promise((resolve, reject) => {
    client
      .get(
        url,
        {
          lookup: guardedLookup,
          signal,
          headers: {
            "user-agent": USER_AGENT,
            accept: "text/html,application/xhtml+xml",
            "accept-encoding": "gzip, deflate, br",
          },
        },
        resolve
      )
      .on("error", (error) =>
        reject(
          error instanceof ImportError ? error : new ImportError("unreachable")
        )
      )
  })
}

async function readBody(response: IncomingMessage): Promise<Buffer> {
  if (Number(response.headers["content-length"]) > PAGE_SIZE_LIMIT) {
    response.destroy()
    throw new ImportError("too-large")
  }

  const encoding = response.headers["content-encoding"]?.trim().toLowerCase()
  let body: Readable = response
  if (encoding === "gzip" || encoding === "x-gzip") {
    body = response.pipe(zlib.createGunzip())
  } else if (encoding === "deflate") {
    body = response.pipe(zlib.createInflate())
  } else if (encoding === "br") {
    body = response.pipe(zlib.createBrotliDecompress())
  }

  const chunks: Buffer[] = []
  let size = 0
  try {
    for await (const chunk of body) {
      size += chunk.length
      if (size > PAGE_SIZE_LIMIT) throw new ImportError("too-large")
      chunks.push(chunk)
    }
  } catch (error) {
    throw error instanceof ImportError ? error : new ImportError("unreachable")
  } finally {
    response.destroy()
    body.destroy()
  }
  return Buffer.concat(chunks)
}

function charset(contentType: string): string {
  return /;\s*charset="?([^";\s]+)/i.exec(contentType)?.[1] ?? "utf-8"
}

function decode(body: Buffer, charset: string): string {
  try {
    return new TextDecoder(charset).decode(body)
  } catch {
    return new TextDecoder().decode(body)
  }
}
