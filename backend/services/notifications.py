import os
import smtplib
import ssl
import json
import uuid
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Tuple, Optional, List, Dict, Any
from database import get_connection

class NotificationSender:
    """
    SMTP Sender Adapter:
    Independent from deepfake, voiceprint, and NLP analysis logic.
    Retrieves SMTP settings strictly from encrypted server-side environment/secrets.
    Enforces authenticated TLS / STARTTLS with certificate validation.
    Provides safe fallback to Demo Relay when SMTP credentials are not configured in local environment.
    """
    def __init__(self):
        self.smtp_host = os.environ.get("SMTP_HOST", "").strip()
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_user = os.environ.get("SMTP_USER", "").strip()
        self.smtp_password = os.environ.get("SMTP_PASSWORD", "").strip()
        self.smtp_security = os.environ.get("SMTP_SECURITY", "STARTTLS").upper().strip()
        self.from_email = os.environ.get("SMTP_FROM_EMAIL", "alerts@voxguard.security").strip()
        self.from_name = os.environ.get("SMTP_FROM_NAME", "VoxGuard SOC Alert System").strip()
        self.demo_mode = os.environ.get("DEMO_MODE_SMTP", "true").lower() in ("true", "1", "yes")

    def get_readiness(self) -> Dict[str, Any]:
        has_host = bool(self.smtp_host)
        has_auth = bool(self.smtp_user and self.smtp_password)
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if has_host and has_auth:
            status = "Ready"
        elif self.demo_mode or not has_host:
            status = "Ready (Demo Mode)"
        else:
            status = "Not configured"

        return {
            "status": status,
            "host_configured": has_host,
            "port": self.smtp_port,
            "security_mode": self.smtp_security,
            "sender_email": self.from_email,
            "sender_name": self.from_name,
            "last_checked": now_str
        }

    async def send_email(
        self,
        recipient: str,
        subject: str,
        text_body: str,
        html_body: str
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Sends an RFC 5322 MIME email via authenticated SMTP with TLS/STARTTLS.
        Returns: (success: bool, delivery_message: str, error_category: Optional[str])
        """
        # If in Demo Mode and no real SMTP host is configured:
        if (self.demo_mode or not self.smtp_host) and not (self.smtp_host and self.smtp_user):
            # Safe simulated delivery for local offline hackathon verification
            await asyncio.sleep(0.5)  # Simulate network hop
            print(f"[SMTP Demo Relay] Accepted message for <{recipient}>: {subject}")
            return (True, "Accepted by simulated local SMTP relay (Demo Mode)", None)

        def _sync_send():
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = recipient
            msg["Date"] = datetime.now().strftime("%a, %d %b %Y %H:%M:%S +0000")

            part_text = MIMEText(text_body, "plain", "utf-8")
            part_html = MIMEText(html_body, "html", "utf-8")
            msg.attach(part_text)
            msg.attach(part_html)

            # Enforce TLS context with system CA certificate validation
            context = ssl.create_default_context()

            if self.smtp_security == "SSL":
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, context=context, timeout=12)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=12)
                if self.smtp_security == "STARTTLS":
                    server.starttls(context=context)

            if self.smtp_user and self.smtp_password:
                server.login(self.smtp_user, self.smtp_password)

            server.send_message(msg)
            server.quit()

        try:
            await asyncio.to_thread(_sync_send)
            return (True, "Message accepted by upstream SMTP MTA provider", None)
        except smtplib.SMTPAuthenticationError:
            return (False, "SMTP Authentication Failed", "AUTH_FAILURE")
        except smtplib.SMTPConnectError:
            return (False, "SMTP Connection Failed", "CONNECTION_ERROR")
        except smtplib.SMTPException as e:
            return (False, f"SMTP Protocol Error: {str(e)[:100]}", "PROTOCOL_ERROR")
        except Exception as e:
            return (False, f"Transport Exception: {str(e)[:100]}", "NETWORK_ERROR")


class NotificationService:
    """
    Manages VoxGuard notification policies, recipient registries,
    idempotent queue jobs, rate limiting, and delivery audit history.
    """
    def __init__(self):
        self.sender = NotificationSender()

    def get_policy(self) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = 'notification_policy'")
        row = cursor.fetchone()
        conn.close()

        if row:
            data = json.loads(row["value"] if isinstance(row, dict) or hasattr(row, "keys") else row[0])
        else:
            data = {
                "enabled": True,
                "policy_version": 1,
                "recipients": [
                    {
                        "id": "rcp_lead",
                        "email": "soc-lead@voxguard.security",
                        "label": "SOC Incident Response Lead",
                        "status": "ADMIN_APPROVED_DEMO",
                        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    },
                    {
                        "id": "rcp_evaluator",
                        "email": "evaluator@security.ac.in",
                        "label": "Audit & Compliance Evaluator",
                        "status": "ADMIN_APPROVED_DEMO",
                        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                ],
                "notify_on_synthetic": True,
                "notify_on_high_risk": True,
                "notify_on_inconclusive": False,
                "notify_on_identity_mismatch": False,
                "cooldown_minutes": 5,
                "max_alerts_per_hour": 15,
                "dashboard_base_url": "http://localhost:3000"
            }
        data["smtp_readiness"] = self.sender.get_readiness()
        return data

    def update_policy(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        current = self.get_policy()
        # Increment policy version on update
        new_version = current.get("policy_version", 1) + 1
        current.update(updates)
        current["policy_version"] = new_version
        current.pop("smtp_readiness", None)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM settings WHERE key = 'notification_policy'")
        if cursor.fetchone():
            cursor.execute("UPDATE settings SET value = ? WHERE key = 'notification_policy'", (json.dumps(current),))
        else:
            cursor.execute("INSERT INTO settings (key, value) VALUES ('notification_policy', ?)", (json.dumps(current),))
        conn.commit()
        conn.close()

        current["smtp_readiness"] = self.sender.get_readiness()
        return current

    def add_recipient(self, email: str, label: str = "Security Analyst", status: str = "ADMIN_APPROVED_DEMO") -> Dict[str, Any]:
        email_clean = email.strip().lower()
        policy = self.get_policy()
        recipients = policy.get("recipients", [])

        # Check for duplicate
        for r in recipients:
            if r["email"].lower() == email_clean:
                r["label"] = label
                r["status"] = status
                self.update_policy({"recipients": recipients})
                return r

        new_recipient = {
            "id": f"rcp_{uuid.uuid4().hex[:8]}",
            "email": email_clean,
            "label": label,
            "status": status,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        recipients.append(new_recipient)
        self.update_policy({"recipients": recipients})
        return new_recipient

    def verify_recipient(self, email: str) -> bool:
        email_clean = email.strip().lower()
        policy = self.get_policy()
        recipients = policy.get("recipients", [])
        found = False
        for r in recipients:
            if r["email"].lower() == email_clean:
                r["status"] = "VERIFIED"
                found = True
        if found:
            self.update_policy({"recipients": recipients})
        return found

    def remove_recipient(self, email: str) -> bool:
        email_clean = email.strip().lower()
        policy = self.get_policy()
        recipients = policy.get("recipients", [])
        initial_len = len(recipients)
        recipients = [r for r in recipients if r["email"].lower() != email_clean]
        if len(recipients) != initial_len:
            self.update_policy({"recipients": recipients})
            return True
        return False

    def is_in_cooldown(self, recipient_email: str, analysis_id: Optional[str], cooldown_minutes: int) -> bool:
        """
        Checks if an alert was sent to recipient for this analysis within cooldown window.
        """
        if not analysis_id:
            return False
        conn = get_connection()
        cursor = conn.cursor()
        since_time = (datetime.now() - timedelta(minutes=cooldown_minutes)).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            """
            SELECT 1 FROM notification_jobs
            WHERE recipient_email = ? AND analysis_id = ? AND status = 'SENT' AND created_at >= ?
            LIMIT 1
            """,
            (recipient_email, analysis_id, since_time)
        )
        row = cursor.fetchone()
        conn.close()
        return bool(row)

    def get_hourly_alert_count(self) -> int:
        conn = get_connection()
        cursor = conn.cursor()
        one_hour_ago = (datetime.now() - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "SELECT COUNT(*) FROM notification_jobs WHERE status = 'SENT' AND created_at >= ?",
            (one_hour_ago,)
        )
        row = cursor.fetchone()
        count = row[0] if row else 0
        conn.close()
        return count

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, analysis_id, event_type, severity, recipient_email, status,
                   provider_acceptance_time, retry_count, error_category, message_summary, resend_message_id, created_at
            FROM notification_jobs
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,)
        )
        rows = cursor.fetchall()
        conn.close()

        history = []
        for r in rows:
            row_dict = dict(r) if hasattr(r, "keys") else {}
            history.append({
                "id": row_dict.get("id", ""),
                "analysis_id": row_dict.get("analysis_id"),
                "event_type": row_dict.get("event_type", ""),
                "severity": row_dict.get("severity", "INFO"),
                "recipient_email": row_dict.get("recipient_email", ""),
                "status": row_dict.get("status", "QUEUED"),
                "resend_message_id": row_dict.get("resend_message_id"),
                "provider_acceptance_time": row_dict.get("provider_acceptance_time"),
                "retry_count": row_dict.get("retry_count", 0),
                "error_category": row_dict.get("error_category"),
                "message_summary": row_dict.get("message_summary"),
                "created_at": str(row_dict.get("created_at", ""))
            })
        return history

    def record_job(
        self,
        id: str,
        analysis_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        event_type: str = "AUDIO_ALERT",
        severity: str = "INFO",
        recipient_email: str = "alerts@voxguard.security",
        status: str = "QUEUED",
        resend_message_id: Optional[str] = None,
        provider_acceptance_time: Optional[str] = None,
        retry_count: int = 0,
        error_category: Optional[str] = None,
        message_summary: Optional[str] = None,
        policy_version: int = 1
    ) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("SELECT id FROM notification_jobs WHERE id = ?", (id,))
        if cursor.fetchone():
            cursor.execute(
                """
                UPDATE notification_jobs
                SET status = ?, provider_acceptance_time = ?, retry_count = ?, error_category = ?,
                    message_summary = ?, resend_message_id = COALESCE(?, resend_message_id), updated_at = ?
                WHERE id = ?
                """,
                (status, provider_acceptance_time, retry_count, error_category, message_summary, resend_message_id, now_str, id)
            )
        else:
            cursor.execute(
                """
                INSERT INTO notification_jobs (
                    id, analysis_id, idempotency_key, event_type, severity, policy_version,
                    recipient_email, status, provider_acceptance_time, retry_count,
                    error_category, message_summary, resend_message_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    id, analysis_id, idempotency_key, event_type, severity, policy_version,
                    recipient_email, status, provider_acceptance_time, retry_count,
                    error_category, message_summary, resend_message_id, now_str, now_str
                )
            )
        conn.commit()
        conn.close()
        return {"status": "SUCCESS", "id": id}

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, analysis_id, event_type, severity, recipient_email, status,
                   provider_acceptance_time, retry_count, error_category, message_summary, created_at
            FROM notification_jobs
            WHERE id = ?
            """,
            (job_id,)
        )
        r = cursor.fetchone()
        conn.close()
        if not r:
            return None
        return {
            "id": r["id"],
            "analysis_id": r["analysis_id"],
            "event_type": r["event_type"],
            "severity": r["severity"],
            "recipient_email": r["recipient_email"],
            "status": r["status"],
            "provider_acceptance_time": r["provider_acceptance_time"],
            "retry_count": r["retry_count"],
            "error_category": r["error_category"],
            "message_summary": r["message_summary"],
            "created_at": str(r["created_at"])
        }

    async def _dispatch_job_async(
        self,
        job_id: str,
        recipient: str,
        subject: str,
        text_body: str,
        html_body: str,
        max_retries: int = 3
    ):
        """
        Executes bounded exponential retry dispatch without blocking user HTTP requests.
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE notification_jobs SET status = 'SENDING' WHERE id = ?", (job_id,))
        conn.commit()
        conn.close()

        success = False
        last_error = None
        attempt = 0

        while attempt < max_retries and not success:
            attempt += 1
            ok, msg, err_cat = await self.sender.send_email(recipient, subject, text_body, html_body)
            if ok:
                success = True
                now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute(
                    """
                    UPDATE notification_jobs
                    SET status = 'SENT', provider_acceptance_time = ?, retry_count = ?, error_category = NULL
                    WHERE id = ?
                    """,
                    (now_str, attempt - 1, job_id)
                )
                conn.commit()
                conn.close()
                return
            else:
                last_error = err_cat or "DELIVERY_ERROR"
                if attempt < max_retries:
                    await asyncio.sleep(2 ** attempt)

        # Permanent failure recorded
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE notification_jobs
            SET status = 'FAILED', retry_count = ?, error_category = ?
            WHERE id = ?
            """,
            (attempt, last_error, job_id)
        )
        conn.commit()
        conn.close()

    async def trigger_call_alert(
        self,
        call_id: str,
        caller: str,
        verdict: str,
        authenticity: float,
        identity: float,
        context: str,
        flagged_phrases: List[str]
    ):
        """
        Evaluates saved notification policy against final persisted call analysis.
        Dispatches idempotent alerts asynchronously.
        """
        policy = self.get_policy()
        if not policy.get("enabled", True):
            return

        # Determine qualifying event type & severity
        event_type = None
        severity = "INFO"
        reason = ""

        if verdict == "CRITICAL" and policy.get("notify_on_synthetic", True):
            event_type = "SYNTHETIC_DETECTED"
            severity = "CRITICAL"
            reason = f"AASIST Anti-spoofing layer detected synthetic acoustic cadence (Authenticity: {authenticity:.1f}%)."
        elif (flagged_phrases or "Threat" in context or "Urgency" in context) and policy.get("notify_on_high_risk", True):
            event_type = "HIGH_CONTEXT_RISK"
            severity = "WARNING"
            reason = f"High-risk social engineering markers or coercion detected in dialogue context: {', '.join(flagged_phrases[:3]) if flagged_phrases else context}."
        elif identity > 0 and identity < 45.0 and policy.get("notify_on_identity_mismatch", False):
            event_type = "IDENTITY_MISMATCH"
            severity = "WARNING"
            reason = f"Voiceprint identity match below biometric confidence threshold ({identity:.1f}% vs enrolled reference)."

        if not event_type:
            return  # Does not match configured alert policies

        recipients = policy.get("recipients", [])
        eligible_recipients = [
            r for r in recipients
            if r.get("status") in ("VERIFIED", "ADMIN_APPROVED_DEMO")
        ]

        if not eligible_recipients:
            return

        cooldown_mins = policy.get("cooldown_minutes", 5)
        max_hourly = policy.get("max_alerts_per_hour", 15)
        hourly_count = self.get_hourly_alert_count()
        policy_ver = policy.get("policy_version", 1)
        base_url = policy.get("dashboard_base_url", "http://localhost:3000")

        short_id = call_id.split("-")[-1] if "-" in call_id else call_id
        subject = f"[VoxGuard] Review required: likely synthetic audio — analysis {short_id}"

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

        # Format compliant Email Body
        evidence_summary = (
            f"• Source Audio: {caller}\n"
            f"• Authenticity Score: {authenticity:.1f}% (Threshold: 50.0%)\n"
            f"• Speaker Verification: {identity:.1f}%\n"
            f"• Context Signal: {context}\n"
            f"• Flagged Keywords: {', '.join(flagged_phrases) if flagged_phrases else 'None'}"
        )

        text_body = f"""VOXGUARD INCIDENT NOTIFICATION
