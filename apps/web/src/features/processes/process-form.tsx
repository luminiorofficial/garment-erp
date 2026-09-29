"use client";

import { useState } from "react";
import { createProcessSchema } from "@garment-erp/validation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/form-field";
import { FormFooter } from "@/components/common/form-parts";
import { blankToUndefined, formErrorsFromZod, withNulls, type FormErrors } from "@/lib/forms";
import type { Process } from "./types";
import { useCreateProcess, useUpdateProcess } from "./queries";

/** Create (no `process`) or edit (with `process`). Status is changed from the list, not here. */
export function ProcessForm({ process, onDone }: { process?: Process; onDone: () => void }) {
  const create = useCreateProcess();
  const update = useUpdateProcess();
  const mutation = process ? update : create;

  const [code, setCode] = useState(process?.code ?? "");
  const [name, setName] = useState(process?.name ?? "");
  const [description, setDescription] = useState(process?.description ?? "");
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;

    const parsed = createProcessSchema.safeParse({
      code,
      name,
      description: blankToUndefined(description),
    });
    if (!parsed.success) {
      setErrors(formErrorsFromZod(parsed.error));
      return;
    }
    setErrors({ fields: {} });

    if (process) {
      update.mutate(
        { id: process.id, data: withNulls(parsed.data, ["description"]) },
        { onSuccess: onDone }
      );
    } else {
      create.mutate(parsed.data, { onSuccess: onDone });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField label="Code" required error={errors.fields.code} hint="Letters, digits, - and _">
        {(control) => (
          <Input {...control} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
        )}
      </FormField>
      <FormField label="Name" required error={errors.fields.name}>
        {(control) => <Input {...control} value={name} onChange={(e) => setName(e.target.value)} />}
      </FormField>
      <FormField label="Description" error={errors.fields.description}>
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}
      </FormField>
      <FormFooter
        isPending={mutation.isPending}
        submitLabel={process ? "Save changes" : "Create process"}
        onCancel={onDone}
        error={mutation.error}
        formError={errors.form}
      />
    </form>
  );
}
