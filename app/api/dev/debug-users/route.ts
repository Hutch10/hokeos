import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const allUsers = await db.select().from(users);
    return NextResponse.json({ ok: true, users: allUsers });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
