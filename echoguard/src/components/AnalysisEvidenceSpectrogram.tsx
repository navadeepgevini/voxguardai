"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SpectrogramEvidence } from "@/lib/api";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  FileAudio,
  Hash,
  Info,
  Layers,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sliders,
} from "lucide-react";

interface AnalysisEvidenceSpectrogramProps {
  evidence?: SpectrogramEvidence | null;
  isAnalyzing?: boolean;
  unavailableNotice?: string;
  className?: string;
  showCardHeader?: boolean;
}

export function AnalysisEvidenceSpectrogram({
  evidence,
  isAnalyzing = false,
  unavailableNotice,
  className,
  showCardHeader = true,
}: AnalysisEvidenceSpectrogramProps) {
  const isAvailable = Boolean(evidence && evidence.available && evidence.data_url);

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4",
        className
      )}
    >
      {/* Official Header & Label */}
      {showCardHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                Analysis Spectrogram
              </h3>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-semibold"
              >
                Pipeline Evidence
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Generated from the audio used by the detection pipeline.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                isAnalyzing
                  ? "bg-orange-500 animate-pulse"
                  : isAvailable
                  ? "bg-emerald-500"
                  : "bg-gray-400"
              )}
            />
            <span className="text-xs font-mono text-gray-600">
              {isAnalyzing
                ? "INSPECTING..."
                : isAvailable
                ? "EVIDENCE LOCKED"
                : "AWAITING ANALYSIS"}
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isAnalyzing ? (
        <div className="h-44 bg-[#0B1120] rounded-lg border border-gray-800 flex flex-col items-center justify-center text-center p-6 text-slate-300">
          <RefreshCw className="w-8 h-8 text-[#F6821F] animate-spin mb-3" />
          <p className="text-sm font-semibold text-white">
            Synthesizing Forensic STFT Spectrogram...
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Computing 512-point Hann Short-Time Fourier Transform from 16kHz normalized audio used for AASIST & ECAPA inference.
          </p>
        </div>
      ) : isAvailable && evidence?.data_url ? (
        <div className="space-y-3">
          {/* Accessible Summary Notice */}
          <div
            role="status"
            aria-live="polite"
            className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg font-mono flex flex-wrap items-center justify-between gap-2"
          >
            <span className="font-sans font-medium text-slate-900">
              {evidence.summary || (
                <>
                  Spectrogram for <span className="font-semibold">{evidence.filename || "audio"}</span>, duration{" "}
                  <span className="font-semibold">{evidence.duration_seconds || 0}s</span>, sample rate{" "}
                  <span className="font-semibold">{evidence.sample_rate?.toLocaleString() || 16000} Hz</span>.
                </>
              )}
            </span>
            <Badge variant="outline" className="text-[10px] bg-slate-100 font-mono text-slate-600 border-slate-300">
              {evidence.preprocessing_version || "AMVTF-v2.1-Preprocessed-16kHz"}
            </Badge>
          </div>

          {/* High-Resolution Backend Generated Spectrogram */}
          <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#0B1120] shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={evidence.data_url}
              alt={
                evidence.summary ||
                `Forensic STFT Spectrogram for ${evidence.filename || "analysis recording"}`
              }
              className="w-full h-auto block select-none"
            />
          </div>

          {/* Forensic Metadata Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
              <span className="text-gray-400 text-[10px] uppercase font-semibold block">
                Analysis ID
              </span>
              <span className="font-bold font-mono text-gray-800 text-xs truncate block" title={evidence.analysis_id}>
                {evidence.analysis_id || "VX-SESSION"}
              </span>
            </div>

            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
              <span className="text-gray-400 text-[10px] uppercase font-semibold block">
                Sample Rate / Preprocessing
              </span>
              <span className="font-bold font-mono text-gray-800 text-xs">
                {evidence.sample_rate?.toLocaleString() || "16,000"} Hz (Mono)
              </span>
            </div>

            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
              <span className="text-gray-400 text-[10px] uppercase font-semibold block">
                STFT Window & Hop
              </span>
              <span className="font-bold font-mono text-gray-800 text-xs">
                {evidence.n_fft || 512} FFT / {evidence.hop_length || 256} Hop
              </span>
            </div>

            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
              <span className="text-gray-400 text-[10px] uppercase font-semibold block">
                Frequency Scale & Band
              </span>
              <span className="font-bold font-mono text-gray-800 text-xs">
                {evidence.frequency_scale || "Linear (0 - 8000 Hz)"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center flex flex-col items-center justify-center space-y-2">
          <Info className="w-6 h-6 text-slate-400" />
          <p className="text-xs font-semibold text-slate-700">
            {unavailableNotice || "Visual evidence unavailable for this historical record (audio retention policy expired or pre-dates evidentiary logging)."}
          </p>
          <p className="text-[11px] text-slate-500 max-w-md">
            Click &quot;Evaluate&quot; on an uploaded or live recording to trigger deepfake model inference and compute an official evidentiary STFT spectrogram.
          </p>
        </div>
      )}
    </div>
  );
}
