// @ts-check

import node from "@astrojs/node"
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

import { BACKUP_SIZE_LIMIT } from "./src/server/limits.ts"

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  security: {
    // Restoring a backup sends the whole library in one action call.
    actionBodySizeLimit: BACKUP_SIZE_LIMIT,
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
