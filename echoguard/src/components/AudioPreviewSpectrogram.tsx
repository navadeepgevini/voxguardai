"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  Sliders,
  Volume2,
} from "lucide-react";

interface AudioPreviewSpectrogramProps {
  audioFile: File | null;
  className?: string;
}

// Cooley-Tukey Radix-2 in-place FFT implementation
function fftRadix2(real: Float32Array, imag: Float32Array, n: number) {
  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tr = real[i];
      real[i] = real[j];
      real[j] = tr;
      const ti = imag[i];
      imag[i] = imag[j];
      imag[j] = ti;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Butterfly computations
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepReal = Math.cos(angle);
    const wStepImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wReal = 1.0;
      let wImag = 0.0;

      for (let k = 0; k < halfLen; k++) {
        const pos1 = i + k;
        const pos2 = pos1 + halfLen;

        const uReal = real[pos1];
        const uImag = imag[pos1];

        const vReal = real[pos2] * wReal - imag[pos2] * wImag;
        const vImag = real[pos2] * wImag + imag[pos2] * wReal;

        real[pos1] = uReal + vReal;
        imag[pos1] = uImag + vImag;
        real[pos2] = uReal - vReal;
        imag[pos2] = uImag - vImag;

        const nextWReal = wReal * wStepReal - wImag * wStepImag;
        wImag = wReal * wStepImag + wImag * wStepReal;
        wReal = nextWReal;
      }
    }
  }
}

// Magma Colormap mapping (normalized 0.0 - 1.0 -> [r, g, b])
function magmaColor(val: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, val));
  if (v <= 0.0) return [11, 17, 32]; // #0B1120 background dark navy
  if (v < 0.25) {
    const t = v / 0.25;
    return [
      Math.round(11 + t * (46 - 11)),
      Math.round(17 + t * (16 - 17)),
      Math.round(32 + t * (101 - 32)),
    ]; // Deep indigo/violet
  } else if (v < 0.5) {
    const t = (v - 0.25) / 0.25;
    return [
      Math.round(46 + t * (140 - 46)),
      Math.round(16 + t * (25 - 16)),
      Math.round(101 + t * (75 - 101)),
    ]; // Dark purple-magenta
  } else if (v < 0.75) {
    const t = (v - 0.5) / 0.25;
    return [
      Math.round(140 + t * (246 - 140)),
      Math.round(25 + t * (130 - 25)),
      Math.round(75 + t * (31 - 75)),
    ]; // Crimson into VoxGuard orange (#F6821F)
  } else {
    const t = (v - 0.75) / 0.25;
    return [
      Math.round(246 + t * (254 - 246)),
      Math.round(130 + t * (240 - 130)),
      Math.round(31 + t * (138 - 31)),
    ]; // VoxGuard orange into warm solar yellow
  }
}

