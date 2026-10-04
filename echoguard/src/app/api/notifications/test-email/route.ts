import { NextResponse } from "next/server";
import { sendVoxGuardAlert } from "@/lib/server/notifications";

// Rate limiting: strictly 1 test email per 10 seconds per server process
let lastTestTimestamp = 0;
const TEST_RATE_LIMIT_MS = 10000;

export async function POST() {
  const now = Date.now();
  if (now - lastTestTimestamp < TEST_RATE_LIMIT_MS) {
    const waitSeconds = Math.ceil((TEST_RATE_LIMIT_MS - (now - lastTestTimestamp)) / 1000);
    return NextResponse.json(
      {
        status: "SUPPRESSED",
        message: `Rate limit active. Please wait ${waitSeconds}s before dispatching another test email.`,
      },
      { status: 429 }
    );
  }

  lastTestTimestamp = now;

  try {
    const testAnalysisId = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await sendVoxGuardAlert({
      analysisId: testAnalysisId,
      eventType: "TEST_ALERT",
      result: "Test security notification",
      score: 88.5,
      threshold: 75.0,
      inputQualityWarning: null,
      isTest: true,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        status: "FAILED",
        message: err instanceof Error ? err.message : "Internal error occurred while dispatching test alert.",
      },
      { status: 500 }
    );
  }
}
