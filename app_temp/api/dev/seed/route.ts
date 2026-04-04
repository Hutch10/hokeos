import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, teams, teamMembers, lots, lotRoi } from "@/db/schema";
import { hash } from "bcryptjs";
import { sql } from "drizzle-orm";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    console.log("Seeding test data...");

    // 1. Create User
    const email = "admin@hokeos.com";
    const passwordHash = await hash("Hokeos2026!", 10);
    const userId = "00000000-0000-0000-0000-000000000001";

    await db.insert(users).values({
      id: userId,
      email,
      name: "Admin User",
      passwordHash,
    }).onConflictDoNothing();

    // 2. Create Team
    const teamId = "00000000-0000-0000-0000-000000000002";
    await db.insert(teams).values({
      id: teamId,
      ownerId: userId,
      name: "Hoke Core Testing",
    }).onConflictDoNothing();

    // 3. Add User to Team
    await db.insert(teamMembers).values({
      teamId,
      userId,
      role: "owner",
    }).onConflictDoNothing();

    // 4. Update User's activeTeamId
    await db.update(users).set({ activeTeamId: teamId }).where(sql`${users.id} = ${userId}`);

    // 5. Seed Lots with ROI data
    const lotCount = 12;
    for (let i = 1; i <= lotCount; i++) {
      const lotId = crypto.randomUUID();
      const createdAt = new Date();
      createdAt.setMonth(createdAt.getMonth() - (lotCount - i));

      await db.insert(lots).values({
        id: lotId,
        teamId,
        userId,
        lotNumber: `LOT-2026-${String(i).padStart(3, "0")}`,
        materialType: i % 2 === 0 ? "Gold Jewelry" : "Sterling Silver",
        sourceName: "Test Supplier",
        grossWeight: "100.00",
        weightUnit: "g",
        intakeStatus: "completed",
        createdAt,
      });

      // Randomized ROI
      const totalCost = 1000 + Math.random() * 500;
      const revenue = totalCost + (Math.random() * 400 - 100); // Some losses, mostly profit
      const profit = revenue - totalCost;
      const roiPct = (profit / totalCost) * 100;
      const marginPct = (profit / revenue) * 100;

      await db.insert(lotRoi).values({
        lotId,
        teamId,
        userId,
        totalCost: totalCost.toString(),
        revenue: revenue.toString(),
        profit: profit.toString(),
        roiPct: roiPct.toString(),
        marginPct: marginPct.toString(),
        calculatedAt: createdAt,
      });
    }

    return NextResponse.json({ ok: true, message: "Test data seeded successfully" });
  } catch (error: any) {
    console.error("Seeding API failed:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
