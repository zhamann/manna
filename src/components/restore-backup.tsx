import { IconUpload } from "@tabler/icons-react"
import { actions, isInputError } from "astro:actions"
import { useRef, useState, useTransition } from "react"

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
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import type { Backup } from "@/server/library"

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`

/** Picks a backup file and, once confirmed, replaces the library with it. */
export function RestoreBackup({
  sectionCount,
  recipeCount,
}: {
  sectionCount: number
  recipeCount: number
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [backup, setBackup] = useState<Backup>()
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  async function pick(file: File | undefined) {
    setError(undefined)
    if (!file) return
    try {
      setBackup(JSON.parse(await file.text()))
    } catch {
      setError("That file isn't valid JSON.")
    }
  }

  function restore() {
    if (!backup) return
    startTransition(async () => {
      const { error } = await actions.restoreBackup(backup)
      if (!error) return window.location.assign("/")
      setBackup(undefined)
      setError(isInputError(error) ? error.issues[0]?.message : error.message)
    })
  }

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          pick(event.target.files?.[0])
          event.target.value = ""
        }}
      />
      <Button variant="secondary" onClick={() => fileInput.current?.click()}>
        <IconUpload />
        Restore
      </Button>
      <FieldError>{error}</FieldError>
      <AlertDialog
        open={backup !== undefined}
        onOpenChange={(open) => !open && setBackup(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Replace everything with this backup?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your {count(sectionCount, "section")} and{" "}
              {count(recipeCount, "recipe")} will be replaced by the{" "}
              {count(backup?.sections?.length ?? 0, "section")} and{" "}
              {count(backup?.recipes?.length ?? 0, "recipe")} in the backup.
              This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={restore}
            >
              Replace everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
