import { Fragment } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { SectionWithRecipes } from "@/server/library"

/** The sidebar layout every page except cook mode renders inside. */
export function AppShell({
  sections,
  activeRecipeId,
  collapsedSectionIds,
  sidebarOpen,
  breadcrumb,
  children,
}: {
  sections: SectionWithRecipes[]
  activeRecipeId?: number
  collapsedSectionIds: number[]
  sidebarOpen: boolean
  /** Trail from the outermost item to the current page. */
  breadcrumb: string[]
  children?: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar
        sections={sections}
        activeRecipeId={activeRecipeId}
        collapsedSectionIds={collapsedSectionIds}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumb.map((label, index) =>
                index < breadcrumb.length - 1 ? (
                  <Fragment key={index}>
                    <BreadcrumbItem className="hidden md:block">
                      {label}
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                  </Fragment>
                ) : (
                  <BreadcrumbItem key={index}>
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  </BreadcrumbItem>
                )
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
