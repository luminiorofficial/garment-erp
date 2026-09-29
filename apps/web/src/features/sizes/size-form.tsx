"use client";

import { useState } from "react";
import {
  SIZE_SEQUENCE_MAX,
  SIZE_SEQUENCE_MIN,
  createSizeSchema,
} from "@garment-erp/validation";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/form-field";
import { FormFooter } from "@/components/common/form-parts";
import {
  blankToUndefined,
  formErrorsFromZod,
  numberOrUndefined,
  withNulls,
  type FormErrors,
} from "@/lib/forms";
import { useCreateSize, useUpdateSize } from "./queries";
import type { Size } from "./types";

export function SizeForm({ size, onDone }: { size?: Size; onDone: () => void }) {
  const create = useCreateSize();
  const update = useUpdateSize();
  const mutation = size ? update : create;

  const [code, setCode] = useState(size?.code ?? "");
  const [name, setName] = useState(size?.name ?? "");
  const [sequence, setSequence] = useState(size ? String(size.sequence) : "");
  const [description, setDescription] = useState(size?.description ?? "");
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;

    const parsed = createSizeSchema.safeParse({
      code,
      name,
      sequence: numberOrUndefined(sequence),
      description: blankToUndefined(description),
    });
    if (!parsed.success) {
      setErrors(formErrorsFromZod(parsed.error));
      return;
    }
    setErrors({ fields: {} });

    if (size) {
      update.mutate(
        { id: size.id, data: withNulls(parsed.data, ["description"]) },
        { onSuccess: onDone }
      );
    } else {
      create.mutate(parsed.data, { onSuccess: onDone });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Code" required error={errors.fields.code} hint="e.g. S, M, XL, 30/32">
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
        label="Sequence"
        required
        error={errors.fields.sequence}
        hint={`Display order, ${SIZE_SEQUENCE_MIN}–${SIZE_SEQUENCE_MAX}; smaller comes first.`}
      >
        {(control) => (
          <Input
            {...control}
            type="number"
            inputMode="numeric"
            min={SIZE_SEQUENCE_MIN}
            max={SIZE_SEQUENCE_MAX}
            step={1}
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Description" error={errors.fields.description}>
        {(control) => (
          <Input
            {...control}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}
      </FormField>
      <FormFooter
        isPending={mutation.isPending}
        submitLabel={size ? "Save changes" : "Create size"}
        onCancel={onDone}
        error={mutation.error}
        formError={errors.form}
      />
    </form>
  );
}
