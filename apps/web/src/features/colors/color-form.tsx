"use client";

import { useState } from "react";
import { createColorSchema } from "@garment-erp/validation";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/form-field";
import { FormFooter } from "@/components/common/form-parts";
import { blankToUndefined, formErrorsFromZod, withNulls, type FormErrors } from "@/lib/forms";
import { ColorSwatch } from "./color-swatch";
import { useCreateColor, useUpdateColor } from "./queries";
import type { Color } from "./types";

export function ColorForm({ color, onDone }: { color?: Color; onDone: () => void }) {
  const create = useCreateColor();
  const update = useUpdateColor();
  const mutation = color ? update : create;

  const [code, setCode] = useState(color?.code ?? "");
  const [name, setName] = useState(color?.name ?? "");
  const [reference, setReference] = useState(color?.reference ?? "");
  const [hexValue, setHexValue] = useState(color?.hexValue ?? "");
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;

    const parsed = createColorSchema.safeParse({
      code,
      name,
      reference: blankToUndefined(reference),
      hexValue: blankToUndefined(hexValue),
    });
    if (!parsed.success) {
      setErrors(formErrorsFromZod(parsed.error));
      return;
    }
    setErrors({ fields: {} });

    if (color) {
      update.mutate(
        { id: color.id, data: withNulls(parsed.data, ["reference", "hexValue"]) },
        { onSuccess: onDone }
      );
    } else {
      create.mutate(parsed.data, { onSuccess: onDone });
    }
  }

  const previewHex = /^#[0-9A-Fa-f]{6}$/.test(hexValue.trim()) ? hexValue.trim() : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Code" required error={errors.fields.code} hint="Letters, digits, - and _">
          {(control) => (
            <Input {...control} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
          )}
        </FormField>
        <FormField label="Name" required error={errors.fields.name}>
          {(control) => (
            <Input {...control} value={name} onChange={(e) => setName(e.target.value)} />
          )}
        </FormField>
      </div>
      <FormField
        label="Reference"
        error={errors.fields.reference}
        hint="Buyer or palette reference, e.g. a Pantone number."
      >
        {(control) => (
          <Input {...control} value={reference} onChange={(e) => setReference(e.target.value)} />
        )}
      </FormField>
      <FormField
        label="Display swatch (hex)"
        error={errors.fields.hexValue}
        hint="Optional, e.g. #1F3A5F. Only a screen preview, not a manufacturing shade."
      >
        {(control) => (
          <div className="flex items-center gap-2">
            <Input
              {...control}
              value={hexValue}
              onChange={(e) => setHexValue(e.target.value)}
              placeholder="#RRGGBB"
            />
            <ColorSwatch hex={previewHex} />
          </div>
        )}
      </FormField>
      <FormFooter
        isPending={mutation.isPending}
        submitLabel={color ? "Save changes" : "Create color"}
        onCancel={onDone}
        error={mutation.error}
        formError={errors.form}
      />
    </form>
  );
}
