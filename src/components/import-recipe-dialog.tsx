import { IconWorldDownload } from "@tabler/icons-react"
import { actions, isInputError } from "astro:actions"
import { useId, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { ImportedRecipe } from "@/server/import"

/** Reads a recipe from a web page and hands it to `onImport`. */
export function ImportRecipeDialog({
  onImport,
}: {
  onImport: (recipe: ImportedRecipe) => void
}) {
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    // React bubbles events through portals, so without this the recipe form
    // this dialog sits in would submit too.
    event.stopPropagation()
    const url = String(new FormData(event.currentTarget).get("url"))

    startTransition(async () => {
      const { data, error } = await actions.importRecipe({ url })
      if (data) {
        setOpen(false)
        return onImport(data)
      }
      setError(isInputError(error) ? error.fields.url?.[0] : error.message)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) setError(undefined)
        setOpen(open)
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <IconWorldDownload />
        Import from a link
      </DialogTrigger>
      <DialogContent>
        {/* noValidate: the action accepts addresses pasted without https:// */}
        <form onSubmit={submit} className="grid gap-6" noValidate>
          <DialogHeader>
            <DialogTitle>Import from a link</DialogTitle>
            <DialogDescription>
              Paste the address of a recipe page. Manna fills in the form for
              you to check before saving.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={inputId}>Web address</FieldLabel>
            <Input
              id={inputId}
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://example.com/banana-bread"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              onChange={() => setError(undefined)}
              required
              autoFocus
            />
            <FieldError>{error}</FieldError>
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {pending ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
