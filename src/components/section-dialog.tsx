import { IconFolderPlus } from "@tabler/icons-react"
import { actions, isInputError } from "astro:actions"
import { useId, useState, useTransition, type ReactElement } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { Section } from "@/server/library"

/** Creates a section, or renames `section` when one is given. */
export function SectionDialog({
  section,
  trigger,
  children,
  open,
  onOpenChange,
}: {
  section?: Section
  trigger?: ReactElement
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const inputId = useId()
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get("name"))

    startTransition(async () => {
      const { error } = section
        ? await actions.renameSection({ id: section.id, name })
        : await actions.createSection({ name })
      if (!error) return window.location.reload()
      setError(isInputError(error) ? error.fields.name?.[0] : error.message)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) setError(undefined)
        onOpenChange?.(open)
      }}
    >
      {trigger && <DialogTrigger render={trigger}>{children}</DialogTrigger>}
      <DialogContent>
        <form onSubmit={submit} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>
              {section ? "Rename section" : "New section"}
            </DialogTitle>
          </DialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={inputId}>Name</FieldLabel>
            <Input
              id={inputId}
              name="name"
              defaultValue={section?.name}
              placeholder="Baking"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
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
              {section ? "Save" : "Create section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function NewSectionButton() {
  return (
    <SectionDialog trigger={<Button />}>
      <IconFolderPlus />
      New section
    </SectionDialog>
  )
}
