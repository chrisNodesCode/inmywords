import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: { type: string; data: Record<string, unknown> };
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as typeof evt;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = evt;
  const client = await clerkClient();

  if (type === "subscription.created" || type === "subscription.updated") {
    const userId = data.user_id as string | undefined;
    const status = data.status as string | undefined;
    if (!userId) return NextResponse.json({ ok: true });

    if (status === "active") {
      await client.users.updateUser(userId, {
        publicMetadata: { plan: "asd_user" },
      });
    } else if (
      status === "canceled" ||
      status === "past_due" ||
      status === "expired"
    ) {
      await client.users.updateUser(userId, {
        publicMetadata: { plan: "free_user" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
