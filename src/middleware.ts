import type { MiddlewareHandler } from "astro"

/**
 * Headers sent with every page. The app has no accounts, so stop other sites
 * from framing it (where a click could confirm a restore or delete).
 */
export const securityHeaders = {
  "Content-Security-Policy":
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
}

export const onRequest: MiddlewareHandler = async (_context, next) => {
  const response = await next()
  for (const [name, value] of Object.entries(securityHeaders)) {
    response.headers.set(name, value)
  }
  return response
}
