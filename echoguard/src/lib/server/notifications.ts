import { Resend } from "resend";

export type DeliveryStatus = "Not configured" | "Ready" | "Sending" | "Sent" | "Failed" | "Suppressed";

export interface SendAlertParams {
  analysisId: string;
  eventType: "SYNTHETIC_DETECTED" | "HIGH_CONTEXT_RISK" | "ANALYSIS_UNAVAILABLE" | "IDENTITY_MISMATCH" | "TEST_ALERT";
  result: "Likely synthetic" | "High context risk" | "Analysis unavailable" | "Voiceprint identity mismatch" | "Test security notification";
  score?: number | null;
  threshold?: number | null;
  inputQualityWarning?: string | null;
  isTest?: boolean;
}

export interface SendAlertResult {
  status: "QUEUED" | "SENT" | "FAILED" | "SUPPRESSED";
  messageId?: string;
  errorCategory?: string;
  message: string;
  timestamp: string;
}

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";

/**
 * Returns safe environment configuration for Resend.
 * Strictly never returns or leaks the raw API key.
 */
export function getResendConfig() {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const from = (process.env.RESEND_FROM || "onboarding@resend.dev").trim();
  const recipient = (process.env.ALERT_RECIPIENT || "").trim();

  const isKeyPlaceholder = !apiKey || apiKey === "re_replace_with_new_secret_key" || !apiKey.startsWith("re_");
  const isRecipientPlaceholder = !recipient || recipient === "replace_with_authorized_recipient_email" || !recipient.includes("@");

  const isConfigured = !isKeyPlaceholder && !isRecipientPlaceholder;

  let deliveryStatus: DeliveryStatus = "Not configured";
  if (isConfigured) {
    deliveryStatus = "Ready";
  }

  // Safe masked display for recipient
  let recipientStatus = "Pending Configuration";
  if (!isRecipientPlaceholder && recipient.includes("@")) {
    const [user, domain] = recipient.split("@");
    const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : `${user[0]}***`;
    recipientStatus = `${maskedUser}@${domain} (Authorized Recipient)`;
  } else if (!isRecipientPlaceholder) {
    recipientStatus = "Configured";
  }

  return {
    isConfigured,
    deliveryStatus,
    from,
    recipientStatus,
    configuredRecipient: !isRecipientPlaceholder ? recipient : null,
  };
}

/**
 * Persists an audit entry to the persistent SQLite database through backend.
 */