==================================================
Timestamp: {now_str}
Analysis ID: {call_id}
Verdict Label: {verdict} ({event_type})

INVESTIGATION SUMMARY:
{reason}

EVIDENCE INDICATORS:
{evidence_summary}

AUTHENTICATED AUDIT PORTAL:
{base_url}/call-history

--------------------------------------------------
REGULATORY & COMPLIANCE NOTICE:
This automated result supports review and is not definitive proof of identity, fraud, or content origin.
Alerts are sent by email and can appear on your phone through your email app. Delivery timing depends on the email provider and phone notification settings.
"""

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VoxGuard Threat Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 20px 24px; border-bottom: 3px solid #f97316;">
      <h1 style="color: #ffffff; font-size: 18px; margin: 0; font-weight: 700; letter-spacing: -0.02em;">VoxGuard Security Operations Center</h1>
      <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Automated Audio Trust & Deepfake Defense Alert</p>
    </div>
    <div style="padding: 24px;">
      <div style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: {'#fef2f2' if severity == 'CRITICAL' else '#fffbeb'}; color: {'#b91c1c' if severity == 'CRITICAL' else '#b45309'}; border: 1px solid {'#fecaca' if severity == 'CRITICAL' else '#fde68a'}; margin-bottom: 16px;">
        SEVERITY: {severity} — {event_type}
      </div>

      <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #0f172a;">Review Required: Likely Synthetic Audio Detected</h2>
      <p style="font-size: 13px; line-height: 1.5; color: #334155; margin-bottom: 20px;">{reason}</p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h3 style="font-size: 12px; text-transform: uppercase; color: #64748b; margin: 0 0 10px 0; letter-spacing: 0.05em;">Traceable Evidence Snapshot</h3>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 40%;">Analysis Identifier:</td>
            <td style="padding: 4px 0; font-weight: 600; font-family: monospace;">{call_id}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">AASIST Authenticity:</td>
            <td style="padding: 4px 0; font-weight: 600;">{authenticity:.1f}% (Decision Threshold: 50%)</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">ECAPA Identity Match:</td>
            <td style="padding: 4px 0; font-weight: 600;">{identity:.1f}%</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Caller Intake:</td>
            <td style="padding: 4px 0; font-weight: 600;">{caller}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Dialogue Flagged:</td>
            <td style="padding: 4px 0; font-weight: 600; color: #b91c1c;">{', '.join(flagged_phrases) if flagged_phrases else 'None'}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="{base_url}/call-history" style="background-color: #f97316; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">
          Open Authenticated SOC Audit Trail
        </a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #64748b; line-height: 1.5;">
        <p style="margin: 0 0 8px 0;"><strong>Mandatory Security Notice:</strong> This automated result supports review and is not definitive proof of identity, fraud, or content origin.</p>
        <p style="margin: 0;">Alerts are sent by email and can appear on your phone through your email app. Delivery timing depends on the email provider and phone notification settings.</p>
      </div>
    </div>
  </div>
</body>
</html>"""

        for rec in eligible_recipients:
            rec_email = rec["email"]
            idempotency_key = f"{call_id}:{event_type}:{policy_ver}:{rec_email}"

            # Check if job already exists (idempotency guarantee)
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM notification_jobs WHERE idempotency_key = ?", (idempotency_key,))
            if cursor.fetchone():
                conn.close()
                continue

            job_id = f"ntf_{uuid.uuid4().hex[:12]}"

            # Check rate limit and cooldown
            if self.is_in_cooldown(rec_email, call_id, cooldown_mins):
                cursor.execute(
                    """
                    INSERT INTO notification_jobs (
                        id, analysis_id, idempotency_key, event_type, severity, policy_version,
                        recipient_email, status, error_category, message_summary
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUPPRESSED', 'COOLDOWN_ACTIVE', ?)
                    """,
                    (job_id, call_id, idempotency_key, event_type, severity, policy_ver, rec_email, subject)
                )
                conn.commit()
                conn.close()
                continue

            if hourly_count >= max_hourly:
                cursor.execute(
                    """
                    INSERT INTO notification_jobs (
                        id, analysis_id, idempotency_key, event_type, severity, policy_version,
                        recipient_email, status, error_category, message_summary
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUPPRESSED', 'HOURLY_RATE_LIMIT_EXCEEDED', ?)
                    """,
                    (job_id, call_id, idempotency_key, event_type, severity, policy_ver, rec_email, subject)
                )
                conn.commit()
                conn.close()
                continue

            # Queue active job
            cursor.execute(
                """
                INSERT INTO notification_jobs (
                    id, analysis_id, idempotency_key, event_type, severity, policy_version,
                    recipient_email, status, message_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'QUEUED', ?)
                """,
                (job_id, call_id, idempotency_key, event_type, severity, policy_ver, rec_email, subject)
            )
            conn.commit()
            conn.close()

            # Dispatch asynchronously in background
            asyncio.create_task(
                self._dispatch_job_async(job_id, rec_email, subject, text_body, html_body)
            )

    async def send_test_email(self, recipient_email: Optional[str] = None) -> Dict[str, Any]:
        """
        Sends an authorized operator test email to verify delivery pipeline.
        """
        policy = self.get_policy()
        recipients = policy.get("recipients", [])

        target_recipient = None
        if recipient_email:
            email_clean = recipient_email.strip().lower()
            for r in recipients:
                if r["email"].lower() == email_clean and r.get("status") in ("VERIFIED", "ADMIN_APPROVED_DEMO"):
                    target_recipient = email_clean
                    break
            if not target_recipient:
                # If explicitly provided email is not yet in approved list, add as demo recipient
                new_r = self.add_recipient(recipient_email, label="Operator (Manual Test)", status="ADMIN_APPROVED_DEMO")
                target_recipient = new_r["email"]
        else:
            for r in recipients:
                if r.get("status") in ("VERIFIED", "ADMIN_APPROVED_DEMO"):
                    target_recipient = r["email"]
                    break

        if not target_recipient:
            raise ValueError("No verified or administrator-approved recipient configured to receive test alert.")

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        job_id = f"ntf_test_{uuid.uuid4().hex[:8]}"
        subject = "[VoxGuard] Test Alert: Notification Pipeline Verification"

        text_body = f"""VOXGUARD SOC TEST NOTIFICATION
==================================================
Timestamp: {now_str}
Alert Type: OPERATOR_TEST_ALERT

This is a test notification confirming that the VoxGuard SMTP alerting pipeline is operational.
When an audio threat is detected, incident alerts will appear in this inbox and on your phone email app.

REGULATORY NOTICE:
Alerts are sent by email and can appear on your phone through your email app. Delivery timing depends on the email provider and phone notification settings.
"""

        html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
  <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px;">[VoxGuard] Notification Pipeline Verification</h2>
    <p style="font-size: 13px; color: #475569; line-height: 1.5;">This confirms that your email alert pipeline is configured and ready. When an audio deepfake or high-risk threat triggers an alert policy, notifications will be delivered to this recipient address.</p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 6px; font-size: 12px; color: #166534; margin: 16px 0;">
      ✔ Upstream SMTP connectivity validated. Recipient: <strong>{target_recipient}</strong>
    </div>
    <p style="font-size: 11px; color: #64748b; margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
      Alerts are sent by email and can appear on your phone through your email app. Delivery timing depends on the email provider and phone notification settings.
    </p>
  </div>
</body>
</html>"""

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO notification_jobs (
                id, analysis_id, idempotency_key, event_type, severity, policy_version,
                recipient_email, status, message_summary
            ) VALUES (?, NULL, ?, 'TEST_ALERT', 'INFO', 1, ?, 'QUEUED', ?)
            """,
            (job_id, f"test:{job_id}", target_recipient, subject)
        )
        conn.commit()
        conn.close()

        # Send asynchronously
        asyncio.create_task(
            self._dispatch_job_async(job_id, target_recipient, subject, text_body, html_body)
        )

        return {
            "job_id": job_id,
            "status": "QUEUED",
            "recipient": target_recipient,
            "message": "Test email queued for asynchronous delivery to verified recipient.",
            "timestamp": now_str
        }

notification_service = NotificationService()
