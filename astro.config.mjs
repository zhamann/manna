// @ts-check

import node from "@astrojs/node"
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, fontProviders } from "astro/config"

import { BACKUP_SIZE_LIMIT } from "./src/server/limits.ts"

/**
 * The Unicode range Fontsource gives its latin-ext files.
 * @type {[string, ...string[]]}
 */
const latinExt = [
  "U+0100-02BA",
  "U+02BD-02C5",
  "U+02C7-02CC",
  "U+02CE-02D7",
  "U+02DD-02FF",
  "U+0304",
  "U+0308",
  "U+0329",
  "U+1D00-1DBF",
  "U+1E00-1E9F",
  "U+1EF2-1EFF",
  "U+2020",
  "U+20A0-20AB",
  "U+20AD-20C0",
  "U+2113",
  "U+2C60-2C7F",
  "U+A720-A7FF",
]

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  security: {
    // Restoring a backup sends the whole library in one action call.
    actionBodySizeLimit: BACKUP_SIZE_LIMIT,
  },
  // Preloaded in the layout and `optional`, so text never changes font after it's
  // drawn. Files come from the installed packages, so builds download nothing.
  // latin-ext is a family of its own because preloading can't pick one file
  // from several of the same weight and style.
  fonts: [
    {
      name: "Instrument Sans",
      cssVariable: "--font-instrument-sans",
      provider: fontProviders.local(),
      display: "optional",
      fallbacks: ["sans-serif"],
      options: {
        variants: [
          {
            src: [
              "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wdth-normal.woff2",
            ],
            weight: "400 700",
            style: "normal",
            stretch: "75% 100%",
          },
        ],
      },
    },
    {
      name: "Instrument Sans Extended",
      cssVariable: "--font-instrument-sans-extended",
      provider: fontProviders.local(),
      display: "optional",
      fallbacks: [],
      options: {
        variants: [
          {
            src: [
              "@fontsource-variable/instrument-sans/files/instrument-sans-latin-ext-wdth-normal.woff2",
            ],
            weight: "400 700",
            style: "normal",
            stretch: "75% 100%",
            unicodeRange: latinExt,
          },
        ],
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
