import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { createTag, listTags } from "@/lib/tags/tag-service";

const createTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(64),
  color: z.string().trim().max(32).optional().nullable(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const tags = await listTags(user.activeTeamId);
    return Response.json({ ok: true, data: tags });
  } catch (err) {
    console.error("[GET /api/tags] error:", err);
    return Response.json({ ok: false, error: "Failed to list tags" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createTagSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const tag = await createTag(user.id, user.activeTeamId, parsed.data.name, parsed.data.color ?? null);
    return Response.json({ ok: true, data: tag }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create tag";

    if (message === "Tag name is required") {
      return Response.json({ ok: false, error: message }, { status: 400 });
    }

    console.error("[POST /api/tags] error:", err);
    return Response.json({ ok: false, error: "Failed to create tag" }, { status: 500 });
  }
}
