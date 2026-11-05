import { describe, expect, it } from "vitest"

import { RECIPE_LIMITS } from "@/server/limits"

import { parseRecipe } from "./parse-recipe"

const url = "https://example.com/banana-bread"

function page(...jsonLd: unknown[]): string {
  const scripts = jsonLd
    .map(
      (data) =>
        `<script type="application/ld+json">${typeof data === "string" ? data : JSON.stringify(data)}</script>`
    )
    .join("\n")
  return `<!doctype html><html><head><title>Recipe</title>${scripts}</head><body><h1>Recipe</h1></body></html>`
}

describe("parseRecipe", () => {
  it("reads a plain Recipe", () => {
    const html = page({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Banana bread",
      description: "Moist and simple.",
      recipeYield: "1 loaf",
      prepTime: "PT15M",
      cookTime: "PT1H",
      recipeIngredient: ["3 ripe bananas", "2 cups flour"],
      recipeInstructions: ["Mash the bananas.", "Fold in the flour."],
    })

    expect(parseRecipe(html, url)).toEqual({
      title: "Banana bread",
      description: "Moist and simple.",
      servings: "1 loaf",
      prepTime: "15 min",
      cookTime: "1 hr",
      sourceUrl: url,
      ingredients: ["3 ripe bananas", "2 cups flour"],
      steps: ["Mash the bananas.", "Fold in the flour."],
    })
  })

  it("finds the Recipe in a WordPress-style @graph", () => {
    const html = page({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", name: "A food blog" },
        { "@type": "Article", headline: "My favorite soup" },
        {
          "@type": "Recipe",
          name: "Lentil soup",
          recipeIngredient: ["1 cup lentils"],
          recipeInstructions: [
            { "@type": "HowToStep", text: "Rinse the lentils." },
            { "@type": "HowToStep", text: "Simmer for 30 minutes." },
          ],
        },
      ],
    })

    const recipe = parseRecipe(html, url)
    expect(recipe?.title).toBe("Lentil soup")
    expect(recipe?.steps).toEqual([
      "Rinse the lentils.",
      "Simmer for 30 minutes.",
    ])
  })

  it("finds a Recipe nested in another entity or listed with other types", () => {
    const nested = page({
      "@type": "WebPage",
      mainEntity: { "@type": ["Recipe", "NewsArticle"], name: "Focaccia" },
    })
    expect(parseRecipe(nested, url)?.title).toBe("Focaccia")

    const prefixed = page({ "@type": "schema:Recipe", name: "Scones" })
    expect(parseRecipe(prefixed, url)?.title).toBe("Scones")
  })

  it("skips JSON-LD that isn't a recipe or doesn't parse", () => {
    const html = page(
      "{ not json",
      { "@type": "Organization", name: "A food blog" },
      { "@type": "Recipe", name: "Pancakes" }
    )
    expect(parseRecipe(html, url)?.title).toBe("Pancakes")
  })

  it("flattens HowToSections into steps", () => {
    const html = page({
      "@type": "Recipe",
      name: "Layer cake",
      recipeInstructions: [
        {
          "@type": "HowToSection",
          name: "Cake",
          itemListElement: [{ "@type": "HowToStep", text: "Bake the layers." }],
        },
        {
          "@type": "HowToSection",
          name: "Frosting",
          itemListElement: [
            { "@type": "HowToStep", name: "Whip the butter." },
            { "@type": "HowToStep", text: "Frost the cake." },
          ],
        },
      ],
    })

    expect(parseRecipe(html, url)?.steps).toEqual([
      "Bake the layers.",
      "Whip the butter.",
      "Frost the cake.",
    ])
  })

  it("splits instructions given as one block of text or HTML", () => {
    const text = page({
      "@type": "Recipe",
      name: "Rice",
      recipeInstructions: "1. Rinse the rice.\n2. Boil the water.\n\n3. Cover.",
    })
    expect(parseRecipe(text, url)?.steps).toEqual([
      "Rinse the rice.",
      "Boil the water.",
      "Cover.",
    ])

    const html = page({
      "@type": "Recipe",
      name: "Rice",
      recipeInstructions:
        "<ol><li>Rinse the <b>rice</b>.</li><li>Boil the water.</li></ol>",
    })
    expect(parseRecipe(html, url)?.steps).toEqual([
      "Rinse the rice.",
      "Boil the water.",
    ])
  })

  it("decodes HTML entities and strips tags from text", () => {
    const html = page({
      "@type": "Recipe",
      name: "Mom&#8217;s mac &amp; cheese",
      description: "<p>Creamy &amp; <em>cheesy</em>.</p>",
      recipeIngredient: ["&frac12; cup milk", "8 oz cheddar,&nbsp;grated"],
    })

    const recipe = parseRecipe(html, url)
    expect(recipe?.title).toBe("Mom’s mac & cheese")
    expect(recipe?.description).toBe("Creamy & cheesy.")
    expect(recipe?.ingredients).toEqual(["½ cup milk", "8 oz cheddar, grated"])
  })

  it("prefers a descriptive yield and formats durations", () => {
    const html = page({
      "@type": "Recipe",
      name: "Chili",
      recipeYield: ["6", "6 bowls"],
      prepTime: "PT90M",
      cookTime: "P0DT2H5M",
    })

    const recipe = parseRecipe(html, url)
    expect(recipe?.servings).toBe("6 bowls")
    expect(recipe?.prepTime).toBe("1 hr 30 min")
    expect(recipe?.cookTime).toBe("2 hr 5 min")
  })

  it("keeps a yield given as a number and a time that isn't ISO 8601", () => {
    const html = page({
      "@type": "Recipe",
      name: "Cookies",
      recipeYield: 24,
      prepTime: "about 20 minutes",
      cookTime: "PT0M",
    })

    const recipe = parseRecipe(html, url)
    expect(recipe?.servings).toBe("24")
    expect(recipe?.prepTime).toBe("about 20 minutes")
    expect(recipe?.cookTime).toBe("")
  })

  it("clips fields to what a recipe can hold", () => {
    const html = page({
      "@type": "Recipe",
      name: "x".repeat(500),
      recipeIngredient: Array.from({ length: 300 }, (_, i) => `${i} g salt`),
    })

    const recipe = parseRecipe(html, url)
    expect(recipe?.title).toHaveLength(RECIPE_LIMITS.title)
    expect(recipe?.ingredients).toHaveLength(RECIPE_LIMITS.lines)
  })

  it("returns undefined when the page has no recipe", () => {
    expect(parseRecipe("<html><body>Hello</body></html>", url)).toBeUndefined()
    expect(
      parseRecipe(page({ "@type": "Article", headline: "News" }), url)
    ).toBeUndefined()
    expect(parseRecipe(page({ "@type": "Recipe" }), url)).toBeUndefined()
  })
})
