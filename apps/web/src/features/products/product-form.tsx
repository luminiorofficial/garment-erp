"use client";

import { useState } from "react";
import { createProductSchema } from "@garment-erp/validation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/form-field";
import { FormFooter } from "@/components/common/form-parts";
import { blankToUndefined, formErrorsFromZod, withNulls, type FormErrors } from "@/lib/forms";
import { useCreateProduct, useUpdateProduct } from "./queries";
import type { Product } from "./types";

export function ProductForm({
  product,
  onDone,
}: {
  product?: Product;
  onDone: (saved?: Product) => void;
}) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const mutation = product ? update : create;

  const [code, setCode] = useState(product?.code ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;

    const parsed = createProductSchema.safeParse({
      code,
      name,
      category,
      description: blankToUndefined(description),
    });
    if (!parsed.success) {
      setErrors(formErrorsFromZod(parsed.error));
      return;
    }
    setErrors({ fields: {} });

    if (product) {
      update.mutate(
        { id: product.id, data: withNulls(parsed.data, ["description"]) },
        { onSuccess: (saved) => onDone(saved) }
      );
    } else {
      create.mutate(parsed.data, { onSuccess: (saved) => onDone(saved) });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Code" required error={errors.fields.code} hint="Letters, digits, - and _">
          {(control) => (
            <Input {...control} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
          )}
        </FormField>
        <FormField label="Category" required error={errors.fields.category} hint="e.g. Tops, Bottoms">
          {(control) => (
            <Input {...control} value={category} onChange={(e) => setCategory(e.target.value)} />
          )}
        </FormField>
      </div>
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
        submitLabel={product ? "Save changes" : "Create product"}
        onCancel={() => onDone()}
        error={mutation.error}
        formError={errors.form}
      />
    </form>
  );
}
