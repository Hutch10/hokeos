import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications/service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = user.activeTeamId;
  const data = await listNotifications(teamId);
  
  return NextResponse.json(data);
}
