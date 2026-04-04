import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { lotRecoveries, lots } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth";

const addLotRecoverySchema = z.object({
  metalType: z.string().trim().min(1),
  recoveredWeight: z.number().finite(),
  estimatedValue: z.number().finite().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lotId: string }> },
) {
  try {
    const { lotId } = await params;

    if (!lotId || !lotId.trim()) {
      return NextResponse.json({ error: "Invalid lotId" }, { status: 400 });
    }

    const user = await requireCurrentUser();
    const body = await request.json();
    const parsed = addLotRecoverySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Tenancy Check: Verify the lot exists and belongs to the user's active team
    const [lot] = await db
      .select({ id: lots.id })
      .from(lots)
      .where(and(eq(lots.id, lotId), eq(lots.teamId, user.activeTeamId)))
      .limit(1);

    if (!lot) {
      return NextResponse.json({ error: "Lot not found or access denied" }, { status: 404 });
    }

    await db.insert(lotRecoveries).values({
      lotId,
      teamId: user.activeTeamId,
      userId: user.id,
      metalType: parsed.data.metalType,
      recoveredWeight: String(parsed.data.recoveredWeight),
      estimatedValue: parsed.data.estimatedValue ? String(parsed.data.estimatedValue) : null,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
