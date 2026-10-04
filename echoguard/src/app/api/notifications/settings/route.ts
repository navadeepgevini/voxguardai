import { NextResponse } from "next/server";
import { getResendConfig } from "@/lib/server/notifications";

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_INTERNAL_URL}/api/notifications/settings`, {
      cache: "no-store",
    });

    let backendSettings: any = {};
    if (res.ok) {
      backendSettings = await res.json();
    } else {
      backendSettings = {
        enabled: true,
        policy_version: 1,
        notify_on_synthetic: true,
        notify_on_high_risk: true,
        notify_on_inconclusive: false,
        notify_on_identity_mismatch: false,
        synthetic_threshold: 75,
        context_threshold: 80,
        cooldown_minutes: 5,
        max_alerts_per_hour: 15,
      };
    }

    const resendCfg = getResendConfig();

    return NextResponse.json({
      ...backendSettings,
      delivery_status: resendCfg.deliveryStatus,
      recipient_status: resendCfg.recipientStatus,
      resend_from: resendCfg.from,
      resend_configured: resendCfg.isConfigured,
      synthetic_threshold: backendSettings.synthetic_threshold ?? 75,
      context_threshold: backendSettings.context_threshold ?? 80,
    });
  } catch (err: unknown) {
    const resendCfg = getResendConfig();
    return NextResponse.json({
      enabled: true,
      policy_version: 1,
      notify_on_synthetic: true,
      notify_on_high_risk: true,
      notify_on_inconclusive: false,
      notify_on_identity_mismatch: false,
      synthetic_threshold: 75,
      context_threshold: 80,
      cooldown_minutes: 5,
      max_alerts_per_hour: 15,
      delivery_status: resendCfg.deliveryStatus,
      recipient_status: resendCfg.recipientStatus,
      resend_from: resendCfg.from,
      resend_configured: resendCfg.isConfigured,
    });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_INTERNAL_URL}/api/notifications/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.detail || "Failed to update notification settings" }, { status: res.status });
    }

    const updated = await res.json();
    const resendCfg = getResendConfig();

    return NextResponse.json({
      ...updated,
      delivery_status: resendCfg.deliveryStatus,
      recipient_status: resendCfg.recipientStatus,
      resend_from: resendCfg.from,
      resend_configured: resendCfg.isConfigured,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update settings" },
      { status: 500 }
    );
  }
}
