"use client";

import { useState } from "react";
import {
  SUPPLIER_RATING_MAX,
  SUPPLIER_RATING_MIN,
  createSupplierSchema,
} from "@garment-erp/validation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/form-field";
import { FormFooter } from "@/components/common/form-parts";
import { SimpleSelect } from "@/components/common/simple-select";
import {
  blankToUndefined,
  formErrorsFromZod,
  numberOrUndefined,
  withNulls,
  type FormErrors,
} from "@/lib/forms";
import { useCreateSupplier, useUpdateSupplier } from "./queries";
import type { Supplier } from "./types";

const NOT_RATED = "none";

export const RATING_OPTIONS = [
  { value: NOT_RATED, label: "Not rated" },
  ...Array.from({ length: SUPPLIER_RATING_MAX - SUPPLIER_RATING_MIN + 1 }, (_, i) => {
    const n = SUPPLIER_RATING_MIN + i;
    return { value: String(n), label: `${n} / ${SUPPLIER_RATING_MAX}` };
  }),
];

export function SupplierForm({
  supplier,
  onDone,
}: {
  supplier?: Supplier;
  onDone: (saved?: Supplier) => void;
}) {
  const create = useCreateSupplier();
  const update = useUpdateSupplier();
  const mutation = supplier ? update : create;

  const [code, setCode] = useState(supplier?.code ?? "");
  const [name, setName] = useState(supplier?.name ?? "");
  const [billingAddress, setBillingAddress] = useState(supplier?.billingAddress ?? "");
  const [shippingAddress, setShippingAddress] = useState(supplier?.shippingAddress ?? "");
  const [paymentTerms, setPaymentTerms] = useState(supplier?.paymentTerms ?? "");
  const [leadTimeDays, setLeadTimeDays] = useState(
    supplier?.leadTimeDays == null ? "" : String(supplier.leadTimeDays)
  );
  const [rating, setRating] = useState(supplier?.rating == null ? NOT_RATED : String(supplier.rating));
  const [taxInformation, setTaxInformation] = useState(supplier?.taxInformation ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;

    const parsed = createSupplierSchema.safeParse({
      code,
      name,
      billingAddress: blankToUndefined(billingAddress),
      shippingAddress: blankToUndefined(shippingAddress),
      paymentTerms: blankToUndefined(paymentTerms),
      leadTimeDays: numberOrUndefined(leadTimeDays),
      rating: rating === NOT_RATED ? undefined : Number(rating),
      taxInformation: blankToUndefined(taxInformation),
      notes: blankToUndefined(notes),
    });
    if (!parsed.success) {
      setErrors(formErrorsFromZod(parsed.error));
      return;
    }
    setErrors({ fields: {} });

    if (supplier) {
      update.mutate(
        {
          id: supplier.id,
          data: withNulls(parsed.data, [
            "billingAddress",
            "shippingAddress",
            "paymentTerms",
            "leadTimeDays",
            "rating",
            "taxInformation",
            "notes",
          ]),
        },
        { onSuccess: (saved) => onDone(saved) }
      );
    } else {
      create.mutate(parsed.data, { onSuccess: (saved) => onDone(saved) });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Lead time (days)" error={errors.fields.leadTimeDays} hint="0–365">
          {(control) => (
            <Input
              {...control}
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              step={1}
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Rating" error={errors.fields.rating}>
          {(control) => (
            <SimpleSelect
              id={control.id}
              invalid={Boolean(control["aria-invalid"])}
              value={rating}
              onValueChange={setRating}
              options={RATING_OPTIONS}
            />
          )}
        </FormField>
      </div>
      <FormField label="Billing address" error={errors.fields.billingAddress}>
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Shipping address" error={errors.fields.shippingAddress}>
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
          />
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Payment terms" error={errors.fields.paymentTerms}>
          {(control) => (
            <Input
              {...control}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Tax information" error={errors.fields.taxInformation}>
          {(control) => (
            <Input
              {...control}
              value={taxInformation}
              onChange={(e) => setTaxInformation(e.target.value)}
            />
          )}
        </FormField>
      </div>
      <FormField label="Notes" error={errors.fields.notes}>
        {(control) => (
          <Textarea {...control} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        )}
      </FormField>
      <FormFooter
        isPending={mutation.isPending}
        submitLabel={supplier ? "Save changes" : "Create supplier"}
        onCancel={() => onDone()}
        error={mutation.error}
        formError={errors.form}
      />
    </form>
  );
}
