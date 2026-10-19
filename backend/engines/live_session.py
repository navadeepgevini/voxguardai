"""
Temporal aggregation for live authenticity decisions.

A single 1–2s chunk is often insufficient for natural conversational TTS.
This module aggregates voiced-window synthetic probabilities over a session.
"""
from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, Any, List, Optional


@dataclass
class _Window:
    ts: float
    synthetic_probability: float
    voiced: bool
    detection_state: str


@dataclass
class SessionState:
    windows: Deque[_Window] = field(default_factory=lambda: deque(maxlen=40))
    ema: float = 50.0
    consecutive_high: int = 0
    consecutive_low: int = 0
    voiced_seconds: float = 0.0
    caption_parts: List[str] = field(default_factory=list)
    full_caption: str = ""


class LiveSessionAggregator:
    """
    In-memory session aggregator (single-process). For multi-worker production,
    replace with Redis / shared store.
    """

    def __init__(
        self,
        ema_alpha: float = 0.35,
        high_threshold: float = 65.0,
        low_threshold: float = 40.0,
        escalate_after: int = 2,
        clear_after: int = 3,
        window_seconds: float = 1.8,
    ):
        self.ema_alpha = ema_alpha
        self.high_threshold = high_threshold
        self.low_threshold = low_threshold
        self.escalate_after = escalate_after
        self.clear_after = clear_after
        self.window_seconds = window_seconds
        self._sessions: Dict[str, SessionState] = {}
        self._lock = threading.Lock()

    def update(
        self,
        session_id: str,
        synthetic_probability: float,
        voiced: bool,
        detection_state: str,
        caption_chunk: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not session_id:
            session_id = "_anonymous"

        with self._lock:
            state = self._sessions.setdefault(session_id, SessionState())
            now = time.time()
            state.windows.append(
                _Window(now, float(synthetic_probability), voiced, detection_state)
            )

            if voiced and detection_state not in ("INSUFFICIENT_AUDIO", "WAITING_FOR_SPEECH"):
                state.voiced_seconds += self.window_seconds
                # EMA only on voiced usable windows
                p = float(synthetic_probability)
                state.ema = (self.ema_alpha * p) + ((1.0 - self.ema_alpha) * state.ema)
                if p >= self.high_threshold:
                    state.consecutive_high += 1
                    state.consecutive_low = 0
                elif p <= self.low_threshold:
                    state.consecutive_low += 1
                    state.consecutive_high = 0
                else:
                    state.consecutive_high = 0
                    state.consecutive_low = 0

            if caption_chunk:
                self._append_caption(state, caption_chunk)

            session_state = self._decide(state, detection_state)
            return {
                "sessionId": session_id,
                "sessionSyntheticProbability": round(state.ema, 1),
                "sessionDetectionState": session_state,
                "voicedSecondsAccumulated": round(state.voiced_seconds, 2),
                "windowsObserved": len(state.windows),
                "consecutiveHigh": state.consecutive_high,
                "consecutiveLow": state.consecutive_low,
                "sessionCaption": state.full_caption,
            }

    @staticmethod
    def _append_caption(state: SessionState, chunk: str) -> None:
        text = " ".join((chunk or "").split()).strip()
        if not text:
            return
        lower = text.lower()
        # Skip placeholders / duplicates
        if "microphone audio frame" in lower or "monitoring acoustic" in lower:
            return
        if state.full_caption and lower in state.full_caption.lower():
            return
        # Avoid re-appending when browser sends cumulative transcript
        if state.full_caption and state.full_caption.lower() in lower and len(lower) > len(state.full_caption):
            state.full_caption = text
            state.caption_parts = [text]
            return
        state.caption_parts.append(text)
        # Keep last ~40 utterance fragments
        if len(state.caption_parts) > 40:
            state.caption_parts = state.caption_parts[-40:]
        state.full_caption = " ".join(state.caption_parts).strip()

    def _decide(self, state: SessionState, chunk_state: str) -> str:
        if state.voiced_seconds < 3.0 and chunk_state in (
            "INSUFFICIENT_AUDIO",
            "WAITING_FOR_SPEECH",
            "UNCERTAIN",
        ):
            return "WAITING_FOR_SPEECH" if state.voiced_seconds < 1.5 else "UNCERTAIN"

        if state.consecutive_high >= self.escalate_after and state.ema >= self.high_threshold:
            return "LIKELY_AI_GENERATED"
        if state.consecutive_low >= self.clear_after and state.ema <= self.low_threshold:
            return "LIKELY_HUMAN"
        if state.voiced_seconds < 3.0:
            return "WAITING_FOR_SPEECH"
        if self.low_threshold < state.ema < self.high_threshold:
            return "UNCERTAIN"
        return "LIKELY_HUMAN" if state.ema < 50.0 else "UNCERTAIN"

    def reset(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)


live_session_aggregator = LiveSessionAggregator()
