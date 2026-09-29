"use client";

import { useState } from "react";
import { createStyleVersionSchema } from "@garment-erp/validation";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/form-field";
import { FormFooter } from "@/components/common/form-parts";
import { blankToUndefined, formErrorsFromZod, type FormErrors } from "@/lib/forms";
import { useCreateStyleVersion } from "./queries";

export function StyleVersionForm({ styleId, onDone }: { styleId: string; onDone: () => void }) {
  const create = useCreateStyleVersion(styleId);
  const [changeSummary, setChangeSummary] = useState("");
  const [specification, setSpecification] = useState("");
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (create.isPending) return;

    const parsed = createStyleVersionSchema.safeParse({
      changeSummary: blankToUndefined(changeSummary),
      specification: blankToUndefined(specification),
    });
    if (!parsed.success) {
      setErrors(formErrorsFromZod(parsed.error));
      return;
    }
    setErrors({ fields: {} });
    create.mutate(parsed.data, { onSuccess: onDone });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField label="Change summary" error={errors.fields.changeSummary}>
        {(control) => (
          <Textarea
            {...control}
            rows={2}
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            autoFocus
          />
        )}
      </FormField>
      <FormField
        label="Specification"
        error={errors.fields.specification}
        hint="The style definition for this version."
      >
        {(control) => (
          <Textarea
            {...control}
            rows={6}
            value={specification}
            onChange={(e) => setSpecification(e.target.value)}
          />
        )}
      </FormField>
      <p className="text-xs text-muted-foreground">
        Versions cannot be edited or removed once created.
      </p>
      <FormFooter
        isPending={create.isPending}
        submitLabel="Create version"
        onCancel={onDone}
        error={create.error}
        formError={errors.form}
      />
    </form>
  );
}
