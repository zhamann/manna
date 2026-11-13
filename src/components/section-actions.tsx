import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react"
import { useState } from "react"

import { DeleteSectionDialog } from "@/components/delete-section-dialog"
import { SectionDialog } from "@/components/section-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuAction } from "@/components/ui/sidebar"
import type { Section } from "@/server/library"

export function SectionActions({
  section,
  recipeCount,
}: {
  section: Section
  recipeCount: number
}) {
  const [dialog, setDialog] = useState<"edit" | "delete">()
  const close = (open: boolean) => !open && setDialog(undefined)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
          <IconDots />
          <span className="sr-only">Actions for {section.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDialog("edit")}>
            <IconPencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDialog("delete")}
          >
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SectionDialog
        key={`${section.name}:${section.color}`}
        section={section}
        open={dialog === "edit"}
        onOpenChange={close}
      />
      <DeleteSectionDialog
        section={section}
        recipeCount={recipeCount}
        open={dialog === "delete"}
        onOpenChange={close}
      />
    </>
  )
}
