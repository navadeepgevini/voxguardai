from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from typing import List, Optional
import json
from datetime import datetime
from database import get_connection, clear_all_calls
from models import CallRecordCreate, CallRecordResponse
from services.notifications import notification_service
from deps import require_current_user

router = APIRouter(prefix="/api/calls", tags=["Calls"])

@router.get("", response_model=List[CallRecordResponse])
def get_calls(
    verdict: Optional[str] = Query(None, description="Filter by verdict: SAFE, WARNING, CRITICAL"),
    search: Optional[str] = Query(None, description="Search by caller, agent, or context"),
    _user: dict = Depends(require_current_user),
):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM calls WHERE 1=1"
    params = []

    if verdict and verdict != "ALL":
        query += " AND verdict = ?"
        params.append(verdict)

    if search:
        query += " AND (caller LIKE ? OR agent LIKE ? OR context LIKE ? OR id LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    query += " ORDER BY created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        row_dict = dict(r) if hasattr(r, "keys") else {}
        results.append(CallRecordResponse(
            id=r["id"],
            caller=r["caller"],
            agent=r["agent"],
            date=r["date"],
            time=r["time"],
            duration=r["duration"],
            verdict=r["verdict"],
            authenticity=float(r["authenticity"]),
            identity=float(r["identity"]),
            context=r["context"],
            flaggedPhrases=json.loads(r["flagged_phrases"]) if r["flagged_phrases"] else [],
            spectrogramData=row_dict.get("spectrogram_data"),
            spectrogramMetadata=row_dict.get("spectrogram_metadata")
        ))
    return results

@router.get("/{call_id}/evidence")
def get_call_evidence(call_id: str, _user: dict = Depends(require_current_user)):
    """
    Returns verified visual evidence (spectrogram image and STFT metadata) for an analysis record.
    If unavailable due to retention policy, returns structured unavailable status.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM calls WHERE id = ?", (call_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Call record not found.")

    row_dict = dict(row) if hasattr(row, "keys") else {}
    spec_data = row_dict.get("spectrogram_data")
    spec_meta_raw = row_dict.get("spectrogram_metadata")

    if not spec_data or not spec_meta_raw:
        return {
            "available": False,
            "analysis_id": call_id,
            "caller": row_dict.get("caller"),
            "verdict": row_dict.get("verdict"),
            "authenticity": row_dict.get("authenticity"),
            "reason": "Visual evidence unavailable for this historical record (audio retention policy expired or pre-dates evidentiary logging)."
        }

    try:
        meta = json.loads(spec_meta_raw)
    except Exception:
        meta = {}

    return {
        "available": True,
        "analysis_id": call_id,
        "caller": row_dict.get("caller"),
        "verdict": row_dict.get("verdict"),
        "authenticity": row_dict.get("authenticity"),
        "metadata": meta,
        "data_url": spec_data
    }

@router.post("", response_model=CallRecordResponse)
async def create_call(
    call: CallRecordCreate,
    background_tasks: BackgroundTasks,
    _user: dict = Depends(require_current_user),
):
    conn = get_connection()
    cursor = conn.cursor()

    # Generate next ID
    cursor.execute("SELECT COUNT(*) FROM calls")
    count = cursor.fetchone()[0]
    call_id = f"VX-{8900 + count + 1}"
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M")

    cursor.execute("""
    INSERT INTO calls (id, caller, agent, date, time, duration, verdict, authenticity, identity, context, flagged_phrases, spectrogram_data, spectrogram_metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        call_id,
        call.caller,
        call.agent,
        date_str,
        time_str,
        call.duration,
        call.verdict,
        call.authenticity,
        call.identity,
        call.context,
        json.dumps(call.flagged_phrases),
        call.spectrogram_data,
        call.spectrogram_metadata
    ))
    conn.commit()
    conn.close()

    # Trigger asynchronous incident notification check in background
    try:
        background_tasks.add_task(
            notification_service.trigger_call_alert,
            call_id=call_id,
            caller=call.caller,
            verdict=call.verdict,
            authenticity=call.authenticity,
            identity=call.identity,
            context=call.context,
            flagged_phrases=call.flagged_phrases
        )
    except Exception as e:
        print(f"[Notifications] Trigger warning: {e}")

    return CallRecordResponse(
        id=call_id,
        caller=call.caller,
        agent=call.agent,
        date=date_str,
        time=time_str,
        duration=call.duration,
        verdict=call.verdict,
        authenticity=call.authenticity,
        identity=call.identity,
        context=call.context,
        flaggedPhrases=call.flagged_phrases,
        spectrogramData=call.spectrogram_data,
        spectrogramMetadata=call.spectrogram_metadata
    )

@router.delete("/all")
def clear_all(_user: dict = Depends(require_current_user)):
    clear_all_calls()
    return {"status": "success", "message": "All call records cleared"}

@router.delete("/{call_id}")
def delete_call(call_id: str, _user: dict = Depends(require_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM calls WHERE id = ?", (call_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "deleted": call_id}
