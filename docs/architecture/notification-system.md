---
title: Notification & Incident Alerting System
tags:
  - notifications
  - alerting
  - resend
  - security-ops
---

# Notification & Incident Alerting System

VoxGuard provides automated incident escalation via the Resend email engine when a deepfake attack is detected during live call monitoring or file evaluation.

## Alerting Flow

```mermaid
flowchart TD
    Verdict{"Deepfake Score >= 0.70?"}
    Verdict -->|Yes| FetchRecipients["Fetch Verified SOC Recipients"]
    Verdict -->|No| LogOnly["Log Result to Call History Only"]
    FetchRecipients --> FormatEmail["Format HTML Incident Template"]
    FormatEmail --> Dispatch["Dispatch via Resend API"]
    Dispatch --> CheckStatus{"Delivery Succeeded?"}
    CheckStatus -->|Yes| MarkDelivered["Record in Notification Audit Log"]
    CheckStatus -->|No| FallbackAlert["Log Delivery Failure & Retry Queue"]
```

## Configuration Parameters
- `RESEND_API_KEY`: API authentication key.
- `ALERT_FROM_EMAIL`: Verified sender email domain.
- `ALERT_TO_EMAIL`: Default destination for urgent SOC incident alerts.

## Related Documents
- [[system-overview|System Architecture Overview]]
- [[../ui/page-hierarchy|Settings & Recipients Page]]
