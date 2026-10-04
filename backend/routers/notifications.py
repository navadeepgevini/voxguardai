from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from models import (
    NotificationSettingsSchema,
    AddRecipientRequest,
    NotificationTestRequest,
    NotificationJobResponse,
    RecordJobRequest
)
from services.notifications import notification_service

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/settings", response_model=NotificationSettingsSchema)
def get_notification_settings():
    """
    Returns current notification policy, recipient registry with verification states,
    and non-sensitive SMTP readiness status. Never returns passwords or secrets.
    """
    policy = notification_service.get_policy()
    return policy

@router.put("/settings", response_model=NotificationSettingsSchema)
def update_notification_settings(settings: NotificationSettingsSchema):
    """
    Updates notification policy, event toggles, and rate limits.
    """
    payload = settings.model_dump()
    payload.pop("smtp_readiness", None)
    updated = notification_service.update_policy(payload)
    return updated

@router.post("/recipients")
def add_recipient(req: AddRecipientRequest):
    """
    Adds a new operator or SOC recipient with label and initial status.
    """
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Invalid recipient email address.")
    recipient = notification_service.add_recipient(
        email=req.email,
        label=req.label,
        status=req.status or "ADMIN_APPROVED_DEMO"
    )
    return recipient

@router.put("/recipients/{email}/verify")
def verify_recipient(email: str):
    """
    Verifies or administrator-approves a recipient address for alert reception.
    """
    ok = notification_service.verify_recipient(email)
    if not ok:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    return {"status": "SUCCESS", "message": f"Recipient {email} is now VERIFIED."}

@router.delete("/recipients/{email}")
def remove_recipient(email: str):
    """
    Removes a recipient from notification delivery lists.
    """
    removed = notification_service.remove_recipient(email)
    if not removed:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    return {"status": "SUCCESS", "message": f"Recipient {email} removed."}

@router.post("/test-email")
async def send_test_email(req: NotificationTestRequest):
    """
    Privileged, rate-limited action to dispatch a test notification email.
    Returns the asynchronous job ID and queued status.
    """
    try:
        res = await notification_service.send_test_email(recipient_email=req.recipient_email)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue test alert: {str(e)}")

@router.get("/history", response_model=List[NotificationJobResponse])
def get_notification_history(limit: int = Query(50, ge=1, le=200)):
    """
    Returns immutable audit trail of recent alert jobs, statuses, and delivery confirmations.
    """
    return notification_service.get_history(limit=limit)

@router.post("/record-job")
def record_notification_job(req: RecordJobRequest):
    """
    Records or updates a notification audit job into the SQLite audit table.
    """
    res = notification_service.record_job(
        id=req.id,
        analysis_id=req.analysis_id,
        idempotency_key=req.idempotency_key,
        event_type=req.event_type,
        severity=req.severity,
        recipient_email=req.recipient_email,
        status=req.status,
        resend_message_id=req.resend_message_id,
        provider_acceptance_time=req.provider_acceptance_time,
        retry_count=req.retry_count,
        error_category=req.error_category,
        message_summary=req.message_summary,
        policy_version=req.policy_version
    )
    return res

@router.get("/{job_id}", response_model=NotificationJobResponse)
def get_notification_job(job_id: str):
    """
    Returns specific notification delivery job state.
    """
    job = notification_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Notification job not found.")
    return job
