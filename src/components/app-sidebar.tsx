import { IconFolderPlus, IconPlus, IconSettings } from "@tabler/icons-react"
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { storeCollapsedSections } from "@/lib/collapsed-sections"
import { APP_HUE, nextHue } from "@/lib/hues"
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

  function setSectionOpen(id: number, open: boolean) {
    const next = new Set(collapsed)
    if (open) next.delete(id)
    else next.add(id)
    setCollapsed(next)
    storeCollapsedSections(next)
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="gap-3 px-2"
              render={<a href="/" />}
            >
              {/* The logo always wears Manna's own color. */}
              <div
                data-hue={APP_HUE}
                className="flex aspect-square size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"
              >
                <MannaMark className="size-5" />
              </div>
              <span className="type-display text-xl">Manna</span>
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
                    <SidebarMenuButton
                      className="gap-2.5 font-semibold"
                      render={<CollapsibleTrigger />}
                    >
                      <span
                        data-hue={section.color}
                        className="size-2.5 shrink-0 rounded-full bg-swatch ring-2 ring-sidebar-accent"
                      />
                      <span className="truncate">{section.name}</span>
                    </SidebarMenuButton>
                    {/* Makes way for the actions button, which shows on hover. */}
                    <SidebarMenuBadge className="opacity-60 max-md:hidden md:group-focus-within/menu-item:opacity-0 md:group-hover/menu-item:opacity-0 md:group-has-[[data-sidebar=menu-action][aria-expanded=true]]/menu-item:opacity-0">
                      {recipeCounts.get(section.id)}
                    </SidebarMenuBadge>
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
                                className="h-auto min-h-7 py-1"
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
            <SectionDialog
              trigger={<SidebarMenuButton />}
              color={nextHue(sections.map((section) => section.color))}
            >
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
