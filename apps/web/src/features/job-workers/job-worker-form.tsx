"use client";

import { useState } from "react";
import { createJobWorkerSchema } from "@garment-erp/validation";
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
import { useCreateJobWorker, useUpdateJobWorker } from "./queries";
import type { JobWorker } from "./types";
import { NONE, useJobWorkerReferences } from "./use-references";

export function JobWorkerForm({
  jobWorker,
  onDone,
}: {
  jobWorker?: JobWorker;
  onDone: (saved?: JobWorker) => void;
}) {
  const create = useCreateJobWorker();
  const update = useUpdateJobWorker();
  const mutation = jobWorker ? update : create;
  const refs = useJobWorkerReferences();

  const [code, setCode] = useState(jobWorker?.code ?? "");
  const [name, setName] = useState(jobWorker?.name ?? "");
  const [contactPerson, setContactPerson] = useState(jobWorker?.contactPerson ?? "");
  const [email, setEmail] = useState(jobWorker?.email ?? "");
  const [phone, setPhone] = useState(jobWorker?.phone ?? "");
  const [billingAddress, setBillingAddress] = useState(jobWorker?.billingAddress ?? "");
  const [operatingAddress, setOperatingAddress] = useState(jobWorker?.operatingAddress ?? "");
  const [processId, setProcessId] = useState(jobWorker?.processId ?? NONE);
  const [capacityPerDay, setCapacityPerDay] = useState(
    jobWorker?.capacityPerDay == null ? "" : String(jobWorker.capacityPerDay)
  );
  const [capacityUnitId, setCapacityUnitId] = useState(jobWorker?.capacityUnitId ?? NONE);
  const [leadTimeDays, setLeadTimeDays] = useState(
    jobWorker?.leadTimeDays == null ? "" : String(jobWorker.leadTimeDays)
  );
  const [rateAgreement, setRateAgreement] = useState(jobWorker?.rateAgreement ?? "");
  const [paymentTerms, setPaymentTerms] = useState(jobWorker?.paymentTerms ?? "");
  const [taxInformation, setTaxInformation] = useState(jobWorker?.taxInformation ?? "");
  const [notes, setNotes] = useState(jobWorker?.notes ?? "");
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });

  const processOptions = [
    { value: NONE, label: "No process" },
    ...refs.processOptions(jobWorker?.processId),
  ];
  const unitOptions = [
    { value: NONE, label: "No unit" },
    ...refs.unitOptions(jobWorker?.capacityUnitId),
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;

    // The schema owns every rule, including "capacity and unit are set together".
    const parsed = createJobWorkerSchema.safeParse({
      code,
      name,
      contactPerson: blankToUndefined(contactPerson),
      email: blankToUndefined(email),
      phone: blankToUndefined(phone),
      billingAddress: blankToUndefined(billingAddress),
      operatingAddress: blankToUndefined(operatingAddress),
      processId: processId === NONE ? undefined : processId,
      capacityPerDay: numberOrUndefined(capacityPerDay),
      capacityUnitId: capacityUnitId === NONE ? undefined : capacityUnitId,
      leadTimeDays: numberOrUndefined(leadTimeDays),
      rateAgreement: blankToUndefined(rateAgreement),
      paymentTerms: blankToUndefined(paymentTerms),
      taxInformation: blankToUndefined(taxInformation),
      notes: blankToUndefined(notes),
    });
    if (!parsed.success) {
      setErrors(formErrorsFromZod(parsed.error));
      return;
    }
    setErrors({ fields: {} });

    if (jobWorker) {
      update.mutate(
        {
          id: jobWorker.id,
          data: withNulls(parsed.data, [
            "contactPerson",
            "email",
            "phone",
            "billingAddress",
            "operatingAddress",
            "processId",
            "capacityPerDay",
            "capacityUnitId",
            "leadTimeDays",
            "rateAgreement",
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

  const processHint = !refs.canViewProcesses
    ? "You need the processes.view permission to change this."
    : refs.processes.isError
      ? "Could not load processes."
      : undefined;
  const unitHint = !refs.canViewUnits
    ? "You need the units.view permission to change this."
    : refs.units.isError
      ? "Could not load units."
      : "Set together with capacity per day.";

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

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Contact person" error={errors.fields.contactPerson}>
          {(control) => (
            <Input
              {...control}
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Email" error={errors.fields.email}>
          {(control) => (
            <Input
              {...control}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Phone" error={errors.fields.phone}>
          {(control) => <Input {...control} value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </FormField>
      </div>

      <FormField label="Process" error={errors.fields.processId} hint={processHint}>
        {(control) => (
          <SimpleSelect
            id={control.id}
            invalid={Boolean(control["aria-invalid"])}
            value={processId}
            onValueChange={setProcessId}
            options={processOptions}
            disabled={!refs.canViewProcesses || refs.processes.isPending}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Capacity per day" error={errors.fields.capacityPerDay}>
          {(control) => (
            <Input
              {...control}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={capacityPerDay}
              disabled={!refs.canViewUnits}
              onChange={(e) => setCapacityPerDay(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Capacity unit" error={errors.fields.capacityUnitId} hint={unitHint}>
          {(control) => (
            <SimpleSelect
              id={control.id}
              invalid={Boolean(control["aria-invalid"])}
              value={capacityUnitId}
              onValueChange={setCapacityUnitId}
              options={unitOptions}
              disabled={!refs.canViewUnits || refs.units.isPending}
            />
          )}
        </FormField>
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
      </div>

      <FormField label="Billing address" error={errors.fields.billingAddress}>
        {(control) => (
          <Textarea
            {...control}
            rows={2}
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Operating address" error={errors.fields.operatingAddress}>
        {(control) => (
          <Textarea
            {...control}
            rows={2}
            value={operatingAddress}
            onChange={(e) => setOperatingAddress(e.target.value)}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Rate agreement" error={errors.fields.rateAgreement}>
          {(control) => (
            <Input
              {...control}
              value={rateAgreement}
              onChange={(e) => setRateAgreement(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Payment terms" error={errors.fields.paymentTerms}>
          {(control) => (
            <Input
              {...control}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          )}
        </FormField>
      </div>
      <FormField label="Tax information" error={errors.fields.taxInformation}>
        {(control) => (
          <Input
            {...control}
            value={taxInformation}
            onChange={(e) => setTaxInformation(e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Notes" error={errors.fields.notes}>
        {(control) => (
          <Textarea {...control} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        )}
      </FormField>

      <FormFooter
        isPending={mutation.isPending}
        submitLabel={jobWorker ? "Save changes" : "Create job worker"}
        onCancel={() => onDone()}
        error={mutation.error}
        formError={errors.form}
      />
    </form>
  );
}
