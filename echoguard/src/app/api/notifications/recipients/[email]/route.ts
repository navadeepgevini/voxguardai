import { NextResponse } from "next/server";

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";

export async function DELETE(req: Request, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email } = await params;
    const res = await fetch(`${BACKEND_INTERNAL_URL}/api/notifications/recipients/${encodeURIComponent(email)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to remove recipient" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to remove recipient" }, { status: 500 });
  }
}
