"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  MessageSquareWarning,
  PhoneOff,
  Search,
  Bell,
  ChevronRight,
  Radio,
  Mic,
  MicOff,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  Sliders,
  Sparkles,
  Lock,
  UserCheck,
  Zap,
  Upload,
  RefreshCw,
  FileAudio,
  Fingerprint,
  PhoneCall,
  Send,
  AlertCircle,
  Info,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  analyzeAudioUpload,
  analyzeLiveMic,
  connectLiveAnalyzeSocket,
  saveCall,
  triggerAnalysisAlert,
  getIdentities,
  getSettings,
  VoiceProfile,
  AudioAnalysisResponse,
  SystemSettings,
} from "@/lib/api";
import { AudioPreviewSpectrogram } from "@/components/AudioPreviewSpectrogram";
import { VoiceTrustCore3D } from "@/components/VoiceTrustCore3D";

type RiskState = "IDLE" | "SAFE" | "WARNING" | "CRITICAL";

function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate = 16000): Float32Array {
  if (inputSampleRate === outputSampleRate) return buffer;
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * sampleRateRatio);
    const end = Math.min(buffer.length, Math.floor((i + 1) * sampleRateRatio));
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += buffer[j];
    }
    result[i] = sum / Math.max(1, end - start);
  }
  return result;
}

