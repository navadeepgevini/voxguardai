from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class CallRecordCreate(BaseModel):
    caller: str
    agent: str
    duration: str
    verdict: Literal["SAFE", "WARNING", "CRITICAL"]
    authenticity: float
    identity: float
    context: str
    flagged_phrases: List[str] = []

class CallRecordResponse(BaseModel):
    id: str
    caller: str
    agent: str
    date: str
    time: str
    duration: str
    verdict: Literal["SAFE", "WARNING", "CRITICAL"]
    authenticity: float
    identity: float
    context: str
    flaggedPhrases: List[str]

class VoiceProfileCreate(BaseModel):
    name: str
    department: str
    audio_base64: Optional[str] = None

class VoiceProfileResponse(BaseModel):
    id: str
    name: str
    department: str
    enrolledDate: str
    lastVerified: str
    samples: int
    confidence: float
    status: Literal["ACTIVE", "PENDING", "REVOKED"]
    embeddingQuality: Literal["HIGH", "MEDIUM", "LOW"]

class SystemSettingsSchema(BaseModel):
    aasistThreshold: int = Field(default=50, ge=10, le=95)
    ecapaThreshold: int = Field(default=70, ge=30, le=99)
    nlpSensitivity: int = Field(default=65, ge=20, le=100)
    emailAlerts: bool = True
    slackAlerts: bool = False
    criticalOnly: bool = False
    autoBlock: bool = True
    apiKey: Optional[str] = "vxg_sk_live_99214820491823904812"
    webhookUrl: Optional[str] = "https://api.voxguard.security/hooks/amvtf-alerts"

class TranscriptMessage(BaseModel):
    speaker: str
    text: str
    time: str
    alert: bool = False
    threatKeywords: List[str] = []

class AudioAnalysisResponse(BaseModel):
    callerName: str
    enrolledTarget: str
    contextTitle: str
    authenticity: float
    identity: float
    contextRisk: float
    fusedRiskScore: float
    authStatus: str
    idStatus: str
    nlpIntent: str
    threatKeywords: List[str]
    semanticFlags: List[str]
    recommendedAction: str
    actionType: Literal["ALLOW", "STEP_UP", "TERMINATE"]
    rationale: str
    transcript: List[TranscriptMessage]
    spectralEntropy: Optional[float] = None
    zcr: Optional[float] = None
    jitter: Optional[float] = None
    kurtosis: Optional[float] = None
    syntheticIndicators: List[str] = []

class UserRegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: Optional[str] = "SOC Analyst"

class UserLoginRequest(BaseModel):
    username: str  # Can be username or email
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    created_at: Optional[str] = None

class AuthResponse(BaseModel):
    user: UserResponse
    token: str
    expires_at: str

class ApiKeyGenerateRequest(BaseModel):
    name: Optional[str] = "Primary Integration Key"
    plan_tier: str  # "FREE", "FREE_TRIAL", "PRO", "ENTERPRISE"
    payment_method: Optional[str] = "upi_collect"
    order_id: Optional[str] = None
    card_last4: Optional[str] = None
    upi_id: Optional[str] = None

class ApiKeyTopupRequest(BaseModel):
    key_id: str
    topup_type: Optional[Literal["tokens", "minutes", "wallet"]] = "tokens"
    tokens_to_add: Optional[int] = 0
    minutes_to_add: Optional[float] = 0.0
    price_paid: float = 0.0  # Amount in Indian Rupees (₹)
    plan_tier: Optional[str] = None
    order_id: Optional[str] = None
    payment_method: Optional[str] = "upi_collect"

class ApiKeyResponse(BaseModel):
    id: str
    key: str
    name: str
    plan_tier: str
    tokens_remaining: int
    tokens_total: int
    price_paid: float  # Amount in INR (₹)
    balance_inr: float = 0.0  # Wallet balance in INR (₹)
    minutes_remaining: float = 15.0  # Audio call/stream minutes available
    minutes_total: float = 15.0
    rate_per_min_inr: float = 2.0  # ₹2.00 per minute
    features_enabled: List[str] = []
    status: str
    created_at: str
    last_used_at: Optional[str] = None

