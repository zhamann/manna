// @ts-check

import node from "@astrojs/node"
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  security: {
    // Restoring a backup sends the whole library in one action call.
    actionBodySizeLimit: 16 * 1024 * 1024,
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
