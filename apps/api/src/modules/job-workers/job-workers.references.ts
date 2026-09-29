import { eq } from "drizzle-orm";
import type { Executor } from "../../db/client.js";
import { processes, units } from "../../db/schema/index.js";
import { ApiErrors } from "../../lib/api-error.js";

// SHARE locks serialize assignments with deactivation until the mutation commits.
// Unchanged historical relationships are intentionally not revalidated.
export async function validateJobWorkerReferences(
  input: { processId?: string | null; capacityUnitId?: string | null },
  executor: Executor,
  existing?: { processId: string | null; capacityUnitId: string | null },
) {
  if (input.processId && input.processId !== existing?.processId) {
    const [row] = await executor
      .select()
      .from(processes)
      .where(eq(processes.id, input.processId))
      .for("share");
    if (!row || !row.isActive)
      throw ApiErrors.validation("processId must reference an active process");
  }
  if (
    input.capacityUnitId &&
    input.capacityUnitId !== existing?.capacityUnitId
  ) {
    const [row] = await executor
      .select()
      .from(units)
      .where(eq(units.id, input.capacityUnitId))
      .for("share");
    if (!row || !row.isActive)
      throw ApiErrors.validation(
        "capacityUnitId must reference an active unit",
      );
  }
}