async function recordAuditMetadata(payload: {
  id: string;
  analysis_id?: string | null;
  idempotency_key?: string | null;
  event_type: string;
  severity: string;
  recipient_email: string;
  status: string;
  resend_message_id?: string | null;
  provider_acceptance_time?: string | null;
  retry_count?: number;
  error_category?: string | null;
  message_summary?: string | null;
}) {
  try {
    await fetch(`${BACKEND_INTERNAL_URL}/api/notifications/record-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Fail-safe: audit recording must not crash notification logic
    console.error("[VoxGuard Resend] Failed to record audit metadata to SQLite:", err instanceof Error ? err.message : "Network error");
  }
}

/**
 * Server-only notification service for VoxGuard.
 * Uses the Resend Node.js SDK on the server side only.
 * Strictly preserves security: never returns the API key or raw private credentials.
 */
export async function sendVoxGuardAlert(params: SendAlertParams): Promise<SendAlertResult> {
  const { analysisId, eventType, result, score, threshold, inputQualityWarning, isTest } = params;
  const now = new Date();
  const timestampIso = now.toISOString();
  const timestampDisplay = now.toUTCString();

  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromEmail = (process.env.RESEND_FROM || "onboarding@resend.dev").trim();
  const recipient = (process.env.ALERT_RECIPIENT || "").trim();

  const jobId = `ntf_resend_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const idempotencyKey = `${analysisId}:${eventType}:${recipient}`;

  // Severity classification
  let severity = "INFO";
  if (eventType === "SYNTHETIC_DETECTED") severity = "CRITICAL";
  else if (eventType === "HIGH_CONTEXT_RISK" || eventType === "IDENTITY_MISMATCH") severity = "WARNING";

  // Validate that credentials exist before attempting to send
  const isKeyPlaceholder = !apiKey || apiKey === "re_replace_with_new_secret_key" || !apiKey.startsWith("re_");
  const isRecipientPlaceholder = !recipient || recipient === "replace_with_authorized_recipient_email" || !recipient.includes("@");

  if (isKeyPlaceholder || isRecipientPlaceholder) {
    const errorCat = isKeyPlaceholder ? "UNCONFIGURED_API_KEY" : "UNCONFIGURED_RECIPIENT";
    const safeErrorMsg = isKeyPlaceholder
      ? "Resend API key is not configured in .env.local (placeholder detected)."
      : "Authorized alert recipient email is not configured in .env.local.";

    await recordAuditMetadata({
      id: jobId,
      analysis_id: analysisId,
      idempotency_key: idempotencyKey,
      event_type: eventType,
      severity,
      recipient_email: recipient || "unconfigured@voxguard.local",
      status: "FAILED",
      error_category: errorCat,
      message_summary: `[VoxGuard] Review required: audio security alert (${result})`,
      retry_count: 0,
    });

    return {
      status: "FAILED",
      errorCategory: errorCat,
      message: safeErrorMsg,
      timestamp: timestampDisplay,
    };
  }

  // Model score and threshold text if model-backed
  let modelMetricText = "";
  let modelMetricHtml = "";
  if (typeof score === "number" && typeof threshold === "number") {
    modelMetricText = `Score: ${score.toFixed(1)}% | Decision Threshold: ≥${threshold.toFixed(1)}%`;
    modelMetricHtml = `
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-size: 12px;">Model Confidence Score:</td>
        <td style="padding: 6px 0; font-weight: 600; font-size: 12px; color: #0f172a;">${score.toFixed(1)}% (Threshold: ≥${threshold.toFixed(1)}%)</td>
      </tr>
    `;
  }

  // Input quality warning if applicable
  let qualityWarningText = "";
  let qualityWarningHtml = "";
  if (inputQualityWarning && inputQualityWarning.trim()) {
    qualityWarningText = `Input-Quality Warning: ${inputQualityWarning.trim()}`;
    qualityWarningHtml = `
      <tr>
        <td style="padding: 6px 0; color: #b45309; font-size: 12px;">Input-Quality Warning:</td>
        <td style="padding: 6px 0; font-weight: 600; font-size: 12px; color: #b45309;">${inputQualityWarning.trim()}</td>
      </tr>
    `;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const detailUrl = `${baseUrl}/call-history`;

  // Standard Subject required by specification
  const subject = "[VoxGuard] Review required: audio security alert";

  // RFC compliant Plain Text Body (Contains strictly required elements only)
  const plainTextBody = `[VoxGuard] Review required: audio security alert
==================================================

Analysis ID: ${analysisId}
Timestamp: ${timestampDisplay}
Result: ${result}
${modelMetricText ? `${modelMetricText}\n` : ""}${qualityWarningText ? `${qualityWarningText}\n` : ""}
Authenticated Review Portal:
${detailUrl}

--------------------------------------------------
This automated result supports review and is not definitive proof of identity, fraud, or content origin.
Alerts are delivered by email and may appear on the recipient’s phone through their email app. Delivery timing depends on the email provider and phone notification settings.
`;

  // Clean, SOC-styled HTML Email Body
  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VoxGuard Audio Security Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background-color: #0f172a; padding: 20px 24px; border-bottom: 3px solid #f6821f;">
        <h1 style="color: #ffffff; font-size: 18px; margin: 0; font-weight: 700; letter-spacing: -0.02em;">VoxGuard SOC</h1>
        <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Automated Audio Trust & Deepfake Defense Alert</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 24px;">
        <div style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: ${severity === "CRITICAL" ? "#fef2f2" : severity === "WARNING" ? "#fffbeb" : "#eff6ff"}; color: ${severity === "CRITICAL" ? "#b91c1c" : severity === "WARNING" ? "#b45309" : "#1d4ed8"}; border: 1px solid ${severity === "CRITICAL" ? "#fecaca" : severity === "WARNING" ? "#fde68a" : "#bfdbfe"}; margin-bottom: 16px;">
          ${severity}: ${result.toUpperCase()}
        </div>

        <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #0f172a; font-weight: 700;">Security Review Required: Audio Alert</h2>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 12px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 40%;">Analysis ID:</td>
              <td style="padding: 6px 0; font-weight: 600; font-family: monospace; color: #0f172a;">${analysisId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Timestamp:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${timestampDisplay}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Result:</td>
              <td style="padding: 6px 0; font-weight: 700; color: ${severity === "CRITICAL" ? "#b91c1c" : severity === "WARNING" ? "#b45309" : "#0f172a"};">${result}</td>
            </tr>
            ${modelMetricHtml}
            ${qualityWarningHtml}
          </table>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${detailUrl}" style="background-color: #f6821f; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">
            Open Authenticated SOC Analysis Detail
          </a>
        </div>

        <!-- Compliance & Regulatory Notice -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #64748b; line-height: 1.5;">
          <p style="margin: 0 0 8px 0;"><strong>Mandatory Notice:</strong> This automated result supports review and is not definitive proof of identity, fraud, or content origin.</p>
          <p style="margin: 0;">Alerts are delivered by email and may appear on the recipient’s phone through their email app. Delivery timing depends on the email provider and phone notification settings.</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipient,
      subject,
      text: plainTextBody,
      html: htmlBody,
    });

    if (error) {
      // Redact and categorize error safely
      let errorCategory = "PROVIDER_ERROR";
      const rawMsg = error.message || "Failed to send email via Resend";
      if (rawMsg.toLowerCase().includes("domain") || rawMsg.toLowerCase().includes("verify")) {
        errorCategory = "UNVERIFIED_DOMAIN";
      } else if (rawMsg.toLowerCase().includes("api key") || rawMsg.toLowerCase().includes("auth")) {
        errorCategory = "AUTHENTICATION_ERROR";
      } else if (rawMsg.toLowerCase().includes("rate")) {
        errorCategory = "RATE_LIMITED";
      }

      await recordAuditMetadata({
        id: jobId,
        analysis_id: analysisId,
        idempotency_key: idempotencyKey,
        event_type: eventType,
        severity,
        recipient_email: recipient,
        status: "FAILED",
        error_category: errorCategory,
        message_summary: `[VoxGuard] Review required: audio security alert (${result})`,
        retry_count: 1,
      });

      return {
        status: "FAILED",
        errorCategory,
        message: "Email provider rejected delivery. Check sender domain or credentials in .env.local.",
        timestamp: timestampDisplay,
      };
    }

    const resendId = data?.id || `resend_${Date.now()}`;

    // Record successful audit metadata in SQLite
    await recordAuditMetadata({
      id: jobId,
      analysis_id: analysisId,
      idempotency_key: idempotencyKey,
      event_type: eventType,
      severity,
      recipient_email: recipient,
      status: "SENT",
      resend_message_id: resendId,
      provider_acceptance_time: timestampDisplay,
      message_summary: `[VoxGuard] Review required: audio security alert (${result})`,
      retry_count: 0,
    });

    return {
      status: "SENT",
      messageId: resendId,
      message: `Alert accepted by Resend provider (ID: ${resendId.slice(0, 16)}).`,
      timestamp: timestampDisplay,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unexpected exception during Resend send";
    const errorCat = "TRANSPORT_EXCEPTION";

    await recordAuditMetadata({
      id: jobId,
      analysis_id: analysisId,
      idempotency_key: idempotencyKey,
      event_type: eventType,
      severity,
      recipient_email: recipient,
      status: "FAILED",
      error_category: errorCat,
      message_summary: `[VoxGuard] Review required: audio security alert (${result})`,
      retry_count: 1,
    });

    return {
      status: "FAILED",
      errorCategory: errorCat,
      message: "Delivery transport error. Resend provider could not be reached.",
      timestamp: timestampDisplay,
    };
  }
}
