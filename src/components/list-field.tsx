import {
  IconArrowDown,
  IconArrowUp,
  IconPlus,
  IconX,
} from "@tabler/icons-react"
import { useId, useRef } from "react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { splitLines } from "@/lib/lines"

export interface Row {
  key: number
  text: string
}

let nextKey = 0

export function toRows(texts: string[]): Row[] {
  return texts.map((text) => ({ key: nextKey++, text }))
}

type Control = HTMLInputElement | HTMLTextAreaElement

/**
 * An editable list with one control per entry. Enter in a single-line entry
 * starts a new entry; pasting several lines splits them into entries.
 */
export function ListField({
  legend,
  itemLabel,
  rows,
  onRowsChange,
  multiline = false,
  placeholder,
  error,
}: {
  legend: string
  /** Names one entry, e.g. "Step", for labels and the add button. */
  itemLabel: string
  rows: Row[]
  onRowsChange: (rows: Row[]) => void
  multiline?: boolean
  placeholder?: string
  error?: string
}) {
  const id = useId()
  const focusKey = useRef<number>(undefined)
  const Control = multiline ? Textarea : Input

  function update(rows: Row[], focus?: number) {
    focusKey.current = focus
    onRowsChange(rows)
  }

  function insertAfter(index: number) {
    const [row] = toRows([""])
    update(rows.toSpliced(index + 1, 0, row), row.key)
  }

  function move(index: number, offset: number) {
    const next = rows.toSpliced(index, 1)
    update(next.toSpliced(index + offset, 0, rows[index]))
  }

  function paste(index: number, event: React.ClipboardEvent<Control>) {
    const pasted = event.clipboardData.getData("text")
    if (!/\r?\n/.test(pasted)) return

    const { value, selectionStart, selectionEnd } = event.currentTarget
    const texts = splitLines(
      value.slice(0, selectionStart ?? value.length) +
        pasted +
        value.slice(selectionEnd ?? value.length)
    )
    if (texts.length === 0) return

    event.preventDefault()
    const pastedRows = toRows(texts)
    pastedRows[0].key = rows[index].key
    update(rows.toSpliced(index, 1, ...pastedRows), pastedRows.at(-1)?.key)
  }

  return (
    <FieldSet>
      <FieldLegend>{legend}</FieldLegend>
      <FieldGroup className="gap-3">
        {rows.map((row, index) => (
          <div key={row.key} className="flex items-start gap-2">
            <FieldLabel
              htmlFor={`${id}-${row.key}`}
              className={multiline ? "min-w-4 pt-3 tabular-nums" : "sr-only"}
            >
              <span className="sr-only">{itemLabel} </span>
              {index + 1}
            </FieldLabel>
            <Control
              id={`${id}-${row.key}`}
              ref={(element: Control | null) => {
                if (element && focusKey.current === row.key) {
                  element.focus()
                  focusKey.current = undefined
                }
              }}
              value={row.text}
              placeholder={index === 0 ? placeholder : undefined}
              onChange={(event) =>
                update(rows.with(index, { ...row, text: event.target.value }))
              }
              onPaste={(event) => paste(index, event)}
              onKeyDown={(event) => {
                if (multiline || event.key !== "Enter") return
                event.preventDefault()
                insertAfter(index)
              }}
            />
            <ButtonGroup>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <IconArrowUp />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} down`}
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                <IconArrowDown />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                onClick={() => update(rows.toSpliced(index, 1))}
              >
                <IconX />
              </Button>
            </ButtonGroup>
          </div>
        ))}
        <FieldError>{error}</FieldError>
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => insertAfter(rows.length - 1)}
          >
            <IconPlus />
            Add {itemLabel.toLowerCase()}
          </Button>
        </div>
      </FieldGroup>
    </FieldSet>
  )
}
