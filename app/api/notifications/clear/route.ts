import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clearAllNotifications } from "@/lib/notifications/service";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await clearAllNotifications(user.activeTeamId);
  return NextResponse.json({ success: true });
}
