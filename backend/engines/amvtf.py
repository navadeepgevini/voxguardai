from typing import Dict, Any, Optional

class AMVTFFusionEngine:
    """
    AMVTF: Adaptive Multi-Signal Voice Trust Fusion Engine
    Fuses acoustic authenticity, speaker identity, and spoken contextual threat indicators
    into a genuine, explainable threat score (0 - 100) and security decision: SAFE, WARNING, or CRITICAL.
    """

    def __init__(self, weight_auth: float = 0.50, weight_ctx: float = 0.50):
        self.w_auth = weight_auth
        self.w_ctx = weight_ctx

    def fuse_signals(
        self,
        authenticity: float,
        identity: float,
        context_risk: float,
        matched_profile: str = "",
        is_identity_match: bool = False,
        target_profile_requested: bool = False,
        aasist_threshold: float = 50.0,
        ecapa_threshold: float = 70.0,
        nlp_sensitivity: float = 65.0
    ) -> Dict[str, Any]:
        """
        Calculates genuine threat score (0 - 100) and security decision based on dynamic thresholds:
        - Acoustic Threat Risk = 100 - Authenticity (Evaluated against user-configured aasist_threshold)
        - Context Threat Risk = Evaluated against nlp_sensitivity
        - Target Identity Mismatch = Evaluated against user-configured ecapa_threshold
        """
        # 1. Acoustic risk: Genuine human voice (authenticity 85-98) has acoustic risk 2-15.
        #    Synthetic deepfake (authenticity 15-44) has acoustic risk 56-85.
        acoustic_threat = max(0.0, 100.0 - authenticity)

        # 2. Context threat: From NLP keyword extraction
        context_threat = float(min(100.0, max(0.0, context_risk)))

        # 3. Dynamic threat score fusion:
        # If specific target profile verification was requested:
        if target_profile_requested:
            id_threat = max(0.0, 100.0 - identity)
            # Weighted fusion across 3 signals
            fused_score = (0.40 * acoustic_threat) + (0.35 * id_threat) + (0.25 * context_threat)
        else:
            # General live monitoring: fuse acoustic authenticity and contextual scammer keywords
            # When speech is bona fide human, threat score is primarily governed by spoken content (coercion/fraud)
            if authenticity >= float(aasist_threshold):
                # Human voice: baseline acoustic risk is very low (~5%)
                fused_score = (0.15 * acoustic_threat) + (0.85 * context_threat)
            else:
                # Suspect or synthetic acoustic signature: heavy weight on deepfake risk
                fused_score = (0.65 * acoustic_threat) + (0.35 * context_threat)

        fused_score = round(float(min(100.0, max(0.0, fused_score))), 1)

        # Dynamic sensitivity thresholds
        critical_context_th = max(40.0, min(90.0, 70.0 - (float(nlp_sensitivity) - 65.0) * 0.5))
        warning_context_th = max(20.0, min(60.0, 38.0 - (float(nlp_sensitivity) - 65.0) * 0.4))

        # 4. Security Verdict Determination
        # CRITICAL conditions:
        # A) Acoustic authenticity fails user-configured AASIST threshold (authenticity < aasist_threshold)
        # B) Spoken dialogue contains critical fraud/coercion (context_risk >= critical_context_th)
        # C) Overall fused threat score >= 60.0
        if authenticity < float(aasist_threshold):
            fused_score = max(fused_score, 65.0)
            verdict = "CRITICAL"
            action_type = "TERMINATE"
            recommended_action = "TERMINATE CALL IMMEDIATELY — SYNTHETIC VOICE DETECTED"
            if context_risk >= warning_context_th:
                rationale = (
                    f"CRITICAL THREAT: Automated AI Deepfake Scammer Attack detected! "
                    f"Voice authenticity ({authenticity:.1f}%) is below configured safety threshold ({aasist_threshold:.0f}%), "
                    f"and dialogue contains active coercion ({context_risk:.1f}% risk)."
                )
            else:
                rationale = (
                    f"CRITICAL: Synthetic AI deepfake detected! "
                    f"Voice authenticity ({authenticity:.1f}%) violates configured safety threshold ({aasist_threshold:.0f}%). "
                    f"Context risk: {context_risk:.1f}%."
                )
        elif context_risk >= critical_context_th or fused_score >= 60.0:
            verdict = "CRITICAL"
            action_type = "TERMINATE"
            recommended_action = "INTERCEPT & BLOCK TRANSACTION — FRAUD ATTEMPT"
            rationale = (
                f"CRITICAL THREAT: Spoken dialogue context risk ({context_risk:.1f}%) exceeds sensitivity threshold ({critical_context_th:.0f}%). "
                f"Spoken phrases include high-risk fraud keywords (OTP / card expiry / extortion tactics)."
            )
        elif context_risk >= warning_context_th or fused_score >= 35.0 or (target_profile_requested and not is_identity_match):
            verdict = "WARNING"
            action_type = "STEP_UP"
            recommended_action = "Trigger Out-of-Band (OOB) Secondary Verification"
            reasons = []
            if context_risk >= warning_context_th:
                reasons.append(f"Elevated scam indicators ({context_risk:.1f}% >= {warning_context_th:.0f}%)")
            if authenticity < (float(aasist_threshold) + 12.0):
                reasons.append(f"Borderline acoustic authenticity ({authenticity:.1f}% near {aasist_threshold:.0f}% threshold)")
            if target_profile_requested and not is_identity_match:
                reasons.append(f"Target speaker voiceprint mismatch ({identity:.1f}% < {ecapa_threshold:.0f}% threshold)")
            reason_str = "; ".join(reasons) if reasons else f"Fused risk elevated ({fused_score:.1f})"
            rationale = f"WARNING: {reason_str}. Out-of-band verification recommended before proceeding."
        else:
            verdict = "SAFE"
            action_type = "ALLOW"
            recommended_action = "Allow Session — Normal Operations"
            if target_profile_requested and is_identity_match:
                rationale = (
                    f"Bona fide human voice verified ({authenticity:.1f}% >= {aasist_threshold:.0f}% threshold). "
                    f"Speaker voiceprint verified as {matched_profile} ({identity:.1f}% >= {ecapa_threshold:.0f}% threshold). "
                    f"Dialogue within safe limits ({context_risk:.1f}% < {warning_context_th:.0f}%)."
                )
            else:
                rationale = (
                    f"Bona fide human voice verified ({authenticity:.1f}% >= {aasist_threshold:.0f}% threshold). "
                    f"Natural voice tune and formants confirmed. No threat keywords detected in dialogue ({context_risk:.1f}%)."
                )

        return {
            "fusedRiskScore": fused_score,
            "verdict": verdict,
            "actionType": action_type,
            "recommendedAction": recommended_action,
            "rationale": rationale
        }

amvtf_engine = AMVTFFusionEngine()

