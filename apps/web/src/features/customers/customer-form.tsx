"use client";

import { useState } from "react";
import { createCustomerSchema } from "@garment-erp/validation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/form-field";
import { FormFooter } from "@/components/common/form-parts";
import { blankToUndefined, formErrorsFromZod, withNulls, type FormErrors } from "@/lib/forms";
import { useCreateCustomer, useUpdateCustomer } from "./queries";
import type { Customer } from "./types";

/** Create (no `customer`) or edit (with `customer`). Status is changed via activate/deactivate. */
export function CustomerForm({
  customer,
  onDone,
}: {
  customer?: Customer;
  onDone: (saved?: Customer) => void;
}) {
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const mutation = customer ? update : create;

  const [code, setCode] = useState(customer?.code ?? "");
  const [name, setName] = useState(customer?.name ?? "");
  const [billingAddress, setBillingAddress] = useState(customer?.billingAddress ?? "");
  const [shippingAddress, setShippingAddress] = useState(customer?.shippingAddress ?? "");
  const [paymentTerms, setPaymentTerms] = useState(customer?.paymentTerms ?? "");
  const [taxInformation, setTaxInformation] = useState(customer?.taxInformation ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;

    const parsed = createCustomerSchema.safeParse({
      code,
      name,
      billingAddress: blankToUndefined(billingAddress),
      shippingAddress: blankToUndefined(shippingAddress),
      paymentTerms: blankToUndefined(paymentTerms),
      taxInformation: blankToUndefined(taxInformation),
      notes: blankToUndefined(notes),
    });
    if (!parsed.success) {
      setErrors(formErrorsFromZod(parsed.error));
      return;
    }
    setErrors({ fields: {} });

    if (customer) {
      update.mutate(
        {
          id: customer.id,
          data: withNulls(parsed.data, [
            "billingAddress",
            "shippingAddress",
            "paymentTerms",
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
        submitLabel={customer ? "Save changes" : "Create customer"}
        onCancel={() => onDone()}
        error={mutation.error}
        formError={errors.form}
      />
    </form>
  );
}
