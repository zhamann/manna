import { actions, isInputError } from "astro:actions"
import { useState, useTransition } from "react"

import { DeleteRecipeDialog } from "@/components/delete-recipe-dialog"
import { ListField, toRows } from "@/components/list-field"
import { cn } from "cn"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { Recipe, Section } from "@/server/library"

type Errors = Record<string, string[] | undefined>

/** Edits `recipe`, or creates a recipe in `sectionId` when none is given. */
export function RecipeForm({
  sections,
  recipe,
  sectionId,
}: {
  sections: Section[]
  recipe?: Recipe
  sectionId?: number
}) {
  const [ingredients, setIngredients] = useState(() =>
    toRows(recipe?.ingredients ?? [""])
  )
  const [steps, setSteps] = useState(() => toRows(recipe?.steps ?? [""]))
  const [errors, setErrors] = useState<Errors>({})
  const [pending, startTransition] = useTransition()

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? "")
    const input = {
      sectionId: Number(form.get("sectionId")),
      title: field("title"),
      description: field("description"),
      servings: field("servings"),
      prepTime: field("prepTime"),
      cookTime: field("cookTime"),
      sourceUrl: field("sourceUrl"),
      ingredients: ingredients.map((row) => row.text),
      steps: steps.map((row) => row.text),
      notes: field("notes"),
    }

    startTransition(async () => {
      const result = recipe
        ? await actions.updateRecipe({ ...input, id: recipe.id })
        : await actions.createRecipe(input)
      if (!result.error) {
        const id = recipe?.id ?? result.data?.id
        return window.location.assign(`/recipes/${id}`)
      }
      setErrors(
        isInputError(result.error)
          ? result.error.fields
          : { form: [result.error.message] }
      )
    })
  }

  const error = (name: string) => errors[name]?.[0]
  const invalid = (name: string) => (error(name) ? true : undefined)

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <Field data-invalid={invalid("title")}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            name="title"
            defaultValue={recipe?.title}
            placeholder="Banana bread"
            aria-invalid={invalid("title")}
            required
          />
          <FieldError>{error("title")}</FieldError>
        </Field>
        <Field data-invalid={invalid("sectionId")}>
          <FieldLabel htmlFor="sectionId">Section</FieldLabel>
          <NativeSelect
            id="sectionId"
            name="sectionId"
            aria-invalid={invalid("sectionId")}
            defaultValue={recipe?.sectionId ?? sectionId}
            className="w-full"
          >
            {sections.map((section) => (
              <NativeSelectOption key={section.id} value={section.id}>
                {section.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError>{error("sectionId")}</FieldError>
        </Field>
        <Field data-invalid={invalid("description")}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            aria-invalid={invalid("description")}
            defaultValue={recipe?.description}
            placeholder="A sentence or two about the dish."
          />
          <FieldError>{error("description")}</FieldError>
        </Field>
        <div className="grid gap-7 sm:grid-cols-3 sm:gap-4">
          <Field data-invalid={invalid("servings")}>
            <FieldLabel htmlFor="servings">Servings</FieldLabel>
            <Input
              id="servings"
              name="servings"
              aria-invalid={invalid("servings")}
              defaultValue={recipe?.servings}
              placeholder="1 loaf"
            />
            <FieldError>{error("servings")}</FieldError>
          </Field>
          <Field data-invalid={invalid("prepTime")}>
            <FieldLabel htmlFor="prepTime">Prep time</FieldLabel>
            <Input
              id="prepTime"
              name="prepTime"
              aria-invalid={invalid("prepTime")}
              defaultValue={recipe?.prepTime}
              placeholder="15 min"
            />
            <FieldError>{error("prepTime")}</FieldError>
          </Field>
          <Field data-invalid={invalid("cookTime")}>
            <FieldLabel htmlFor="cookTime">Cook time</FieldLabel>
            <Input
              id="cookTime"
              name="cookTime"
              aria-invalid={invalid("cookTime")}
              defaultValue={recipe?.cookTime}
              placeholder="1 hr"
            />
            <FieldError>{error("cookTime")}</FieldError>
          </Field>
        </div>
        <Field data-invalid={invalid("sourceUrl")}>
          <FieldLabel htmlFor="sourceUrl">Source</FieldLabel>
          <Input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            inputMode="url"
            defaultValue={recipe?.sourceUrl}
            placeholder="https://example.com/banana-bread"
            aria-invalid={invalid("sourceUrl")}
          />
          <FieldError>{error("sourceUrl")}</FieldError>
        </Field>
        <ListField
          legend="Ingredients"
          itemLabel="Ingredient"
          rows={ingredients}
          onRowsChange={setIngredients}
          placeholder="2 cups flour"
          error={error("ingredients")}
        />
        <ListField
          legend="Steps"
          itemLabel="Step"
          rows={steps}
          onRowsChange={setSteps}
          placeholder="Preheat the oven to 350°F."
          error={error("steps")}
          multiline
        />
        <Field data-invalid={invalid("notes")}>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea
            id="notes"
            name="notes"
            aria-invalid={invalid("notes")}
            defaultValue={recipe?.notes}
            placeholder="Substitutions, storage, what to try next time."
          />
          <FieldError>{error("notes")}</FieldError>
        </Field>
        <FieldError>{error("form")}</FieldError>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {recipe && <DeleteRecipeDialog id={recipe.id} title={recipe.title} />}
          <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
            <a
              href={recipe ? `/recipes/${recipe.id}` : "/"}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Cancel
            </a>
            <Button type="submit" disabled={pending}>
              {recipe ? "Save changes" : "Create recipe"}
            </Button>
          </div>
        </div>
      </FieldGroup>
    </form>
  )
}
