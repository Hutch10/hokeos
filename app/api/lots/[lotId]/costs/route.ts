import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { lotCosts, lots } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth";

const addLotCostSchema = z.object({
  costCategory: z.string().trim().min(1),
  amount: z.number().finite(),
  notes: z.string().trim().min(1).optional(),
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
    const parsed = addLotCostSchema.safeParse(body);

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

    await db.insert(lotCosts).values({
      lotId,
      teamId: user.activeTeamId,
      userId: user.id,
      costCategory: parsed.data.costCategory,
      amount: String(parsed.data.amount),
      notes: parsed.data.notes,
      currency: "USD",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
