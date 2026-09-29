"use client";

import { useState } from "react";
import {
  UNIT_DECIMAL_PLACES_MAX,
  UNIT_DECIMAL_PLACES_MIN,
  createUnitSchema,
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
import type { Unit } from "./types";
import { useCreateUnit, useUpdateUnit } from "./queries";

export function UnitForm({ unit, onDone }: { unit?: Unit; onDone: () => void }) {
  const create = useCreateUnit();
  const update = useUpdateUnit();
  const mutation = unit ? update : create;

  const [code, setCode] = useState(unit?.code ?? "");
  const [name, setName] = useState(unit?.name ?? "");
  const [symbol, setSymbol] = useState(unit?.symbol ?? "");
  const [decimalPlaces, setDecimalPlaces] = useState(String(unit?.decimalPlaces ?? 0));
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;

    const parsed = createUnitSchema.safeParse({
      code,
      name,
      symbol: blankToUndefined(symbol),
      decimalPlaces: numberOrUndefined(decimalPlaces),
    });
    if (!parsed.success) {
      setErrors(formErrorsFromZod(parsed.error));
      return;
    }
    setErrors({ fields: {} });

    if (unit) {
      update.mutate(
        { id: unit.id, data: withNulls(parsed.data, ["symbol"]) },
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Symbol" error={errors.fields.symbol}>
          {(control) => (
            <Input
              {...control}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. pcs"
            />
          )}
        </FormField>
        <FormField
          label="Decimal places"
          error={errors.fields.decimalPlaces}
          hint={`${UNIT_DECIMAL_PLACES_MIN}–${UNIT_DECIMAL_PLACES_MAX}`}
        >
          {(control) => (
            <Input
              {...control}
              type="number"
              inputMode="numeric"
              min={UNIT_DECIMAL_PLACES_MIN}
              max={UNIT_DECIMAL_PLACES_MAX}
              step={1}
              value={decimalPlaces}
              onChange={(e) => setDecimalPlaces(e.target.value)}
            />
          )}
        </FormField>
      </div>
      <FormFooter
        isPending={mutation.isPending}
        submitLabel={unit ? "Save changes" : "Create unit"}
        onCancel={onDone}
        error={mutation.error}
        formError={errors.form}
      />
    </form>
  );
}
