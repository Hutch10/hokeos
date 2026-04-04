import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { lots } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth";

const createLotSchema = z.object({
  lotNumber: z.string().trim().min(1),
  materialType: z.string().trim().min(1),
  sourceName: z.string().trim().min(1).optional(),
  grossWeight: z.number().finite().optional(),
  weightUnit: z.string().trim().min(1).default("g"),
});

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const result = await db
      .select()
      .from(lots)
      .where(eq(lots.teamId, user.activeTeamId));

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("LIST LOTS ERROR:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createLotSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const user = await requireCurrentUser();
    const data = parsed.data;
    console.log("CREATE LOT PAYLOAD:", { ...data, teamId: user.activeTeamId, userId: user.id });

    const [created] = await db
      .insert(lots)
      .values({
        lotNumber: data.lotNumber,
        materialType: data.materialType,
        sourceName: data.sourceName ?? null,
        grossWeight: data.grossWeight ? String(data.grossWeight) : null,
        weightUnit: data.weightUnit ?? "g",
        teamId: user.activeTeamId,
        userId: user.id,
      })
      .returning({ id: lots.id });

    if (!created) {
      return NextResponse.json({ error: "Failed to create lot record" }, { status: 500 });
    }

    return NextResponse.json({ id: created.id });
  } catch (err) {
    console.error("CREATE LOT ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
