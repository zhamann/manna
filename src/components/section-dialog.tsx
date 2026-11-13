import { IconCheck, IconFolderPlus } from "@tabler/icons-react"
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
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { APP_HUE, HUE_LABELS, HUES, isHue, type Hue } from "@/lib/hues"
import type { Section } from "@/server/library"

/**
 * Creates a section, or edits `section` when one is given. `color` is the one
 * picked to start with for a new section.
 */
export function SectionDialog({
  section,
  color: initialColor = APP_HUE,
  trigger,
  children,
  open,
  onOpenChange,
}: {
  section?: Section
  color?: Hue
  trigger?: ReactElement
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const inputId = useId()
  const [color, setColor] = useState(section?.color ?? initialColor)
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get("name"))

    startTransition(async () => {
      const { error } = section
        ? await actions.updateSection({ id: section.id, name, color })
        : await actions.createSection({ name, color })
      if (!error) return window.location.reload()
      setError(isInputError(error) ? error.fields.name?.[0] : error.message)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) setError(undefined)
        // Each new section starts from the suggested color.
        if (open && !section) setColor(initialColor)
        onOpenChange?.(open)
      }}
    >
      {trigger && <DialogTrigger render={trigger}>{children}</DialogTrigger>}
      {/* The dialog previews the color picked. */}
      <DialogContent data-hue={color}>
        <form onSubmit={submit} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>
              {section ? "Edit section" : "New section"}
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
          <FieldSet>
            <FieldLegend variant="label">Color</FieldLegend>
            <ToggleGroup
              value={[color]}
              onValueChange={([value]) => isHue(value) && setColor(value)}
              spacing={1}
              className="flex-wrap"
            >
              {HUES.map((hue) => (
                <ToggleGroupItem
                  key={hue}
                  value={hue}
                  aria-label={HUE_LABELS[hue]}
                  className="size-10 px-0"
                >
                  <span
                    data-hue={hue}
                    className="flex size-6 items-center justify-center rounded-full bg-swatch text-primary-foreground"
                  >
                    <IconCheck className="hidden size-3.5 group-aria-pressed/toggle:block" />
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </FieldSet>
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