export function AudioPreviewSpectrogram({ audioFile, className }: AudioPreviewSpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"idle" | "computing" | "ready" | "unavailable">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    filename: string;
    sampleRate: number;
    duration: number;
    channels: number;
    numFrames: number;
    fftSize: number;
    nyquistHz: number;
  } | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  const cleanupAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Ignore close errors
      }
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioContext();
    };
  }, [cleanupAudioContext]);

  useEffect(() => {
    if (!audioFile) {
      setStatus("idle");
      setErrorMessage(null);
      setMetadata(null);
      cleanupAudioContext();
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      return;
    }

    let isCancelled = false;
    setStatus("computing");
    setErrorMessage(null);

    const processAudio = async () => {
      try {
        cleanupAudioContext();
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("Web Audio API is not supported in this browser environment.");
        }

        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        // Read file buffer
        const arrayBuffer = await audioFile.arrayBuffer();
        if (isCancelled) return;

        // Decode audio data safely
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (isCancelled) return;

        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;
        const channels = audioBuffer.numberOfChannels;
        const channelData = audioBuffer.getChannelData(0); // Take primary channel

        if (!channelData || channelData.length === 0) {
          throw new Error("Decoded audio stream contains 0 audio frames.");
        }

        const fftSize = 512;
        const halfFft = fftSize / 2; // 256 frequency bins (0 Hz to Nyquist)
        const nyquistHz = sampleRate / 2;

        // Precompute Hann window
        const hannWindow = new Float32Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
          hannWindow[i] = 0.5 * (1.0 - Math.cos((2 * Math.PI * i) / fftSize));
        }

        // Determine number of time slices across audio length
        // e.g. 250 to 500 slices for high visual resolution
        const totalSamples = channelData.length;
        const numSlices = Math.min(450, Math.max(120, Math.floor(duration * 50)));
        const step = Math.max(1, Math.floor((totalSamples - fftSize) / Math.max(1, numSlices - 1)));

        // Matrix of magnitude dB values: [sliceIndex][frequencyBin]
        const stftMagnitudes: Float32Array[] = [];
        let globalMaxMag = 1e-9;

        const real = new Float32Array(fftSize);
        const imag = new Float32Array(fftSize);

        for (let s = 0; s < numSlices; s++) {
          const startIndex = Math.min(s * step, Math.max(0, totalSamples - fftSize));

          // Apply window
          for (let i = 0; i < fftSize; i++) {
            const idx = startIndex + i;
            const sample = idx < totalSamples ? channelData[idx] : 0.0;
            real[i] = sample * hannWindow[i];
            imag[i] = 0.0;
          }

          // Compute radix-2 FFT
          fftRadix2(real, imag, fftSize);

          const magSlice = new Float32Array(halfFft);
          for (let k = 0; k < halfFft; k++) {
            const mag = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
            magSlice[k] = mag;
            if (mag > globalMaxMag) {
              globalMaxMag = mag;
            }
          }
          stftMagnitudes.push(magSlice);
        }

        if (isCancelled) return;

        // Render to canvas
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // High-DPI canvas setup
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = canvas.clientWidth || 750;
        const displayHeight = 220;

        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        ctx.scale(dpr, dpr);

        // Clear with dark navy SOC background
        ctx.fillStyle = "#0B1120";
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Margins for axes
        const marginLeft = 56;
        const marginRight = 54;
        const marginTop = 12;
        const marginBottom = 28;
        const plotWidth = displayWidth - marginLeft - marginRight;
        const plotHeight = displayHeight - marginTop - marginBottom;

        if (plotWidth > 10 && plotHeight > 10) {
          // Offscreen heatmap creation
          const offscreenCanvas = document.createElement("canvas");
          offscreenCanvas.width = numSlices;
          offscreenCanvas.height = halfFft;
          const offCtx = offscreenCanvas.getContext("2d");

          if (offCtx) {
            const imgData = offCtx.createImageData(numSlices, halfFft);
            const data = imgData.data;

            // Log dynamic range (-80 dB to 0 dB)
            const minDb = -80.0;

            for (let bin = 0; bin < halfFft; bin++) {
              // bin 0 is 0 Hz (bottom), bin halfFft-1 is Nyquist (top)
              // Canvas y coordinates are top-down, so row 0 = Nyquist, row (halfFft-1) = 0 Hz
              const row = halfFft - 1 - bin;

              for (let s = 0; s < numSlices; s++) {
                const mag = stftMagnitudes[s][bin];
                const ratio = Math.max(1e-4, mag / globalMaxMag);
                const db = 20.0 * Math.log10(ratio);
                // Normalize between minDb (-80) and 0 dB
                const norm = Math.max(0, Math.min(1, (db - minDb) / (0.0 - minDb)));

                const [r, g, b] = magmaColor(norm);
                const pIdx = (row * numSlices + s) * 4;
                data[pIdx] = r;
                data[pIdx + 1] = g;
                data[pIdx + 2] = b;
                data[pIdx + 3] = 255;
              }
            }

            offCtx.putImageData(imgData, 0, 0);

            // Draw smoothed heatmap to main canvas
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(offscreenCanvas, marginLeft, marginTop, plotWidth, plotHeight);
          }

          // Draw grid and axis borders
          ctx.strokeStyle = "#1E293B";
          ctx.lineWidth = 1;
          ctx.strokeRect(marginLeft, marginTop, plotWidth, plotHeight);

          // Frequency ticks (Y-axis)
          ctx.fillStyle = "#94A3B8";
          ctx.font = "9px 'JetBrains Mono', ui-monospace, monospace";
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";

          const freqTicks = [
            { ratio: 1.0, label: `${(nyquistHz / 1000).toFixed(1)}k` },
            { ratio: 0.75, label: `${((nyquistHz * 0.75) / 1000).toFixed(1)}k` },
            { ratio: 0.5, label: `${((nyquistHz * 0.5) / 1000).toFixed(1)}k` },
            { ratio: 0.25, label: `${((nyquistHz * 0.25) / 1000).toFixed(1)}k` },
            { ratio: 0.0, label: "0 Hz" },
          ];

          freqTicks.forEach((tick) => {
            const y = marginTop + plotHeight * (1.0 - tick.ratio);
            ctx.fillText(tick.label, marginLeft - 8, y);

            // Horizontal faint grid lines
            ctx.beginPath();
            ctx.strokeStyle = tick.ratio === 0 || tick.ratio === 1 ? "#334155" : "rgba(30, 41, 59, 0.7)";
            ctx.setLineDash(tick.ratio === 0 || tick.ratio === 1 ? [] : [3, 3]);
            ctx.moveTo(marginLeft, y);
            ctx.lineTo(marginLeft + plotWidth, y);
            ctx.stroke();
            ctx.setLineDash([]);
          });

          // Time ticks (X-axis)
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          const numTimeTicks = Math.min(6, Math.max(3, Math.floor(plotWidth / 90)));
          for (let i = 0; i <= numTimeTicks; i++) {
            const tRatio = i / numTimeTicks;
            const x = marginLeft + plotWidth * tRatio;
            const tSeconds = duration * tRatio;

            ctx.fillText(`${tSeconds.toFixed(1)}s`, x, marginTop + plotHeight + 6);

            // Vertical faint grid lines
            ctx.beginPath();
            ctx.strokeStyle = i === 0 || i === numTimeTicks ? "#334155" : "rgba(30, 41, 59, 0.7)";
            ctx.setLineDash(i === 0 || i === numTimeTicks ? [] : [3, 3]);
            ctx.moveTo(x, marginTop);
            ctx.lineTo(x, marginTop + plotHeight);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Colorbar (dB scale) on right
          const cbarX = marginLeft + plotWidth + 14;
          const cbarWidth = 10;
          const cbarHeight = plotHeight;

          const cbarGrad = ctx.createLinearGradient(0, marginTop, 0, marginTop + cbarHeight);
          // Top is 0 dB (white/yellow), bottom is -80 dB (dark navy)
          cbarGrad.addColorStop(0, "rgb(254, 240, 138)");
          cbarGrad.addColorStop(0.25, "rgb(246, 130, 31)");
          cbarGrad.addColorStop(0.5, "rgb(140, 25, 75)");
          cbarGrad.addColorStop(0.75, "rgb(46, 16, 101)");
          cbarGrad.addColorStop(1, "rgb(11, 17, 32)");

          ctx.fillStyle = cbarGrad;
          ctx.fillRect(cbarX, marginTop, cbarWidth, cbarHeight);
          ctx.strokeStyle = "#334155";
          ctx.strokeRect(cbarX, marginTop, cbarWidth, cbarHeight);

          // Colorbar labels
          ctx.textAlign = "left";
          ctx.fillStyle = "#94A3B8";
          ctx.font = "8px monospace";
          ctx.fillText("0 dB", cbarX + cbarWidth + 4, marginTop);
          ctx.fillText("-40", cbarX + cbarWidth + 4, marginTop + cbarHeight / 2);
          ctx.fillText("-80", cbarX + cbarWidth + 4, marginTop + cbarHeight);
        }

        setMetadata({
          filename: audioFile.name,
          sampleRate,
          duration: roundNum(duration, 2),
          channels,
          numFrames: numSlices,
          fftSize,
          nyquistHz,
        });

        setStatus("ready");
      } catch (err) {
        console.warn("[Preview Spectrogram] Decode notice:", err);
        if (!isCancelled) {
          setStatus("unavailable");
          setErrorMessage(
            err instanceof Error
              ? `Preview spectrogram unavailable: ${err.message}`
              : "Preview spectrogram unavailable: Browser audio decoder could not parse audio header."
          );
        }
      }
    };

    processAudio();

    return () => {
      isCancelled = true;
    };
  }, [audioFile, cleanupAudioContext]);

  function roundNum(n: number, d = 2) {
    return Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
  }

  return (
    <div
      className={cn(
        "p-4 bg-white shadow-sm border border-gray-200 rounded-xl flex flex-col gap-3",
        className
      )}
    >
      {/* Header with Title and Mode Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#F6821F]" />
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
              Audio Preview Spectrogram
            </h3>
            <p className="text-[11px] text-gray-500 font-medium">
              Preview only — analysis has not started.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-medium border flex items-center gap-1.5",
              status === "ready"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : status === "computing"
                ? "bg-orange-50 text-orange-800 border-orange-300"
                : status === "unavailable"
                ? "bg-amber-50 text-amber-800 border-amber-300"
                : "bg-gray-100 text-gray-600 border-gray-200"
            )}
          >
            {status === "computing" && <RefreshCw className="w-3 h-3 text-[#F6821F] animate-spin" />}
            {status === "ready" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            {status === "unavailable" && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
            {status === "idle" && <Radio className="w-3 h-3 text-gray-400" />}
            <span>
              {status === "ready"
                ? "STFT Spectral Map Generated"
                : status === "computing"
                ? "Computing STFT Slices..."
                : status === "unavailable"
                ? "Spectrogram Unavailable"
                : "Awaiting Audio File"}
            </span>
          </Badge>
        </div>
      </div>

      {/* Accessible Screen Reader and Visual Text Summary */}
      {metadata && status === "ready" && (
        <div
          role="status"
          aria-live="polite"
          className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-mono flex flex-wrap items-center justify-between gap-2"
        >
          <span className="font-sans font-medium text-slate-900">
            Spectrogram for <span className="font-semibold">{metadata.filename}</span>, duration{" "}
            <span className="font-semibold">{metadata.duration}s</span>, sample rate{" "}
            <span className="font-semibold">{metadata.sampleRate.toLocaleString()} Hz</span>.
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Nyquist: {(metadata.nyquistHz / 1000).toFixed(1)} kHz | 512-pt Hann FFT
          </span>
        </div>
      )}

      {/* Canvas Area */}
      <div className="relative w-full rounded-lg overflow-hidden border border-gray-900 bg-[#0B1120]">
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full h-[220px] block transition-opacity duration-200",
            status === "ready" ? "opacity-100" : "opacity-30"
          )}
          aria-label={
            metadata
              ? `Spectrogram visualization for ${metadata.filename}, sample rate ${metadata.sampleRate} Hz, duration ${metadata.duration} seconds.`
              : "Audio spectrogram visualization canvas"
          }
        />

        {/* Overlay for Idle or Computing state */}
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-slate-400 bg-[#0B1120]/90">
            <Activity className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-300">
              No audio loaded for preview spectrogram.
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select an audio file above to compute client-side time-frequency FFT energy.
            </p>
          </div>
        )}

        {status === "computing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-slate-300 bg-[#0B1120]/80 backdrop-blur-[1px]">
            <RefreshCw className="w-7 h-7 text-[#F6821F] animate-spin mb-2" />
            <p className="text-xs font-semibold text-slate-100">
              Computing Short-Time Fourier Transform (STFT)...
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Performing browser-side 512-point Hann FFT frequency slice extraction.
            </p>
          </div>
        )}

        {status === "unavailable" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-amber-200 bg-[#0B1120]/90">
            <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-xs font-semibold text-amber-300">
              Preview spectrogram unavailable
            </p>
            <p className="text-[11px] text-slate-400 max-w-md mt-1">
              {errorMessage || "Audio format could not be decoded for client-side spectrogram rendering."}
            </p>
          </div>
        )}
      </div>

      {/* Informative Helper Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-500 gap-1 pt-1 border-t border-gray-100">
        <p>
          Preview only — this client-side STFT is calculated locally in your browser for audio inspection and has not triggered server-side deepfake analysis.
        </p>
        <span className="shrink-0 text-gray-400 font-mono">
          Color Scale: Magma (-80 dB to 0 dB)
        </span>
      </div>
    </div>
  );
}
