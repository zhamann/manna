import { IconTrash } from "@tabler/icons-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"

export function DeleteRecipeDialog({
  id,
  title,
}: {
  id: number
  title: string
}) {
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      const { error } = await actions.deleteRecipe({ id })
      if (!error) return window.location.assign("/")
      setError(error.message)
    })
  }

  return (
    <AlertDialog onOpenChange={() => setError(undefined)}>
      <AlertDialogTrigger
        render={<Button type="button" variant="destructive" />}
      >
        <IconTrash />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the recipe.
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
      </AlertDialogContent>
    </AlertDialog>
  )
}
