import { AppSidebar } from "@/components/app-sidebar"
import { SidebarSwipe } from "@/components/sidebar-swipe"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { SectionWithRecipes } from "@/server/library"

/**
 * The layout every page except cook mode renders inside: the sidebar on the
 * page's color, beside the page on a white card. On phones the color carries
 * on behind the toolbar and the page's `hero`, its title area.
 */
export function AppShell({
  sections,
  activeRecipeId,
  collapsedSectionIds,
  sidebarOpen,
  actions,
  hero,
  children,
}: {
  sections: SectionWithRecipes[]
  activeRecipeId?: number
  collapsedSectionIds: number[]
  sidebarOpen: boolean
  /** Buttons for the page, at the end of the toolbar. */
  actions?: React.ReactNode
  hero?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <SidebarProvider
      defaultOpen={sidebarOpen}
      className="surface-canvas bg-fixed"
      style={{ "--sidebar-width": "18rem" } as React.CSSProperties}
    >
      <SidebarSwipe />
      <AppSidebar
        sections={sections}
        activeRecipeId={activeRecipeId}
        collapsedSectionIds={collapsedSectionIds}
      />
      <SidebarInset className="min-w-0">
        <div className="flex flex-col max-md:rounded-b-4xl max-md:surface-canvas">
          <header className="flex h-14 shrink-0 items-center gap-2 px-3 md:h-16 md:px-4">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-2">{actions}</div>
          </header>
          {hero}
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