function encodeWavPcm16(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

export default function HybridDashboard() {
  const [riskState, setRiskState] = useState<RiskState>("IDLE");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [micVolume, setMicVolume] = useState<number[]>(new Array(12).fill(10));
  const [audioEnergy, setAudioEnergy] = useState<number>(0);
  const [callDuration, setCallDuration] = useState(0);
  const [actionExecuted, setActionExecuted] = useState(false);
  const [isPersisted, setIsPersisted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const liveSessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? `live_${crypto.randomUUID()}`
      : `live_${Date.now()}`
  );

  // Registered database profiles
  const [enrolledProfiles, setEnrolledProfiles] = useState<VoiceProfile[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  // Custom text input for threat testing
  const [customTranscript, setCustomTranscript] = useState("");
  const [liveSpeechText, setLiveSpeechText] = useState("");
  const liveSpeechTextRef = useRef<string>("");
  const recognitionActiveRef = useRef(false);
  const [captionStatus, setCaptionStatus] = useState<"idle" | "listening" | "unsupported" | "error">("idle");

  // Active analysis data from backend
  const [currentScenario, setCurrentScenario] = useState<AudioAnalysisResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const liveWsRef = useRef<WebSocket | null>(null);
  const pcmBufferRef = useRef<Float32Array[]>([]);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Recorded Snippet State
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecordingSnippet, setIsRecordingSnippet] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewStatus, setPreviewStatus] = useState<"Waiting" | "Loading metadata" | "Ready to evaluate" | "Playing" | "Paused" | "Preview unavailable">("Waiting");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [isPreviewMuted, setIsPreviewMuted] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(1.0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [automatedAlertNotice, setAutomatedAlertNotice] = useState<{
    active: boolean;
    messageId?: string;
    text: string;
  } | null>(null);
  const liveAlertTriggeredRef = useRef(false);

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
    } else {
      previewAudioRef.current.play().catch((err) => {
        console.error("Playback error:", err);
        setPreviewStatus("Preview unavailable");
        setPreviewError("Browser rejected playback or codec not supported.");
      });
    }
  };

  const handlePreviewSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setPreviewCurrentTime(time);
    if (previewAudioRef.current) {
      previewAudioRef.current.currentTime = time;
    }
  };

  const togglePreviewMute = () => {
    if (!previewAudioRef.current) return;
    const nextMuted = !isPreviewMuted;
    setIsPreviewMuted(nextMuted);
    previewAudioRef.current.muted = nextMuted;
  };

  const handlePreviewVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setPreviewVolume(val);
    const muted = val === 0;
    setIsPreviewMuted(muted);
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = val;
      previewAudioRef.current.muted = muted;
    }
  };

  const handleClearPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
    }
    setUploadedAudioUrl(null);
    setPreviewFile(null);
    setIsPreviewPlaying(false);
    setPreviewCurrentTime(0);
    setPreviewDuration(0);
    setPreviewError(null);
    setPreviewStatus("Waiting");
  };

  const startRecordingSnippet = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(audioUrl);
      };

      mediaRecorder.start();
      setIsRecordingSnippet(true);
    } catch (err) {
      console.error("Error accessing microphone for recording", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecordingSnippet = () => {
    if (mediaRecorderRef.current && isRecordingSnippet) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecordingSnippet(false);
    }
  };

  const evaluateRecordedSnippet = async () => {
    if (!recordedAudioBlob) return;
    setIsAnalyzing(true);
    setActionExecuted(false);
    setIsPersisted(false);
    
    try {
      const data = await analyzeAudioUpload(recordedAudioBlob, customTranscript || "Recorded snippet analysis", selectedTargetId || undefined);
      setCurrentScenario(data);
      if (data.transcript && data.transcript.length > 0) {
        const callerMsg = data.transcript.find((m) => m.speaker.includes("Caller"));
        if (callerMsg && callerMsg.text) {
          setLiveSpeechText(callerMsg.text);
        }
      }
      const computedVerdict: RiskState =
        data.actionType === "TERMINATE" ? "CRITICAL" : data.actionType === "STEP_UP" ? "WARNING" : "SAFE";
      setRiskState(computedVerdict);
      setIsSimulating(true);

      // Persist to database
      const savedCall = await saveCall({
        caller: "Live Recorded Snippet",
        agent: "Operator (SOC)",
        duration: "0m 15s",
        verdict: computedVerdict,
        authenticity: data.authenticity,
        identity: data.identity,
        context: data.contextTitle,
        flaggedPhrases: data.threatKeywords,
        spectrogramData: data.spectrogram?.data_url || null,
        spectrogramMetadata: data.spectrogram ? JSON.stringify(data.spectrogram) : null,
      });
      setIsPersisted(true);

      // Trigger server-side Resend alert check post-persistence
      if (savedCall?.id) {
        const isSyntheticDetected = Boolean(
          computedVerdict === "CRITICAL" ||
          data.actionType === "TERMINATE" ||
          (100 - data.authenticity) >= 60 ||
          (data.authStatus && data.authStatus.toLowerCase().includes("synthetic"))
        );

        triggerAnalysisAlert({
          analysisId: savedCall.id,
          syntheticScore: 100 - data.authenticity,
          authenticity: data.authenticity,
          contextRisk: data.contextRisk,
          isIdentityMismatch: data.identity > 0 && data.identity < 45,
          isInconclusive: false,
          verdict: computedVerdict,
          isSynthetic: isSyntheticDetected,
          authStatus: data.authStatus,
        }).then((alertRes) => {
          if (alertRes && (alertRes.status === "SENT" || alertRes.status === "QUEUED")) {
            setAutomatedAlertNotice({
              active: true,
              messageId: alertRes.messageId,
              text: `Deepfake audio alert dispatched automatically to authorized responder for recorded snippet.`,
            });
          }
        }).catch((err) => console.warn("[VoxGuard Alert] Trigger warning:", err));
      }
    } catch (err) {
      console.error("Failed to analyze recorded snippet:", err);
      alert("Backend failed to process recorded snippet.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load real registered voiceprints from SQLite
  useEffect(() => {
    async function loadProfiles() {
      try {
        const [data, settingsData] = await Promise.all([
          getIdentities(),
          getSettings().catch(() => null),
        ]);
        setEnrolledProfiles(data);
        if (settingsData) setSystemSettings(settingsData);
      } catch (err) {
        console.error("Failed to load registered identities:", err);
      }
    }
    loadProfiles();
  }, []);

  // Call duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulating || isMicActive) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isSimulating, isMicActive]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (uploadedAudioUrl) {
        URL.revokeObjectURL(uploadedAudioUrl);
      }
    };
  }, [uploadedAudioUrl]);

  // Reactive audio energy driving 3D Voice Trust Core when audio preview plays
  useEffect(() => {
    let animId: number;
    if (isPreviewPlaying) {
      const pulse = () => {
        setAudioEnergy(0.35 + Math.sin(Date.now() / 150) * 0.25);
        animId = requestAnimationFrame(pulse);
      };
      animId = requestAnimationFrame(pulse);
    } else if (!isMicActive) {
      setAudioEnergy(0);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPreviewPlaying, isMicActive]);

  // Real Microphone Audio + Real Web Speech API transcription + Real-time Streaming
  const toggleMicrophone = async () => {
    if (isMicActive) {
      // Stop mic streaming
      if (liveWsRef.current) {
        try {
          liveWsRef.current.send(JSON.stringify({ type: "end" }));
          liveWsRef.current.close();
        } catch {}
        liveWsRef.current = null;
      }
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
      if (scriptProcessorRef.current) {
        try {
          scriptProcessorRef.current.disconnect();
        } catch {}
        scriptProcessorRef.current = null;
      }
      recognitionActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      setCaptionStatus("idle");
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      const currentSr = audioContextRef.current?.sampleRate || 16000;
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      setIsMicActive(false);
      setAudioEnergy(0);

      // Final full-session audio analysis and persist to audit trail
      if (pcmBufferRef.current.length > 0) {
        let totalLen = 0;
        for (const chunk of pcmBufferRef.current) totalLen += chunk.length;
        const merged = new Float32Array(totalLen);
        let offset = 0;
        for (const chunk of pcmBufferRef.current) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        const pcm16k = downsampleBuffer(merged, currentSr, 16000);
        const fullWavBlob = encodeWavPcm16(pcm16k, 16000);
        const finalTranscript = liveSpeechTextRef.current || liveSpeechText.trim() || customTranscript.trim();
        await processLiveAnalysis(finalTranscript, fullWavBlob, true);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      }).catch(() => navigator.mediaDevices.getUserMedia({ audio: true }));
      micStreamRef.current = stream;
      pcmBufferRef.current = [];
      liveAlertTriggeredRef.current = false;
      liveSpeechTextRef.current = "";
      setLiveSpeechText("");

      // Setup Web Audio Analyser
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      let ctx: AudioContext;
      try {
        ctx = new AudioCtx({ sampleRate: 16000 } as any);
      } catch {
        ctx = new AudioCtx();
      }
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Capture genuine PCM audio samples directly from sound card
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const channel = e.inputBuffer.getChannelData(0);
        pcmBufferRef.current.push(new Float32Array(channel));
        // Keep sliding window of ~3.5 seconds
        const maxChunks = Math.ceil((ctx.sampleRate * 3.5) / 4096);
        if (pcmBufferRef.current.length > maxChunks) {
          pcmBufferRef.current.splice(0, pcmBufferRef.current.length - maxChunks);
        }
      };
      source.connect(processor);

      // Connect through a zero-gain node to prevent speaker audio feedback/echo loop while keeping processor active
      const muteNode = ctx.createGain();
      muteNode.gain.value = 0;
      processor.connect(muteNode);
      muteNode.connect(ctx.destination);

      // Setup Web Speech API for live captions (must auto-restart — Chrome ends sessions often)
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionActiveRef.current = true;
      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = "en-IN";

        let finalCommitted = "";

        recognition.onstart = () => setCaptionStatus("listening");

        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const piece = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) {
              finalCommitted = `${finalCommitted} ${piece}`.trim();
            } else {
              interim += piece;
            }
          }
          const clean = `${finalCommitted} ${interim}`.trim();
          if (clean) {
            liveSpeechTextRef.current = clean;
            setLiveSpeechText(clean);
          }
        };

        recognition.onerror = (event: any) => {
          const err = String(event?.error || "");
          // no-speech / aborted are normal; keep listening
          if (err === "not-allowed" || err === "service-not-allowed") {
            recognitionActiveRef.current = false;
            setCaptionStatus("error");
            return;
          }
          if (err === "network") {
            setCaptionStatus("error");
          }
        };

        recognition.onend = () => {
          // Chrome stops continuous recognition after pauses — restart while mic is live
          if (recognitionActiveRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setCaptionStatus("listening");
            } catch {
              setTimeout(() => {
                if (recognitionActiveRef.current && recognitionRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch {}
                }
              }, 250);
            }
          }
        };

        try {
          recognition.start();
          setCaptionStatus("listening");
        } catch {
          setCaptionStatus("error");
        }
      } else {
        setCaptionStatus("unsupported");
      }

      liveSessionIdRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `live_${crypto.randomUUID()}`
          : `live_${Date.now()}`;
      liveSpeechTextRef.current = "";
      setLiveSpeechText("");
      setIsMicActive(true);
      setIsSimulating(false);
      setRiskState("SAFE");

      const updateBars = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const bars: number[] = [];
        let sumSquares = 0;
        for (let i = 0; i < 12; i++) {
          const val = dataArray[i * 2] || 0;
          bars.push(Math.max(12, Math.min(95, (val / 255) * 100)));
        }
        for (let i = 0; i < dataArray.length; i++) {
          const norm = dataArray[i] / 255;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        setAudioEnergy(Math.min(1.0, rms * 2.8));
        setMicVolume(bars);
        animFrameRef.current = requestAnimationFrame(updateBars);
      };
      updateBars();

      // Optional WebSocket authenticity path (CPU detector); HTTP remains full AMVTF
      const ws = connectLiveAnalyzeSocket(
        liveSessionIdRef.current,
        (msg) => {
          if (msg.type !== "LIVE_INFERENCE") return;
          setCurrentScenario((prev) =>
            prev
              ? {
                  ...prev,
                  syntheticProbability: msg.syntheticProbability ?? prev.syntheticProbability,
                  detectionState: msg.detectionState ?? prev.detectionState,
                  sessionDetectionState:
                    msg.sessionDetectionState ?? prev.sessionDetectionState,
                  sessionSyntheticProbability:
                    msg.sessionSyntheticProbability ?? prev.sessionSyntheticProbability,
                  voicedSecondsAccumulated:
                    msg.voicedSecondsAccumulated ?? prev.voicedSecondsAccumulated,
                  modelVersion: msg.modelVersion ?? prev.modelVersion,
                }
              : prev
          );
        }
      );
      liveWsRef.current = ws;

      // Real-time live mic streaming analysis every 1.8 seconds:
      liveIntervalRef.current = setInterval(async () => {
        if (pcmBufferRef.current.length < 8) return;
        let totalLen = 0;
        for (const chunk of pcmBufferRef.current) totalLen += chunk.length;
        const merged = new Float32Array(totalLen);
        let offset = 0;
        for (const chunk of pcmBufferRef.current) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        const pcm16k = downsampleBuffer(merged, ctx.sampleRate, 16000);
        const wavBlob = encodeWavPcm16(pcm16k, 16000);
        // Push PCM16 to WS when open (real streaming inference)
        if (liveWsRef.current && liveWsRef.current.readyState === WebSocket.OPEN) {
          const pcm = new Int16Array(pcm16k.length);
          for (let i = 0; i < pcm16k.length; i++) {
            const s = Math.max(-1, Math.min(1, pcm16k[i]));
            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          liveWsRef.current.send(pcm.buffer);
        }
        const currentSpokenText = liveSpeechTextRef.current || "";
        await processLiveAnalysis(currentSpokenText, wavBlob, false);
      }, 1800);
    } catch {
      alert("Microphone access could not be acquired or is not supported in this browser.");
    }
  };

  const processLiveAnalysis = async (transcriptText: string, audioBlob?: Blob, persist = false) => {
    setIsAnalyzing(true);
    setActionExecuted(false);
    if (persist) setIsPersisted(false);

    try {
      const effectiveText = transcriptText || customTranscript || "";
      const data = await analyzeLiveMic(
        effectiveText,
        selectedTargetId || undefined,
        audioBlob,
        liveSessionIdRef.current
      );
      setCurrentScenario(data);
      // Prefer dedicated caption fields, then Caller transcript — never wipe good local captions
      const PLACEHOLDER =
        /microphone audio frame|listening…|listening\.\.\.|monitoring acoustic|speak clearly into/i;
      const serverCaption = (
        data.sessionCaption ||
        data.liveCaption ||
        data.transcript?.find((m) => m.speaker.includes("Caller"))?.text ||
        ""
      ).trim();
      if (serverCaption && !PLACEHOLDER.test(serverCaption)) {
        const local = liveSpeechTextRef.current.trim();
        // Keep longer cumulative text (browser often ahead; server ASR may add words)
        if (!local || serverCaption.length >= local.length || !local.toLowerCase().includes(serverCaption.toLowerCase())) {
          const merged =
            local && serverCaption && !serverCaption.toLowerCase().includes(local.toLowerCase())
              ? `${local} ${serverCaption}`.trim()
              : serverCaption.length >= local.length
              ? serverCaption
              : local;
          liveSpeechTextRef.current = merged;
          setLiveSpeechText(merged);
        }
      }
      const computedVerdict: RiskState =
        data.actionType === "TERMINATE" ? "CRITICAL" : data.actionType === "STEP_UP" ? "WARNING" : "SAFE";
      setRiskState(computedVerdict);
      setIsSimulating(true);

      const isSyntheticDetected = Boolean(
        computedVerdict === "CRITICAL" ||
        data.actionType === "TERMINATE" ||
        (100 - data.authenticity) >= 60 ||
        (data.authStatus && data.authStatus.toLowerCase().includes("synthetic"))
      );

      // 1. Immediate automated alert dispatch during active streaming if synthetic deepfake detected
      if (!liveAlertTriggeredRef.current && isSyntheticDetected) {
        liveAlertTriggeredRef.current = true;
        const savedCall = await saveCall({
          caller: data.callerName || "Live Recorded Voice",
          agent: "Operator (SOC)",
          duration: formatTime(callDuration) || "0m 15s",
          verdict: computedVerdict,
          authenticity: data.authenticity,
          identity: data.identity,
          context: data.contextTitle,
          flaggedPhrases: data.threatKeywords,
          spectrogramData: data.spectrogram?.data_url || null,
          spectrogramMetadata: data.spectrogram ? JSON.stringify(data.spectrogram) : null,
        });
        setIsPersisted(true);

        if (savedCall?.id) {
          triggerAnalysisAlert({
            analysisId: savedCall.id,
            syntheticScore: 100 - data.authenticity,
            authenticity: data.authenticity,
            contextRisk: data.contextRisk,
            isIdentityMismatch: data.identity > 0 && data.identity < 45,
            isInconclusive: false,
            verdict: computedVerdict,
            isSynthetic: true,
            authStatus: data.authStatus,
          }).then((alertRes) => {
            if (alertRes && (alertRes.status === "SENT" || alertRes.status === "QUEUED")) {
              setAutomatedAlertNotice({
                active: true,
                messageId: alertRes.messageId,
                text: `Deepfake audio alert dispatched automatically to authorized responder for live voice stream.`,
              });
            }
          }).catch((err) => console.warn("[VoxGuard Alert] Trigger warning:", err));
        }
      } else if (persist) {
        // 2. Persist real call to SQLite database on session conclusion
        const savedCall = await saveCall({
          caller: data.callerName,
          agent: "Operator (SOC)",
          duration: formatTime(callDuration) || "0m 30s",
          verdict: computedVerdict,
          authenticity: data.authenticity,
          identity: data.identity,
          context: data.contextTitle,
          flaggedPhrases: data.threatKeywords,
          spectrogramData: data.spectrogram?.data_url || null,
          spectrogramMetadata: data.spectrogram ? JSON.stringify(data.spectrogram) : null,
        });
        setIsPersisted(true);

        if (savedCall?.id && isSyntheticDetected && !liveAlertTriggeredRef.current) {
          liveAlertTriggeredRef.current = true;
          triggerAnalysisAlert({
            analysisId: savedCall.id,
            syntheticScore: 100 - data.authenticity,
            authenticity: data.authenticity,
            contextRisk: data.contextRisk,
            isIdentityMismatch: data.identity > 0 && data.identity < 45,
            isInconclusive: false,
            verdict: computedVerdict,
            isSynthetic: true,
            authStatus: data.authStatus,
          }).then((alertRes) => {
            if (alertRes && (alertRes.status === "SENT" || alertRes.status === "QUEUED")) {
              setAutomatedAlertNotice({
                active: true,
                messageId: alertRes.messageId,
                text: `Deepfake audio alert dispatched automatically to authorized responder for voice stream session.`,
              });
            }
          }).catch((err) => console.warn("[VoxGuard Alert] Trigger warning:", err));
        }
      }
    } catch (err) {
      console.error("Backend error analyzing live mic stream:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle genuine audio file selection for preview
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so selecting the same file again triggers onChange
    e.target.value = "";

    // Validate audio format
    const validAudioExtensions = /\.(wav|mp3|ogg|flac|m4a|aac|webm|opus)$/i;
    const isAudioType = file.type.startsWith("audio/") || validAudioExtensions.test(file.name);

    if (!isAudioType) {
      setPreviewStatus("Preview unavailable");
      setPreviewError("Unsupported file format. Please select an audio file (.wav, .mp3, .ogg, .flac).");
      setPreviewFile(null);
      if (uploadedAudioUrl) {
        URL.revokeObjectURL(uploadedAudioUrl);
        setUploadedAudioUrl(null);
      }
      return;
    }

    if (isMicActive) toggleMicrophone();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
    }
    
    setIsPreviewPlaying(false);
    setPreviewCurrentTime(0);
    setPreviewDuration(0);
    setPreviewError(null);
    setPreviewFile(file);
    setPreviewStatus("Loading metadata");
    setUploadedAudioUrl(URL.createObjectURL(file));
  };

  const handleEvaluatePreview = async () => {
    if (!previewFile) return;
    
    setIsAnalyzing(true);
    setActionExecuted(false);
    setIsPersisted(false);

    try {
      const data = await analyzeAudioUpload(previewFile, customTranscript || undefined, selectedTargetId || undefined);
      setCurrentScenario(data);
      if (data.transcript && data.transcript.length > 0) {
        const callerMsg = data.transcript.find((m) => m.speaker.includes("Caller"));
        if (callerMsg && callerMsg.text) {
          setLiveSpeechText(callerMsg.text);
        }
      }
      const computedVerdict: RiskState =
        data.actionType === "TERMINATE" ? "CRITICAL" : data.actionType === "STEP_UP" ? "WARNING" : "SAFE";
      setRiskState(computedVerdict);
      setIsSimulating(true);

      // Persist to database
      const savedCall = await saveCall({
        caller: previewFile.name,
        agent: "Operator (SOC)",
        duration: previewDuration > 0 ? formatTime(Math.round(previewDuration)) : "1m 15s",
        verdict: computedVerdict,
        authenticity: data.authenticity,
        identity: data.identity,
        context: data.contextTitle,
        flaggedPhrases: data.threatKeywords,
        spectrogramData: data.spectrogram?.data_url || null,
        spectrogramMetadata: data.spectrogram ? JSON.stringify(data.spectrogram) : null,
      });
      setIsPersisted(true);

      // Trigger server-side Resend alert check post-persistence
      if (savedCall?.id) {
        const isSyntheticDetected = Boolean(
          computedVerdict === "CRITICAL" ||
          data.actionType === "TERMINATE" ||
          (100 - data.authenticity) >= 60 ||
          (data.authStatus && data.authStatus.toLowerCase().includes("synthetic"))
        );

        triggerAnalysisAlert({
          analysisId: savedCall.id,
          syntheticScore: 100 - data.authenticity,
          authenticity: data.authenticity,
          contextRisk: data.contextRisk,
          isIdentityMismatch: data.identity > 0 && data.identity < 45,
          isInconclusive: false,
          verdict: computedVerdict,
          isSynthetic: isSyntheticDetected,
          authStatus: data.authStatus,
        }).then((alertRes) => {
          if (alertRes && (alertRes.status === "SENT" || alertRes.status === "QUEUED")) {
            setAutomatedAlertNotice({
              active: true,
              messageId: alertRes.messageId,
              text: `Deepfake audio alert dispatched automatically to authorized responder for uploaded recording (${previewFile.name}).`,
            });
          }
        }).catch((err) => console.warn("[VoxGuard Alert] Trigger warning:", err));
      }
    } catch (err) {
      console.error("Failed to analyze audio file:", err);
      alert("Backend failed to process audio upload. Please ensure backend is running on http://127.0.0.1:8000.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run contextual threat evaluation on custom text
  const handleEvaluateCustomText = async () => {
    if (!customTranscript.trim()) return;
    setIsAnalyzing(true);
    setActionExecuted(false);
    setIsPersisted(false);

    try {
      const data = await analyzeLiveMic(
        customTranscript.trim(),
        selectedTargetId || undefined
      );
      setCurrentScenario(data);
      const computedVerdict: RiskState =
        data.actionType === "TERMINATE" ? "CRITICAL" : data.actionType === "STEP_UP" ? "WARNING" : "SAFE";
      setRiskState(computedVerdict);
      setIsSimulating(true);

      const savedCall = await saveCall({
        caller: "Interactive Security Inspection",
        agent: "Operator (SOC)",
        duration: "0m 45s",
        verdict: computedVerdict,
        authenticity: data.authenticity,
        identity: data.identity,
        context: data.contextTitle,
        flaggedPhrases: data.threatKeywords,
        spectrogramData: data.spectrogram?.data_url || null,
        spectrogramMetadata: data.spectrogram ? JSON.stringify(data.spectrogram) : null,
      });
      setIsPersisted(true);

      // Trigger server-side Resend alert check post-persistence
      if (savedCall?.id) {
        triggerAnalysisAlert({
          analysisId: savedCall.id,
          syntheticScore: 100 - data.authenticity,
          authenticity: data.authenticity,
          contextRisk: data.contextRisk,
          isIdentityMismatch: data.identity > 0 && data.identity < 45,
          isInconclusive: false,
        }).catch((err) => console.warn("[VoxGuard Alert] Trigger warning:", err));
      }
    } catch (err) {
      console.error("Evaluation failed:", err);
      alert("Evaluation failed. Please check backend connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stopSimulation = () => {
    recognitionActiveRef.current = false;
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    if (isMicActive) toggleMicrophone();
    setIsSimulating(false);
    setRiskState("IDLE");
    setCurrentScenario(null);
    setActionExecuted(false);
    setIsPersisted(false);
    setLiveSpeechText("");
    liveSpeechTextRef.current = "";
    setCaptionStatus("idle");
    setAudioEnergy(0);
    liveAlertTriggeredRef.current = false;
    setAutomatedAlertNotice(null);
    handleClearPreview();
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-transparent text-[#F7F9FC]">
      {/* ─── ACTIVE TELEPHONY & INGESTION COMMAND BAR ─── */}
      <header className="bg-[#0D1422]/90 backdrop-blur-xl border-b border-[#223047] py-4 px-6 sm:px-10 sticky top-16 z-20 shadow-lg">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "p-3 rounded-xl border transition-all shadow-inner",
                riskState === "CRITICAL"
                  ? "bg-red-500/15 border-red-500/40 text-red-400 animate-pulse"
                  : riskState === "WARNING"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : riskState === "SAFE"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-[#121C2D] border-[#223047] text-[#94A3B8]"
              )}
            >
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-[#F7F9FC] tracking-tight">
                  {isSimulating || isMicActive
                    ? currentScenario?.callerName || "Active Voice Intelligence Stream"
                    : "Audio Pipeline Standby"}
                </h1>
                {isSimulating || isMicActive ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-2 py-0.5 gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE SESSION
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[#94A3B8] border-[#223047] bg-[#121C2D] text-xs font-mono">
                    READY
                  </Badge>
                )}
                {isPersisted && (
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3 text-blue-400" /> Persisted to SQLite
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#94A3B8] mt-1 font-mono">
                <span>
                  Target:{" "}
                  <strong className="text-[#F7F9FC] font-medium">
                    {currentScenario?.enrolledTarget ||
                      (selectedTargetId
                        ? enrolledProfiles.find((p) => p.id === selectedTargetId)?.name || selectedTargetId
                        : "Auto-Verify Across Registry")}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  VAD:{" "}
                  <strong
                    className={
                      isSimulating || isMicActive ? "text-emerald-400 font-semibold" : "text-[#64748B]"
                    }
                  >
                    {isSimulating || isMicActive ? "VOICE ACTIVE" : "SILENCE"}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Duration:{" "}
                  <strong className="text-[#F7F9FC] font-mono">{formatTime(callDuration)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Telephony Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold bg-[#121C2D] border-[#223047] text-[#C5D1E0] hover:text-[#F6821F] hover:border-[#F6821F] hover:bg-[#1A263C] cursor-pointer transition-all shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-[#F6821F]" /> Upload Audio (.wav, .mp3)
            </Button>
            <Button
              onClick={isRecordingSnippet ? stopRecordingSnippet : startRecordingSnippet}
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 text-xs font-semibold cursor-pointer transition-all shadow-xs",
                isRecordingSnippet
                  ? "bg-red-500/20 text-red-300 border-red-500/60 hover:bg-red-500/30 animate-pulse"
                  : "bg-[#121C2D] border-[#223047] text-[#C5D1E0] hover:border-[#F6821F] hover:text-[#F6821F] hover:bg-[#1A263C]"
              )}
            >
              <Radio className="w-3.5 h-3.5 text-[#F6821F]" />
              {isRecordingSnippet ? "Stop Recording Snippet" : "Record Snippet"}
            </Button>
            <Button
              onClick={toggleMicrophone}
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 text-xs font-semibold cursor-pointer transition-all shadow-xs",
                isMicActive
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 hover:bg-emerald-500/30"
                  : "bg-[#121C2D] border-[#223047] text-[#C5D1E0] hover:border-[#F6821F] hover:text-[#F6821F] hover:bg-[#1A263C]"
              )}
            >
              {isMicActive ? <MicOff className="w-3.5 h-3.5 text-emerald-400" /> : <Mic className="w-3.5 h-3.5 text-[#F6821F]" />}
              {isMicActive ? "Stop & Process Mic" : "Live Mic Stream"}
            </Button>
            <Button
              onClick={stopSimulation}
              disabled={!isSimulating && !isMicActive && !previewFile}
              variant="ghost"
              size="sm"
              className="text-xs text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 gap-1 cursor-pointer transition-all"
            >
              <PhoneOff className="w-3.5 h-3.5" /> Reset
            </Button>
          </div>
        </div>
      </header>

      {/* Recorded Snippet Playback & Evaluate */}
      {recordedAudioUrl && (
        <div className="max-w-[1400px] w-full mx-auto mt-4 px-6 sm:px-10">
          <div className="p-3.5 bg-[#0D1422] shadow-xl border border-[#223047] rounded-xl flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <FileAudio className="w-5 h-5 text-[#F6821F] shrink-0" />
              <span className="text-sm font-semibold text-[#F7F9FC] shrink-0">Recorded Audio Snippet</span>
              <audio src={recordedAudioUrl} controls className="h-9 w-full sm:w-[300px] rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={evaluateRecordedSnippet}
                disabled={isAnalyzing}
                size="sm"
                className="bg-[#F6821F] hover:bg-[#E85D04] text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-md"
              >
                {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Evaluate Audio Snippet
              </Button>
              <Button
                onClick={() => { setRecordedAudioUrl(null); setRecordedAudioBlob(null); }}
                variant="ghost"
                size="sm"
                className="text-xs text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AUDIO PREVIEW CARD ─── */}
      <div className="max-w-[1400px] w-full mx-auto mt-4 px-6 sm:px-10 space-y-3">
        <div className="p-5 cyber-panel bg-[#0D1422]/90 shadow-xl border border-[#223047] rounded-2xl flex flex-col gap-3 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#F6821F]/10 border border-[#F6821F]/30 text-[#F6821F]">
                <FileAudio className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#F7F9FC] tracking-tight">Audio Capture Station</h3>
            </div>
            
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-mono font-medium border flex items-center gap-1.5 px-2.5 py-0.5",
                previewStatus === "Ready to evaluate"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : previewStatus === "Playing"
                  ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                  : previewStatus === "Paused"
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                  : previewStatus === "Loading metadata"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : previewStatus === "Preview unavailable"
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : "bg-[#121C2D] text-[#94A3B8] border-[#223047]"
              )}
            >
              {previewStatus === "Playing" && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              )}
              {previewStatus === "Ready to evaluate" && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              {previewStatus === "Preview unavailable" && (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              )}
              {previewStatus}
            </Badge>
          </div>

          {!previewFile ? (
            <div className="p-6 border border-dashed border-[#223047] rounded-xl bg-[#080D17]/60 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#121C2D] border border-[#223047] flex items-center justify-center text-[#F6821F] mb-2.5">
                <Upload className="w-4 h-4" />
              </div>
              <span className="text-sm text-[#C5D1E0] font-medium">Select an audio file to inspect waveform before neural evaluation.</span>
              <p className="text-xs text-[#64748B] mt-1 font-mono">Accepted codecs: 16kHz WAV, MP3, FLAC, OGG, M4A, Opus</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Metadata display: Filename, Type, Size, Duration */}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 text-xs text-[#94A3B8] bg-[#080D17]/80 p-3 rounded-xl border border-[#223047]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[#64748B] font-medium">File:</span>
                  <span className="font-semibold text-[#F7F9FC] truncate max-w-[240px] sm:max-w-[360px]" title={previewFile.name}>
                    {previewFile.name}
                  </span>
                </div>
                <span className="text-[#334155]">•</span>
                <div>
                  <span className="text-[#64748B] font-medium">Format:</span>{" "}
                  <span className="font-mono text-[#C5D1E0]">{previewFile.type || "audio/wav"}</span>
                </div>
                <span className="text-[#334155]">•</span>
                <div>
                  <span className="text-[#64748B] font-medium">Size:</span>{" "}
                  <span className="font-mono text-[#C5D1E0]">
                    {previewFile.size > 1024 * 1024
                      ? `${(previewFile.size / (1024 * 1024)).toFixed(2)} MB`
                      : `${(previewFile.size / 1024).toFixed(1)} KB`}
                  </span>
                </div>
                <span className="text-[#334155]">•</span>
                <div>
                  <span className="text-[#64748B] font-medium">Duration:</span>{" "}
                  <span className="font-mono font-semibold text-emerald-400">
                    {previewDuration > 0
                      ? `${formatAudioTime(previewCurrentTime)} / ${formatAudioTime(previewDuration)} (${previewDuration.toFixed(1)}s)`
                      : "Detecting audio duration..."}
                  </span>
                </div>
              </div>

              {/* Working Playback Controls: Play/Pause, Seek bar, Time, Mute, Volume */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#080D17]/60 p-3 rounded-xl border border-[#223047]">
                {/* Play / Pause button */}
                <button
                  type="button"
                  onClick={togglePreviewPlay}
                  disabled={previewStatus === "Preview unavailable" || previewStatus === "Loading metadata"}
                  className="w-10 h-10 rounded-full bg-[#F6821F] hover:bg-[#E85D04] text-white flex items-center justify-center shadow-lg shadow-[#F6821F]/20 cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#F6821F] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  title={isPreviewPlaying ? "Pause audio (Space)" : "Play audio (Space)"}
                  aria-label={isPreviewPlaying ? "Pause audio" : "Play audio"}
                >
                  {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                {/* Current Time / Total Duration Display */}
                <span className="text-xs font-mono font-semibold text-[#94A3B8] min-w-[90px] text-center shrink-0">
                  {formatAudioTime(previewCurrentTime)} / {formatAudioTime(previewDuration)}
                </span>

                {/* Seek / Progress Slider */}
                <div className="flex-1 w-full flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={previewDuration || 100}
                    step={0.1}
                    value={previewCurrentTime}
                    onChange={handlePreviewSeek}
                    disabled={previewStatus === "Preview unavailable" || !previewDuration}
                    className="w-full h-2 bg-[#121C2D] border border-[#223047] rounded-lg appearance-none cursor-pointer accent-[#F6821F] focus:outline-none focus:ring-2 focus:ring-[#F6821F]"
                    title="Seek playback position (Left/Right arrows)"
                    aria-label="Seek progress bar"
                  />
                </div>

                {/* Mute and Volume Control */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={togglePreviewMute}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#121C2D] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F6821F]"
                    title={isPreviewMuted || previewVolume === 0 ? "Unmute audio" : "Mute audio"}
                    aria-label={isPreviewMuted || previewVolume === 0 ? "Unmute audio" : "Mute audio"}
                  >
                    {isPreviewMuted || previewVolume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-[#94A3B8]" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isPreviewMuted ? 0 : previewVolume}
                    onChange={handlePreviewVolumeChange}
                    className="w-16 sm:w-20 h-1.5 bg-[#121C2D] border border-[#223047] rounded-lg appearance-none cursor-pointer accent-[#F6821F] focus:outline-none"
                    title={`Volume: ${Math.round((isPreviewMuted ? 0 : previewVolume) * 100)}%`}
                    aria-label="Volume control"
                  />
                </div>

                {/* Native local audio element */}
                <audio
                  ref={previewAudioRef}
                  src={uploadedAudioUrl || undefined}
                  preload="metadata"
                  onTimeUpdate={() => {
                    if (previewAudioRef.current) {
                      setPreviewCurrentTime(previewAudioRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (previewAudioRef.current) {
                      const dur = previewAudioRef.current.duration;
                      if (isNaN(dur) || !isFinite(dur)) {
                        setPreviewStatus("Preview unavailable");
                        setPreviewError("Could not determine audio duration from file header.");
                      } else {
                        setPreviewDuration(dur);
                        setPreviewStatus("Ready to evaluate");
                        setPreviewError(null);
                      }
                    }
                  }}
                  onPlay={() => {
                    setIsPreviewPlaying(true);
                    setPreviewStatus("Playing");
                  }}
                  onPause={() => {
                    setIsPreviewPlaying(false);
                    setPreviewStatus("Paused");
                  }}
                  onEnded={() => {
                    setIsPreviewPlaying(false);
                    setPreviewStatus("Paused");
                    if (previewAudioRef.current) {
                      previewAudioRef.current.currentTime = 0;
                      setPreviewCurrentTime(0);
                    }
                  }}
                  onError={() => {
                    setIsPreviewPlaying(false);
                    setPreviewStatus("Preview unavailable");
                    setPreviewError("Failed to decode audio. The file may be corrupt or encoded in an unsupported codec.");
                  }}
                />
              </div>

              {/* Actionable error notice if file is corrupt or unplayable */}
              {previewError && (
                <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span><strong>Preview unavailable:</strong> {previewError}</span>
                </div>
              )}

              {/* Helper notice and Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 pt-3 border-t border-[#223047] gap-3">
                <p className="text-[11px] text-[#64748B]">
                  Client preview mode enables acoustic listening before initiating the AASIST + ECAPA-TDNN evaluation pipeline.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={handleClearPreview}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleEvaluatePreview}
                    disabled={isAnalyzing || previewStatus === "Preview unavailable" || previewStatus === "Loading metadata"}
                    size="sm"
                    className="bg-[#F6821F] hover:bg-[#E85D04] text-white text-xs gap-1.5 cursor-pointer shadow-lg shadow-[#F6821F]/20 font-semibold"
                  >
                    {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    Evaluate Voice Authenticity
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── AUDIO PREVIEW SPECTROGRAM ─── */}
        {previewFile && (
          <AudioPreviewSpectrogram audioFile={previewFile} />
        )}
      </div>

      {/* ─── MAIN SOC MONITORING WORKSPACE ─── */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 sm:p-10 space-y-6">
        {/* Registry Status Notice if 0 identities enrolled */}
        {enrolledProfiles.length === 0 && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 flex items-start gap-3 text-[#F7F9FC]">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-amber-200">
              <p className="font-semibold text-sm text-amber-100">Zero Voiceprints Enrolled in SQLite Database</p>
              <p className="mt-0.5 text-amber-300/80">
                The speaker registry currently has no enrolled reference voiceprints. Audio analysis will
                evaluate acoustic authenticity and contextual threat risks, but speaker consistency verification
                requires enrolled voiceprints.
              </p>
            </div>
            <Link href="/identities">
              <Button size="sm" className="bg-[#F6821F] hover:bg-[#E85D04] text-white text-xs shrink-0 font-semibold">
                <Fingerprint className="w-3.5 h-3.5 mr-1" /> Enroll Voiceprint
              </Button>
            </Link>
          </div>
        )}

        {/* ─── FLAGSHIP VOICE TRUST HERO ROW (3D CORE + SOVEREIGN VERDICT) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT 5 COLS: Signature 3D Voice Trust Core */}
          <div className="lg:col-span-5 cyber-panel bg-[#0D1422]/95 border border-[#223047] rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl flex flex-col justify-between shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#223047] pb-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F6821F] animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#F7F9FC]">
                  Voice Trust Core 3D
                </h2>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-[#223047] text-[#94A3B8] bg-[#121C2D]">
                {isSimulating || isMicActive ? "WebGL 60FPS • REACTIVE" : "WebGL 60FPS • STANDBY"}
              </Badge>
            </div>

            {/* 3D WebGL Canvas */}
            <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
              <VoiceTrustCore3D
                riskState={riskState}
                isSimulating={isSimulating}
                isMicActive={isMicActive}
                audioEnergy={audioEnergy}
              />
            </div>

            {/* Core Telemetry Strip */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#223047] text-center">
              <div className="bg-[#0B1120] border border-[#223047]/60 rounded-lg p-2">
                <span className="text-[9px] uppercase tracking-wider text-[#64748B] block">RESONANCE</span>
                <span className="text-xs font-mono font-bold text-emerald-400">98.4% STABLE</span>
              </div>
              <div className="bg-[#0B1120] border border-[#223047]/60 rounded-lg p-2">
                <span className="text-[9px] uppercase tracking-wider text-[#64748B] block">VAD LATTICE</span>
                <span className="text-xs font-mono font-bold text-[#F7F9FC]">
                  {isMicActive || isSimulating ? "DETECTED" : "IDLE"}
                </span>
              </div>
              <div className="bg-[#0B1120] border border-[#223047]/60 rounded-lg p-2">
                <span className="text-[9px] uppercase tracking-wider text-[#64748B] block">RMS ENERGY</span>
                <span className="text-xs font-mono font-bold text-[#F6821F]">
                  {(audioEnergy * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT 7 COLS: Sovereign AMVTF Decision & Verdict Panel */}
          <div
            className={cn(
              "lg:col-span-7 cyber-panel rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl flex flex-col justify-between shadow-2xl transition-all border",
              riskState === "CRITICAL"
                ? "bg-[#180A0E]/95 border-red-500/50 shadow-red-950/30"
                : riskState === "WARNING"
                ? "bg-[#171107]/95 border-amber-500/50 shadow-amber-950/30"
                : riskState === "SAFE"
                ? "bg-[#071710]/95 border-emerald-500/50 shadow-emerald-950/30"
                : "bg-[#0D1422]/95 border-[#223047]"
            )}
          >
            <div>
              {/* Verdict Header & Fused Risk Score Gauge */}
              <div className="flex items-start justify-between gap-4 border-b border-[#223047]/60 pb-5">
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      "p-3 rounded-xl border shadow-inner",
                      riskState === "CRITICAL"
                        ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                        : riskState === "WARNING"
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                        : riskState === "SAFE"
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : "bg-[#121C2D] border-[#223047] text-[#94A3B8]"
                    )}
                  >
                    {riskState === "CRITICAL" ? (
                      <ShieldAlert className="w-7 h-7" />
                    ) : riskState === "WARNING" ? (
                      <AlertTriangle className="w-7 h-7" />
                    ) : riskState === "SAFE" ? (
                      <ShieldCheck className="w-7 h-7" />
                    ) : (
                      <Activity className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-[#F7F9FC] tracking-tight">
                        {currentScenario
                          ? `AMVTF Sovereign Verdict: ${currentScenario.actionType === "TERMINATE" ? "CRITICAL THREAT" : currentScenario.actionType === "STEP_UP" ? "SUSPICIOUS / STEP-UP" : "VERIFIED SAFE"}`
                          : "AMVTF Sovereign Engine Standby"}
                      </h2>
                      {riskState !== "IDLE" && (
                        <Badge
                          className={cn(
                            "text-xs font-mono font-bold px-2 py-0.5",
                            riskState === "CRITICAL"
                              ? "bg-red-600 text-white"
                              : riskState === "WARNING"
                              ? "bg-amber-600 text-white"
                              : "bg-emerald-600 text-white"
                          )}
                        >
                          {riskState}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1">
                      {currentScenario?.recommendedAction || "Awaiting audio stream or file input to evaluate trust."}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-mono block">Fused Risk Score</span>
                  <div className="flex items-baseline justify-end gap-1">
                    <span
                      className={cn(
                        "text-3xl sm:text-4xl font-black font-mono tracking-tight",
                        riskState === "CRITICAL"
                          ? "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                          : riskState === "WARNING"
                          ? "text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                          : riskState === "SAFE"
                          ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                          : "text-[#64748B]"
                      )}
                    >
                      {currentScenario ? `${currentScenario.fusedRiskScore}` : "--"}
                    </span>
                    <span className="text-xs text-[#64748B] font-mono">/ 100</span>
                  </div>
                </div>
              </div>

              {/* Rationale Explanation & Prediction Pill */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#C5D1E0] uppercase tracking-wider text-[11px]">
                    Multi-Model Threat Diagnosis
                  </span>
                  {currentScenario?.predictionState && (
                    <Badge
                      className={cn(
                        "text-[10px] uppercase font-bold font-mono px-2 py-0.5 border",
                        currentScenario.predictionState === "LIKELY_SYNTHETIC"
                          ? "bg-red-500/20 text-red-300 border-red-500/50"
                          : currentScenario.predictionState === "INCONCLUSIVE"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                      )}
                    >
                      {currentScenario.predictionState.replace("_", " ")}
                    </Badge>
                  )}
                </div>

                <div className="p-3.5 bg-[#080D17]/80 rounded-xl border border-[#223047] text-xs text-[#C5D1E0] leading-relaxed">
                  <span className="font-bold text-[#F7F9FC]">Rationale: </span>
                  {currentScenario?.rationale || "System in standby. Provide genuine or synthetic speech samples to run acoustic vocoder detection, speaker consistency embedding, and DistilBERT semantic intent analysis."}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {riskState !== "IDLE" && (
              <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-4 border-t border-[#223047]">
                <span className="text-xs font-semibold text-[#94A3B8] mr-2">Operator Action:</span>
                {riskState === "CRITICAL" && (
                  <Button
                    size="sm"
                    onClick={() => setActionExecuted(true)}
                    className={cn(
                      "text-xs font-semibold gap-1.5 shadow-lg transition-all",
                      actionExecuted
                        ? "bg-[#1E293B] text-slate-300 border border-[#334155]"
                        : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/30"
                    )}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    {actionExecuted ? "Account Frozen & Session Terminated" : "Terminate Call & Freeze Account"}
                  </Button>
                )}
                {riskState === "WARNING" && (
                  <Button
                    size="sm"
                    onClick={() => setActionExecuted(true)}
                    className={cn(
                      "text-xs font-semibold gap-1.5 shadow-lg transition-all",
                      actionExecuted
                        ? "bg-[#1E293B] text-slate-300 border border-[#334155]"
                        : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30"
                    )}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {actionExecuted ? "Secondary OOB Challenge Dispatched" : "Trigger Out-of-Band Verification"}
                  </Button>
                )}
                {riskState === "SAFE" && (
                  <Button
                    size="sm"
                    onClick={() => setActionExecuted(true)}
                    className={cn(
                      "text-xs font-semibold gap-1.5 shadow-lg transition-all",
                      actionExecuted
                        ? "bg-[#1E293B] text-slate-300 border border-[#334155]"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                    )}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {actionExecuted ? "Session Cleared in Audit Trail" : "Authorize Session Operations"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Real Audio & Threat Analysis Control Panel */}
        <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-2xl shadow-xl p-5 space-y-4 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F6821F]" />
              <h2 className="text-xs font-bold text-[#F7F9FC] uppercase tracking-wider">
                Real-Time AMVTF Multi-Signal Ingest Console
              </h2>
            </div>

            {/* Target Voiceprint Selector from SQLite */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#94A3B8] font-medium font-mono">Verify Against:</label>
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="text-xs border border-[#223047] rounded-lg px-3 py-1.5 bg-[#121C2D] text-[#F7F9FC] focus:outline-none focus:border-[#F6821F] font-mono cursor-pointer"
              >
                <option value="">Auto-Detect / All Registered Profiles</option>
                {enrolledProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id}) — {p.department}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Dialogue / Threat Keyword Tester */}
          <div className="flex flex-col md:flex-row items-center gap-3 pt-2 border-t border-[#223047]">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={customTranscript}
                onChange={(e) => setCustomTranscript(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEvaluateCustomText()}
                placeholder="Test contextual dialogue (e.g., 'Bypass protocol and execute wire transfer immediately, CEO approved')..."
                className="w-full text-xs px-3.5 py-2.5 bg-[#080D17] border border-[#223047] rounded-xl text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F] font-mono"
              />
            </div>
            <Button
              onClick={handleEvaluateCustomText}
              disabled={isAnalyzing || !customTranscript.trim()}
              size="sm"
              className="bg-[#121C2D] hover:bg-[#1A263C] border border-[#223047] text-[#F7F9FC] text-xs font-semibold gap-1.5 shrink-0 cursor-pointer w-full md:w-auto shadow-sm"
            >
              {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F6821F]" /> : <Send className="w-3.5 h-3.5 text-[#F6821F]" />}
              Evaluate Contextual Risk
            </Button>
          </div>

          {/* Live Mic Speech Transcript Display if mic active */}
          {isMicActive && (
            <div className="p-4 bg-[#080D17] border border-[#223047] rounded-xl space-y-2.5 shadow-xl animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-semibold text-emerald-300 uppercase tracking-wider text-[11px] font-mono">
                    Live Microphone Stream Active
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-[#94A3B8] font-mono px-1.5 py-0.5 rounded bg-[#121C2D] border border-[#223047]">
                    {captionStatus === "listening"
                      ? "listening"
                      : captionStatus === "unsupported"
                      ? "browser ASR unsupported — using server ASR"
                      : captionStatus === "error"
                      ? "browser ASR error — using server ASR"
                      : "starting"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {currentScenario?.predictionState && (
                    <Badge
                      className={cn(
                        "text-[10px] uppercase font-bold font-mono px-2 py-0.5",
                        currentScenario.predictionState === "LIKELY_SYNTHETIC"
                          ? "bg-red-500/20 text-red-300 border-red-500/50"
                          : currentScenario.predictionState === "INCONCLUSIVE"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                      )}
                    >
                      {currentScenario.predictionState.replace("_", " ")}
                    </Badge>
                  )}
                  {liveSpeechText && (
                    <button
                      type="button"
                      onClick={() => {
                        liveSpeechTextRef.current = "";
                        setLiveSpeechText("");
                      }}
                      className="text-[10px] text-[#94A3B8] hover:text-[#F7F9FC] underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="p-3 bg-[#050811] rounded-lg border border-[#223047] text-xs">
                <span className="text-[#64748B] font-mono font-semibold">Spoken Transcript: </span>
                <span className="text-emerald-400 font-mono">
                  {liveSpeechText ||
                    (captionStatus === "unsupported"
                      ? "Speak now — captions will appear from server transcription each analysis window…"
                      : "Listening… speak clearly into the microphone.")}
                </span>
              </div>
              {currentScenario?.authStatus && (
                <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-0.5 font-mono">
                  <span className="truncate max-w-[70%]">
                    Acoustic Diagnosis: <strong className="text-[#F7F9FC]">{currentScenario.authStatus}</strong>
                  </span>
                  <span>
                    Authenticity: <strong className={currentScenario.authenticity <= 50 ? "text-red-400" : "text-emerald-400"}>{currentScenario.authenticity}%</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── WORKSPACE TWO-COLUMN FORENSIC LAYOUT ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 7 COLS: Live Voiceprint Analysis & Threat Feeds */}
          <div className="lg:col-span-7 space-y-6">
            {/* Automated Alert Email Notification Banner */}
            {automatedAlertNotice && (
              <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-2xl flex items-center justify-between text-xs shadow-xl animate-in fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-red-900/50 border border-red-700/60 flex items-center justify-center text-red-300 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-200 uppercase tracking-wider text-[11px] font-mono">
                        Automated Security Alert Dispatched
                      </span>
                      <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[10px] font-mono">
                        Resend Provider Delivered
                      </Badge>
                    </div>
                    <p className="text-red-300 text-xs mt-0.5 truncate">{automatedAlertNotice.text}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {automatedAlertNotice.messageId && (
                    <span className="hidden sm:inline-block text-[10px] font-mono text-red-300 bg-red-900/40 px-2 py-0.5 rounded border border-red-700/50">
                      ID: {automatedAlertNotice.messageId.slice(0, 16)}
                    </span>
                  )}
                  <button
                    onClick={() => setAutomatedAlertNotice(null)}
                    className="text-red-400 hover:text-red-200 text-xs p-1 cursor-pointer"
                    title="Dismiss alert notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Audio Waveform & Biometric Visualization */}
            <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-2xl shadow-xl p-5 space-y-4 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#223047] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#F7F9FC] tracking-tight">
                    {currentScenario?.spectrogram?.available
                      ? "Acoustic Forensic Spectrogram"
                      : "Audio Ingestion & Frequency Spectrogram"}
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {currentScenario?.spectrogram?.available
                      ? "Generated from normalized 16kHz audio fed into detection pipeline."
                      : "Live 16kHz PCM audio frequency bin magnitude"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isAnalyzing
                        ? "bg-orange-500 animate-pulse"
                        : currentScenario?.spectrogram?.available
                        ? "bg-emerald-400"
                        : isSimulating || isMicActive
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-[#64748B]"
                    )}
                  />
                  <span className="text-xs font-mono text-[#94A3B8]">
                    {isAnalyzing
                      ? "EVALUATING..."
                      : currentScenario?.spectrogram?.available
                      ? "EVIDENCE LOCKED"
                      : isSimulating || isMicActive
                      ? "LIVE SIGNAL"
                      : "OFFLINE"}
                  </span>
                </div>
              </div>

              {/* Body: Backend Evidence Spectrogram OR Analyzing State OR Live Frequency Bars */}
              {isAnalyzing ? (
                <div className="h-44 bg-[#080D17] rounded-xl border border-[#223047] flex flex-col items-center justify-center text-center p-6 text-slate-300">
                  <RefreshCw className="w-7 h-7 text-[#F6821F] animate-spin mb-2" />
                  <p className="text-xs font-semibold text-[#F7F9FC]">
                    Computing Forensic Analysis Spectrogram...
                  </p>
                  <p className="text-[11px] text-[#94A3B8] mt-1 max-w-md font-mono">
                    Extracting 512-point Hann STFT slices from normalized 16kHz audio fed into detection pipeline.
                  </p>
                </div>
              ) : currentScenario?.spectrogram?.available && currentScenario.spectrogram.data_url ? (
                <div className="space-y-3">
                  {/* Accessible Summary Notice */}
                  <div
                    role="status"
                    aria-live="polite"
                    className="text-xs bg-[#080D17] border border-[#223047] text-[#94A3B8] px-3 py-2 rounded-xl font-mono flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="font-sans font-medium text-[#F7F9FC]">
                      {currentScenario.spectrogram.summary || (
                        <>
                          Spectrogram for <span className="font-semibold text-emerald-400">{currentScenario.spectrogram.filename}</span>, duration{" "}
                          <span className="font-semibold">{currentScenario.spectrogram.duration_seconds}s</span>, sample rate{" "}
                          <span className="font-semibold">{currentScenario.spectrogram.sample_rate?.toLocaleString()} Hz</span>.
                        </>
                      )}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-[#121C2D] font-mono text-[#F6821F] border-[#223047]">
                      {currentScenario.spectrogram.preprocessing_version || "AMVTF-v2.1-Preprocessed-16kHz"}
                    </Badge>
                  </div>

                  {/* Backend Generated Spectrogram Image */}
                  <div className="relative rounded-xl overflow-hidden border border-[#223047] bg-[#050811] shadow-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentScenario.spectrogram.data_url}
                      alt={
                        currentScenario.spectrogram.summary ||
                        `Analysis Spectrogram for ${currentScenario.spectrogram.filename || "audio"}`
                      }
                      className="w-full h-auto block select-none"
                    />
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-0.5">
                    <div className="bg-[#080D17] p-2.5 rounded-xl border border-[#223047]">
                      <span className="text-[#64748B] text-[10px] uppercase font-semibold block">Analysis ID</span>
                      <span className="font-bold font-mono text-emerald-400 text-xs truncate block">
                        {currentScenario.spectrogram.analysis_id || (isPersisted ? "SAVED" : "EVAL-ACTIVE")}
                      </span>
                    </div>
                    <div className="bg-[#080D17] p-2.5 rounded-xl border border-[#223047]">
                      <span className="text-[#64748B] text-[10px] uppercase font-semibold block">Sample Rate</span>
                      <span className="font-bold font-mono text-[#F7F9FC] text-xs">
                        {currentScenario.spectrogram.sample_rate?.toLocaleString() || "16,000"} Hz
                      </span>
                    </div>
                    <div className="bg-[#080D17] p-2.5 rounded-xl border border-[#223047]">
                      <span className="text-[#64748B] text-[10px] uppercase font-semibold block">FFT & Hop</span>
                      <span className="font-bold font-mono text-[#F7F9FC] text-xs">
                        {currentScenario.spectrogram.n_fft || 512} / {currentScenario.spectrogram.hop_length || 256}
                      </span>
                    </div>
                    <div className="bg-[#080D17] p-2.5 rounded-xl border border-[#223047]">
                      <span className="text-[#64748B] text-[10px] uppercase font-semibold block">Frequency Scale</span>
                      <span className="font-bold font-mono text-[#F7F9FC] text-xs">
                        {currentScenario.spectrogram.frequency_scale || "Linear 0-8kHz"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Dynamic Audio Bars */
                <div className="h-28 bg-[#080D17] rounded-xl p-4 flex items-end justify-between gap-1.5 overflow-hidden border border-[#223047]">
                  {micVolume.map((vol, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className={cn(
                          "w-full rounded-t transition-all duration-75",
                          riskState === "CRITICAL"
                            ? "bg-gradient-to-t from-red-600 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                            : riskState === "WARNING"
                            ? "bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                            : riskState === "SAFE"
                            ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "bg-[#1E293B]"
                        )}
                        style={{ height: `${isSimulating || isMicActive ? vol : 8}%` }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Spectral Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div className="bg-[#080D17] p-2.5 rounded-xl border border-[#223047]">
                  <span className="text-[#64748B] text-[10px] uppercase block font-mono">Spectral Entropy</span>
                  <span className="font-bold font-mono text-[#F7F9FC] text-xs">
                    {currentScenario?.spectralEntropy !== undefined ? `${currentScenario.spectralEntropy}` : "--"}
                  </span>
                </div>
                <div className="bg-[#080D17] p-2.5 rounded-xl border border-[#223047]">
                  <span className="text-[#64748B] text-[10px] uppercase block font-mono">Zero-Crossing Rate</span>
                  <span className="font-bold font-mono text-[#F7F9FC] text-xs">
                    {currentScenario?.zcr !== undefined ? `${currentScenario.zcr}` : "--"}
                  </span>
                </div>
                <div className="bg-[#080D17] p-2.5 rounded-xl border border-[#223047]">
                  <span className="text-[#64748B] text-[10px] uppercase block font-mono">Micro-Tremor / Jitter</span>
                  <span className="font-bold font-mono text-[#F7F9FC] text-xs">
                    {currentScenario?.jitter !== undefined ? `${currentScenario.jitter}%` : "--"}
                  </span>
                </div>
                <div className="bg-[#080D17] p-2.5 rounded-xl border border-[#223047]">
                  <span className="text-[#64748B] text-[10px] uppercase block font-mono">Glottal Kurtosis</span>
                  <span
                    className={cn(
                      "font-bold font-mono text-xs",
                      currentScenario?.kurtosis !== undefined && currentScenario.kurtosis < 4.0
                        ? "text-red-400"
                        : "text-emerald-400"
                    )}
                  >
                    {currentScenario?.kurtosis !== undefined ? `${currentScenario.kurtosis}` : "--"}
                  </span>
                </div>
              </div>

              {/* Dynamic Spoofing Indicators Banner if detected */}
              {currentScenario?.syntheticIndicators && currentScenario.syntheticIndicators.length > 0 && (
                <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-3 text-xs text-red-200 space-y-1">
                  <span className="font-semibold flex items-center gap-1.5 text-red-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    Synthetic / AI Acoustic Artifacts Detected:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-300/80 font-mono">
                    {currentScenario.syntheticIndicators.map((ind, idx) => (
                      <li key={idx}>{ind}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Live Conversation Transcript Feed */}
            <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-2xl shadow-xl p-5 space-y-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#F7F9FC]">Audited Dialogue Feed</h3>
                  <p className="text-xs text-[#94A3B8]">Real-time transcripts analyzed by DistilBERT NLP</p>
                </div>
                {currentScenario && (
                  <Badge variant="outline" className="text-[10px] text-[#94A3B8] border-[#223047] bg-[#121C2D] font-mono">
                    {currentScenario.nlpIntent}
                  </Badge>
                )}
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {!currentScenario ? (
                  <div className="py-12 text-center text-[#64748B] text-xs font-mono">
                    No active dialogue recorded. Start live microphone monitoring or upload an audio file above.
                  </div>
                ) : (
                  currentScenario.transcript.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-xl border text-xs transition-all",
                        msg.alert
                          ? "bg-red-950/40 border-red-800/80 text-red-200"
                          : msg.speaker === "Caller"
                          ? "bg-[#080D17] border-[#223047] text-[#C5D1E0]"
                          : "bg-[#0C1829] border-[#1D3557] text-[#93C5FD]"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#F7F9FC]">{msg.speaker}</span>
                        <span className="text-[10px] text-[#64748B] font-mono">{msg.time}</span>
                      </div>
                      <p>{msg.text}</p>
                      {msg.threatKeywords && msg.threatKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-1 border-t border-red-800/40">
                          {msg.threatKeywords.map((kw, ki) => (
                            <Badge key={ki} className="bg-red-500/20 text-red-300 border-red-500/40 text-[10px] px-1.5 py-0 font-mono">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: Multi-Signal Engine Breakdown */}
          <div className="lg:col-span-5 space-y-6">
            {/* LIVE AI VOICE DETECTION */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Live AI Voice Detection
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Synthetic-speech evidence (separate from fraud-language risk)
                  </p>
                </div>
                <Badge
                  className={cn(
                    "text-[10px] font-mono",
                    !currentScenario?.sessionDetectionState && !currentScenario?.detectionState
                      ? "bg-gray-100 text-gray-600"
                      : (currentScenario.sessionDetectionState || currentScenario.detectionState) ===
                          "LIKELY_AI_GENERATED"
                      ? "bg-red-100 text-red-800 border-red-300"
                      : (currentScenario.sessionDetectionState || currentScenario.detectionState) ===
                          "LIKELY_HUMAN"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                  )}
                >
                  {currentScenario?.sessionDetectionState ||
                    currentScenario?.detectionState ||
                    "IDLE"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                  <p className="text-[10px] uppercase text-gray-500 font-semibold">Chunk synthetic risk</p>
                  <p className="text-lg font-mono font-bold text-gray-900 mt-0.5">
                    {currentScenario?.syntheticProbability != null
                      ? `${currentScenario.syntheticProbability.toFixed(1)}%`
                      : "--"}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                  <p className="text-[10px] uppercase text-gray-500 font-semibold">Session EMA risk</p>
                  <p className="text-lg font-mono font-bold text-gray-900 mt-0.5">
                    {currentScenario?.sessionSyntheticProbability != null
                      ? `${currentScenario.sessionSyntheticProbability.toFixed(1)}%`
                      : "--"}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                  <p className="text-[10px] uppercase text-gray-500 font-semibold">Voiced seconds</p>
                  <p className="text-sm font-mono font-semibold text-gray-900 mt-0.5">
                    {currentScenario?.voicedSecondsAccumulated != null
                      ? `${currentScenario.voicedSecondsAccumulated.toFixed(1)}s`
                      : "--"}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                  <p className="text-[10px] uppercase text-gray-500 font-semibold">Model</p>
                  <p className="text-[11px] font-mono text-gray-800 mt-0.5 break-all">
                    {currentScenario?.modelVersion || "—"}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                States: WAITING_FOR_SPEECH / INSUFFICIENT_AUDIO / UNCERTAIN / LIKELY_HUMAN / LIKELY_AI_GENERATED.
                Session verdict needs ~3s voiced audio. SAFE/WARNING/CRITICAL remain overall SOC actions.
              </p>
            </div>

            {/* Three Signal Layer Breakdown */}
            <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-2xl shadow-xl p-5 space-y-5 backdrop-blur-xl">
              <div>
                <h3 className="text-sm font-bold text-[#F7F9FC] uppercase tracking-wider">
                  AMVTF Multi-Signal Trust Breakdown
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Real-time fusion across 3 defense layers</p>
              </div>

              {/* Layer 1: AASIST Authenticity */}
              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <div>
                    <p className="text-xs font-bold text-[#F7F9FC]">Layer 1: AASIST Authenticity (40%)</p>
                    <p className="text-[10px] text-[#64748B] font-mono">Audio Anti-Spoofing & Vocoder Detection (Min: {systemSettings?.aasistThreshold ?? 50}%)</p>
                  </div>
                  <span className="text-sm font-bold font-mono text-[#F7F9FC]">
                    {currentScenario ? `${currentScenario.authenticity}%` : "--"}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-[#080D17] rounded-full overflow-hidden border border-[#223047] relative">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      !currentScenario
                        ? "w-0"
                        : currentScenario.authenticity >= (systemSettings?.aasistThreshold ?? 50)
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    )}
                    style={{ width: currentScenario ? `${currentScenario.authenticity}%` : "0%" }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#94A3B8] z-10"
                    style={{ left: `${systemSettings?.aasistThreshold ?? 50}%` }}
                    title={`AASIST Threshold: ${systemSettings?.aasistThreshold ?? 50}%`}
                  />
                </div>
                <div className="flex justify-between items-center mt-1 text-[10px] text-[#94A3B8] font-mono">
                  <span>Threshold: &gt;{systemSettings?.aasistThreshold ?? 50}% Human</span>
                  <span className="font-semibold text-emerald-400">
                    {currentScenario?.authStatus || "Awaiting Stream"}
                  </span>
                </div>
              </div>

              {/* Layer 2: ECAPA-TDNN Speaker Identity */}
              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <div>
                    <p className="text-xs font-bold text-[#F7F9FC]">Layer 2: ECAPA-TDNN Identity (35%)</p>
                    <p className="text-[10px] text-[#64748B] font-mono">192-Dim Cosine Match vs Enrolled Profiles (Min: {systemSettings?.ecapaThreshold ?? 70}%)</p>
                  </div>
                  <span className="text-sm font-bold font-mono text-[#F7F9FC]">
                    {currentScenario ? `${currentScenario.identity}%` : "--"}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-[#080D17] rounded-full overflow-hidden border border-[#223047] relative">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      !currentScenario
                        ? "w-0"
                        : currentScenario.identity >= (systemSettings?.ecapaThreshold ?? 70)
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    )}
                    style={{ width: currentScenario ? `${currentScenario.identity}%` : "0%" }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#94A3B8] z-10"
                    style={{ left: `${systemSettings?.ecapaThreshold ?? 70}%` }}
                    title={`ECAPA Threshold: ${systemSettings?.ecapaThreshold ?? 70}%`}
                  />
                </div>
                <div className="flex justify-between items-center mt-1 text-[10px] text-[#94A3B8] font-mono">
                  <span>Target: {currentScenario?.enrolledTarget || (selectedTargetId || "Auto-detect in Registry")}</span>
                  <span className="font-semibold text-emerald-400">
                    {currentScenario?.idStatus || "Awaiting Stream"}
                  </span>
                </div>
              </div>

              {/* Layer 3: Contextual Threat Risk */}
              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <div>
                    <p className="text-xs font-bold text-[#F7F9FC]">Layer 3: Context Risk (25%)</p>
                    <p className="text-[10px] text-[#64748B] font-mono">DistilBERT Intent & Social Engineering Risk (Sens: {systemSettings?.nlpSensitivity ?? 65}%)</p>
                  </div>
                  <span className="text-sm font-bold font-mono text-[#F7F9FC]">
                    {currentScenario ? `${currentScenario.contextRisk}%` : "--"}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-[#080D17] rounded-full overflow-hidden border border-[#223047]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      !currentScenario
                        ? "w-0"
                        : currentScenario.contextRisk > 60
                        ? "bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                        : currentScenario.contextRisk > 30
                        ? "bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        : "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    )}
                    style={{ width: currentScenario ? `${currentScenario.contextRisk}%` : "0%" }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1 text-[10px] text-[#94A3B8] font-mono">
                  <span>Calculated via NLP Classification</span>
                  <span className="font-semibold text-[#F7F9FC]">
                    {currentScenario
                      ? currentScenario.contextRisk > 50
                        ? "High Threat"
                        : "Benign"
                      : "Awaiting Stream"}
                  </span>
                </div>
              </div>
            </div>

            {/* Semantic Risk Flags */}
            <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-2xl shadow-xl p-5 space-y-3 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-[#F7F9FC] uppercase tracking-wider">
                Extracted Threat Keywords & Semantic Flags
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Rule-based security flags detected during NLP conversation analysis
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {!currentScenario || (!currentScenario.threatKeywords.length && !currentScenario.semanticFlags.length) ? (
                  <p className="text-xs text-[#64748B] py-4 font-mono">No threat flags detected in active stream.</p>
                ) : (
                  <>
                    {currentScenario.threatKeywords.map((kw, i) => (
                      <Badge key={i} className="bg-red-500/20 text-red-300 border-red-500/40 text-xs px-2.5 py-1 gap-1 font-mono">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        {kw}
                      </Badge>
                    ))}
                    {currentScenario.semanticFlags.map((flag, i) => (
                      <Badge key={i} className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-2.5 py-1 gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-amber-400" />
                        {flag}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
