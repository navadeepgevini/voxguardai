import { NextResponse } from "next/server";
import { sendVoxGuardAlert } from "@/lib/server/notifications";

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";

// In-memory idempotency cache to prevent duplicate dispatches in addition to SQLite audit log
const dispatchedAnalysisIds = new Set<string>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      analysisId,
      syntheticScore,
      authenticity,
      contextRisk,
      isIdentityMismatch,
      isInconclusive,
      inputQualityWarning,
    } = body;

    if (!analysisId) {
      return NextResponse.json({ error: "Missing analysisId parameter." }, { status: 400 });
    }

    // 1. Idempotency Check: Has this analysis already triggered an alert in this session?
    if (dispatchedAnalysisIds.has(analysisId)) {
      return NextResponse.json({
        status: "SUPPRESSED",
        reason: "Duplicate suppressed: alert has already been dispatched for this analysis ID.",
      });
    }

    // 2. Fetch active notification policy from settings
    let policy: any = {
      enabled: true,
      notify_on_synthetic: true,
      notify_on_high_risk: true,
      notify_on_inconclusive: false,
      notify_on_identity_mismatch: false,
      synthetic_threshold: 75,
      context_threshold: 80,
      cooldown_minutes: 5,
    };

    try {
      const settingsRes = await fetch(`${BACKEND_INTERNAL_URL}/api/notifications/settings`, { cache: "no-store" });
      if (settingsRes.ok) {
        policy = await settingsRes.json();
      }
    } catch {
      // Default policy fallback
    }

    if (!policy.enabled) {
      return NextResponse.json({
        status: "SUPPRESSED",
        reason: "Email alerts are currently disabled in notification settings.",
      });
    }

    const syntheticThresh = policy.synthetic_threshold ?? 75;
    const contextThresh = policy.context_threshold ?? 80;

    // Determine synthetic score: if passed directly or computed from AASIST (100 - authenticity)
    const computedSynthetic = typeof syntheticScore === "number"
      ? syntheticScore
      : (typeof authenticity === "number" ? Math.max(0, 100 - authenticity) : 0);

    const computedContext = typeof contextRisk === "number" ? contextRisk : 0;
    const isSyntheticFlagged = Boolean(
      body.isSynthetic ||
      (body.verdict === "CRITICAL" && computedSynthetic >= 50) ||
      (body.authStatus && String(body.authStatus).toLowerCase().includes("synthetic"))
    );

    let eventType: "SYNTHETIC_DETECTED" | "HIGH_CONTEXT_RISK" | "ANALYSIS_UNAVAILABLE" | "IDENTITY_MISMATCH" | null = null;
    let resultLabel: "Likely synthetic" | "High context risk" | "Analysis unavailable" | "Voiceprint identity mismatch" | null = null;
    let metricScore: number | null = null;
    let metricThreshold: number | null = null;

    // Rule 1: Likely synthetic/deepfake result with synthetic score >= threshold OR model-flagged synthetic
    if ((computedSynthetic >= syntheticThresh || isSyntheticFlagged) && policy.notify_on_synthetic) {
      eventType = "SYNTHETIC_DETECTED";
      resultLabel = "Likely synthetic";
      metricScore = computedSynthetic;
      metricThreshold = syntheticThresh;
    }
    // Rule 2: High context-risk result >= 80%
    else if (computedContext >= contextThresh && policy.notify_on_high_risk) {
      eventType = "HIGH_CONTEXT_RISK";
      resultLabel = "High context risk";
      metricScore = computedContext;
      metricThreshold = contextThresh;
    }
    // Rule 3: Analysis failure/inconclusive result (controlled by toggle)
    else if (isInconclusive && policy.notify_on_inconclusive) {
      eventType = "ANALYSIS_UNAVAILABLE";
      resultLabel = "Analysis unavailable";
    }
    // Rule 4: Enrolled identity mismatch (only if administrator explicitly enables)
    else if (isIdentityMismatch && policy.notify_on_identity_mismatch) {
      eventType = "IDENTITY_MISMATCH";
      resultLabel = "Voiceprint identity mismatch";
    }

    if (!eventType || !resultLabel) {
      return NextResponse.json({
        status: "SUPPRESSED",
        reason: "Analysis result does not satisfy configured alert thresholds.",
      });
    }

    // 3. Database Idempotency Check: check past notification history
    try {
      const histRes = await fetch(`${BACKEND_INTERNAL_URL}/api/notifications/history?limit=30`, { cache: "no-store" });
      if (histRes.ok) {
        const hist: any[] = await histRes.json();
        // Check if this exact analysis ID was already sent
        const alreadyDispatched = hist.some(
          (j) => j.analysis_id === analysisId && (j.status === "SENT" || j.status === "QUEUED")
        );
        if (alreadyDispatched) {
          dispatchedAnalysisIds.add(analysisId);
          return NextResponse.json({
            status: "SUPPRESSED",
            reason: "Duplicate suppressed: analysis ID has already been recorded in audit history.",
          });
        }

        // Check cooldown window for identical event types (TEST_ALERT never blocks real security alerts)
        const cooldownMs = (policy.cooldown_minutes || 5) * 60 * 1000;
        const now = Date.now();
        const inCooldown = hist.some((j) => {
          if (j.status !== "SENT") return false;
          if (j.event_type === "TEST_ALERT") return false; // Test alerts do not throttle actual incident alerts
          if (j.event_type !== eventType) return false; // Cooldown applies strictly per-event-type
          const rawCreated = j.created_at || "";
          const parsedTime = Date.parse(rawCreated.includes("T") ? rawCreated : `${rawCreated.replace(" ", "T")}Z`);
          if (isNaN(parsedTime)) return false;
          return now - parsedTime < cooldownMs;
        });

        if (inCooldown) {
          return NextResponse.json({
            status: "SUPPRESSED",
            reason: `Alert suppressed: cooldown window active (${policy.cooldown_minutes}m) for ${eventType}.`,
          });
        }
      }
    } catch {
      // Proceed safely if history check unavailable
    }

    // Mark as processed in-memory
    dispatchedAnalysisIds.add(analysisId);

    // 4. Dispatch alert via server-only Resend service
    const dispatchResult = await sendVoxGuardAlert({
      analysisId,
      eventType,
      result: resultLabel,
      score: metricScore,
      threshold: metricThreshold,
      inputQualityWarning: inputQualityWarning || null,
      isTest: false,
    });

    return NextResponse.json(dispatchResult);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        status: "FAILED",
        error: err instanceof Error ? err.message : "Internal exception triggering alert.",
      },
      { status: 500 }
    );
  }
}
