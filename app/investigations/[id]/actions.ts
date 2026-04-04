"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getInvestigationService } from "@/lib/mock-data-gate";

/**
 * Phase 34: Resolve Investigation Action
 */
export async function resolveInvestigationAction(
  id: string,
  resolution: "verified" | "adjusted",
  isMock: boolean = false
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const service = await getInvestigationService(isMock);
  await service.resolveInvestigation(id, user.activeTeamId, user.id, resolution);

  revalidatePath(`/investigations/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Phase 34: Dismiss Investigation Action
 */
export async function dismissInvestigationAction(id: string, isMock: boolean = false) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const service = await getInvestigationService(isMock);
  await service.dismissInvestigation(id, user.activeTeamId, user.id);

  revalidatePath(`/investigations/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}
