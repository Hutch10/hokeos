import { createUser, registerSchema } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "Invalid registration input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const user = await createUser(parsed.data);

    return Response.json({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to register user";
    const status = /already exists/i.test(message) ? 409 : 500;

    return Response.json({ ok: false, error: message }, { status });
  }
}
