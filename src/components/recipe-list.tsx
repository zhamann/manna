import { IconChevronRight } from "@tabler/icons-react"

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import type { RecipeSummary } from "@/server/library"

/** A titled list of recipe links, each showing its section. */
export function RecipeList({
  title,
  recipes,
}: {
  title: string
  recipes: RecipeSummary[]
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-2xl">{title}</h2>
      <ItemGroup className="gap-2">
        {recipes.map((recipe) => (
          <Item
            key={recipe.id}
            variant="outline"
            size="sm"
            render={<a href={`/recipes/${recipe.id}`} />}
          >
            <ItemContent className="min-w-0">
              <ItemTitle className="font-heading text-lg">
                {recipe.title}
              </ItemTitle>
              <ItemDescription>{recipe.sectionName}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <IconChevronRight className="text-muted-foreground" />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </section>
  )
}
