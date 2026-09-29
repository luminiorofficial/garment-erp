"use client";

import { useState } from "react";
import { createStyleSchema } from "@garment-erp/validation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxGroup } from "@/components/common/checkbox-group";
import { FormField } from "@/components/common/form-field";
import { FormFooter } from "@/components/common/form-parts";
import { SimpleSelect } from "@/components/common/simple-select";
import { blankToUndefined, formErrorsFromZod, withNulls, type FormErrors } from "@/lib/forms";
import { useCreateStyle, useUpdateStyle } from "./queries";
import type { StyleDetail } from "./types";
import { useStyleReferences } from "./use-style-references";

const NONE = "none";

export function StyleForm({
  style,
  initialProductId,
  onDone,
}: {
  style?: StyleDetail;
  /** Pre-selects a product when creating from a filtered list. */
  initialProductId?: string;
  onDone: (saved?: StyleDetail) => void;
}) {
  const create = useCreateStyle();
  const update = useUpdateStyle();
  const mutation = style ? update : create;
  const refs = useStyleReferences();

  const [code, setCode] = useState(style?.code ?? "");
  const [name, setName] = useState(style?.name ?? "");
  const [productId, setProductId] = useState(style?.productId ?? initialProductId ?? "");
  const [customerId, setCustomerId] = useState(style?.customerId ?? NONE);
  const [description, setDescription] = useState(style?.description ?? "");
  const [sizeIds, setSizeIds] = useState<string[]>(style?.sizeIds ?? []);
  const [colorIds, setColorIds] = useState<string[]>(style?.colorIds ?? []);
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });

  const productOptions = refs.productOptions(style?.productId);
  // Without products.view the current product can't be named; keep it selected
  // (unchanged) rather than dropping it.
  if (style && !refs.canViewProducts) {
    productOptions.push({ value: style.productId, label: "Current product (name not visible)" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;

    // Size/color sets are only sent when the user could see and change them;
    // an absent set means "unchanged" to the API.
    const parsed = createStyleSchema.safeParse({
      code,
      name,
      productId: productId || undefined,
      customerId: customerId === NONE ? undefined : customerId,
      description: blankToUndefined(description),
      sizeIds: refs.canViewSizes ? sizeIds : undefined,
      colorIds: refs.canViewColors ? colorIds : undefined,
    });
    if (!parsed.success) {
      setErrors(formErrorsFromZod(parsed.error));
      return;
    }
    setErrors({ fields: {} });

    if (style) {
      update.mutate(
        {
          id: style.id,
          data: withNulls(parsed.data, ["customerId", "description"]),
        },
        { onSuccess: (saved) => onDone(saved) }
      );
    } else {
      create.mutate(parsed.data, { onSuccess: (saved) => onDone(saved) });
    }
  }

  const productHint = !refs.canViewProducts
    ? "You need the products.view permission to change this."
    : refs.products.isError
      ? "Could not load products."
      : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <FormField label="Style number" required error={errors.fields.code}>
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

      <FormField label="Product" required error={errors.fields.productId} hint={productHint}>
        {(control) => (
          <SimpleSelect
            id={control.id}
            invalid={Boolean(control["aria-invalid"])}
            value={productId}
            onValueChange={setProductId}
            options={productOptions}
            placeholder="Select a product"
            disabled={!refs.canViewProducts || refs.products.isPending}
          />
        )}
      </FormField>

      <FormField
        label="Customer"
        error={errors.fields.customerId}
        hint={
          !refs.canViewCustomers
            ? "You need the customers.view permission to change this."
            : refs.customers.isError
              ? "Could not load customers."
              : "Optional. Leave empty for a house style."
        }
      >
        {(control) => (
          <SimpleSelect
            id={control.id}
            invalid={Boolean(control["aria-invalid"])}
            value={customerId}
            onValueChange={setCustomerId}
            options={[
              { value: NONE, label: "No customer" },
              ...refs.customerOptions(style?.customerId),
            ]}
            disabled={!refs.canViewCustomers || refs.customers.isPending}
          />
        )}
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

      <CheckboxGroup
        legend="Allowed sizes"
        options={refs.sizeOptions(style?.sizeIds ?? [])}
        selected={sizeIds}
        onChange={setSizeIds}
        disabled={!refs.canViewSizes}
        error={errors.fields.sizeIds}
        emptyText={refs.sizes.isPending && refs.canViewSizes ? "Loading sizes…" : "No sizes available."}
        hint={
          !refs.canViewSizes
            ? "You need the sizes.view permission to change this."
            : refs.sizes.isError
              ? "Could not load sizes."
              : undefined
        }
      />

      <CheckboxGroup
        legend="Allowed colors"
        options={refs.colorOptions(style?.colorIds ?? [])}
        selected={colorIds}
        onChange={setColorIds}
        disabled={!refs.canViewColors}
        error={errors.fields.colorIds}
        emptyText={refs.colors.isPending && refs.canViewColors ? "Loading colors…" : "No colors available."}
        hint={
          !refs.canViewColors
            ? "You need the colors.view permission to change this."
            : refs.colors.isError
              ? "Could not load colors."
              : undefined
        }
      />

      <FormFooter
        isPending={mutation.isPending}
        submitLabel={style ? "Save changes" : "Create style"}
        onCancel={() => onDone()}
        error={mutation.error}
        formError={errors.form}
      />
    </form>
  );
}
