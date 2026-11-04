import type { APIRoute } from "astro"

import { getDatabase } from "@/server/database"
import { exportLibrary } from "@/server/library"

export const GET: APIRoute = () => {
  const date = new Date().toISOString().slice(0, 10)
  return new Response(JSON.stringify(exportLibrary(getDatabase()), null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="recipes-backup-${date}.json"`,
    },
  })
}
