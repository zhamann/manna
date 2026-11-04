import { actions } from "astro:actions"
import { useState, useTransition } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FieldError } from "@/components/ui/field"
import type { Section } from "@/server/library"

/** Deletes an empty section; explains why a section with recipes can't be. */
export function DeleteSectionDialog({
  section,
  recipeCount,
  open,
  onOpenChange,
}: {
  section: Section
  recipeCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      const { error } = await actions.deleteSection({ id: section.id })
      if (!error) return window.location.reload()
      setError(error.message)
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) setError(undefined)
        onOpenChange(open)
      }}
    >
      <AlertDialogContent>
        {recipeCount > 0 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>“{section.name}” isn’t empty</AlertDialogTitle>
              <AlertDialogDescription>
                It still has {recipeCount}{" "}
                {recipeCount === 1 ? "recipe" : "recipes"}. Move or delete them
                before deleting the section.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>OK</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{section.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                The section is empty, so no recipes are affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <FieldError>{error}</FieldError>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending}
                onClick={remove}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
