import {
  IconFolderPlus,
  IconMinus,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react"
import * as React from "react"

import { MannaMark } from "@/components/manna-mark"
import { SearchForm } from "@/components/search-form"
import { SectionActions } from "@/components/section-actions"
import { SectionDialog } from "@/components/section-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { storeCollapsedSections } from "@/lib/collapsed-sections"
import { filterSections } from "@/lib/search"
import type { SectionWithRecipes } from "@/server/library"

export function AppSidebar({
  sections,
  activeRecipeId,
  collapsedSectionIds,
}: {
  sections: SectionWithRecipes[]
  activeRecipeId?: number
  collapsedSectionIds: number[]
}) {
  const [query, setQuery] = React.useState("")
  const [collapsed, setCollapsed] = React.useState(
    () => new Set(collapsedSectionIds)
  )
  const activeRef = React.useRef<HTMLAnchorElement>(null)

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" })
  }, [])

  const searching = query.trim() !== ""
  const visibleSections = filterSections(sections, query)
  const recipeCounts = new Map(sections.map((s) => [s.id, s.recipes.length]))
  const recipeCount = sections.reduce((n, s) => n + s.recipes.length, 0)

  function setSectionOpen(id: number, open: boolean) {
    const next = new Set(collapsed)
    if (open) next.delete(id)
    else next.add(id)
    setCollapsed(next)
    storeCollapsedSections(next)
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <MannaMark className="size-5" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-heading text-lg">Manna</span>
                <span className="text-xs text-muted-foreground">
                  {recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchForm value={query} onValueChange={setQuery} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {searching && visibleSections.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyDescription>No recipes match “{query}”.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <SidebarMenu>
              {visibleSections.map((section) => (
                <Collapsible
                  key={section.id}
                  open={searching || !collapsed.has(section.id)}
                  onOpenChange={(open) =>
                    !searching && setSectionOpen(section.id, open)
                  }
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<CollapsibleTrigger />}>
                      {section.name}{" "}
                      <IconPlus className="ml-auto group-aria-expanded/menu-button:hidden" />
                      <IconMinus className="ml-auto hidden group-aria-expanded/menu-button:block" />
                    </SidebarMenuButton>
                    <SectionActions
                      section={section}
                      recipeCount={recipeCounts.get(section.id) ?? 0}
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {section.recipes.map((recipe) => {
                          const active = recipe.id === activeRecipeId
                          return (
                            <SidebarMenuSubItem key={recipe.id}>
                              <SidebarMenuSubButton
                                isActive={active}
                                render={
                                  <a
                                    ref={active ? activeRef : undefined}
                                    href={`/recipes/${recipe.id}`}
                                  />
                                }
                              >
                                {recipe.title}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            render={
                              <a href={`/recipes/new?section=${section.id}`} />
                            }
                          >
                            <IconPlus />
                            <span>Add recipe</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SectionDialog trigger={<SidebarMenuButton />}>
              <IconFolderPlus />
              <span>New section</span>
            </SectionDialog>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href="/settings" />}>
              <IconSettings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
