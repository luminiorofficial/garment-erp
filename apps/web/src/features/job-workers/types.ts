import type { ListParams } from "@/lib/types";

/**
 * Shape of a job worker as returned by /api/job-workers. Process and capacity
 * unit are references (ids) into the Process and Unit masters; names come from
 * those masters, never from this record.
 */
export interface JobWorker {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  operatingAddress: string | null;
  processId: string | null;
  capacityPerDay: number | null;
  capacityUnitId: string | null;
  leadTimeDays: number | null;
  rateAgreement: string | null;
  paymentTerms: string | null;
  taxInformation: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobWorkerListParams extends ListParams {
  processId?: string;
}