class PlanDetail(BaseModel):
    id: str
    label: str
    price_inr: float
    billing_period: str
    tokens_included: int
    audio_minutes_included: float
    rate_per_min_inr: float
    voiceprints_limit: int  # -1 for unlimited
    features: List[str]
    locked_features: List[str] = []
    badge: Optional[str] = None

class PaymentOrderCreateRequest(BaseModel):
    plan_tier: str  # "PRO", "ENTERPRISE", or "RECHARGE"
    amount_inr: float
    payer_upi_id: str
    payer_name: Optional[str] = None
    payer_email: Optional[str] = None
    target_key_id: Optional[str] = None
    topup_type: Optional[str] = None  # "minutes" or "tokens" if recharge
    units_to_add: Optional[float] = 0.0

class PaymentOrderResponse(BaseModel):
    order_id: str
    plan_tier: str
    amount_inr: float
    payer_upi_id: str
    merchant_vpa: str
    merchant_name: str
    upi_intent_uri: str
    status: str
    expires_at: str
    created_at: str

class PaymentVerifyRequest(BaseModel):
    order_id: str
    utr_reference: str  # 12-digit Indian bank UTR / reference

class PaymentActivationResponse(BaseModel):
    order_id: str
    status: str  # "SUCCESS"
    utr_reference: str
    message: str
    user_credentials: Optional[dict] = None  # username, email, temp_password if newly registered
    api_key: ApiKeyResponse
    free_minutes_granted: float = 15.0
    overage_rate_per_min_inr: float = 2.0

class RecipientSchema(BaseModel):
    id: str
    email: str
    label: str
    status: Literal["VERIFIED", "PENDING", "ADMIN_APPROVED_DEMO"] = "ADMIN_APPROVED_DEMO"
    created_at: str

class SmtpReadinessSchema(BaseModel):
    status: str  # "Ready", "Ready (Demo Mode)", "Not configured", "Failed"
    host_configured: bool = False
    port: int = 587
    security_mode: str = "STARTTLS"
    sender_email: str = "alerts@voxguard.security"
    sender_name: str = "VoxGuard SOC Alert System"
    last_checked: str

class NotificationSettingsSchema(BaseModel):
    enabled: bool = True
    policy_version: int = 1
    recipients: List[RecipientSchema] = []
    notify_on_synthetic: bool = True
    notify_on_high_risk: bool = True
    notify_on_inconclusive: bool = False
    notify_on_identity_mismatch: bool = False
    synthetic_threshold: float = Field(default=75.0, ge=50.0, le=100.0)
    context_threshold: float = Field(default=80.0, ge=50.0, le=100.0)
    cooldown_minutes: int = Field(default=5, ge=1, le=120)
    max_alerts_per_hour: int = Field(default=15, ge=1, le=100)
    dashboard_base_url: str = "http://localhost:3000"
    delivery_status: Optional[str] = None
    recipient_status: Optional[str] = None
    smtp_readiness: Optional[SmtpReadinessSchema] = None

class AddRecipientRequest(BaseModel):
    email: str
    label: str = "Security Analyst"
    status: Optional[Literal["VERIFIED", "PENDING", "ADMIN_APPROVED_DEMO"]] = "ADMIN_APPROVED_DEMO"

class NotificationTestRequest(BaseModel):
    recipient_email: Optional[str] = None

class NotificationJobResponse(BaseModel):
    id: str
    analysis_id: Optional[str] = None
    event_type: str
    severity: str
    recipient_email: str
    status: Literal["QUEUED", "SENDING", "SENT", "FAILED", "SUPPRESSED"]
    resend_message_id: Optional[str] = None
    provider_acceptance_time: Optional[str] = None
    retry_count: int = 0
    error_category: Optional[str] = None
    message_summary: Optional[str] = None
    created_at: str

class RecordJobRequest(BaseModel):
    id: str
    analysis_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    event_type: str
    severity: str
    recipient_email: str
    status: str
    resend_message_id: Optional[str] = None
    provider_acceptance_time: Optional[str] = None
    retry_count: int = 0
    error_category: Optional[str] = None
    message_summary: Optional[str] = None
    policy_version: int = 1
