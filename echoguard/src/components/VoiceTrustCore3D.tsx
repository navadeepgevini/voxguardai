"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { Shield, Sparkles } from "lucide-react";

interface VoiceTrustCore3DProps {
  riskState?: "IDLE" | "SAFE" | "WARNING" | "CRITICAL";
  predictionState?: "LIKELY_GENUINE" | "LIKELY_SYNTHETIC" | "INCONCLUSIVE" | "ANALYSIS_FAILED" | "MODEL_UNAVAILABLE";
  isMicActive?: boolean;
  isAnalyzing?: boolean;
  isSimulating?: boolean;
  audioEnergy?: number; // 0.0 to 1.0 normalized RMS volume
  authenticity?: number;
  className?: string;
}

export function VoiceTrustCore3D({
  riskState = "IDLE",
  predictionState,
  isMicActive = false,
  isAnalyzing = false,
  isSimulating = false,
  audioEnergy = 0,
  authenticity,
  className,
}: VoiceTrustCore3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // Color mapping based on operational AI threat state
  const getThemeColors = () => {
    if (isAnalyzing || isSimulating) {
      return {
        primary: 0x569cff, // Azure blue scanning
        secondary: 0x8ec5fc,
        ambient: 0x0044aa,
        label: "ANALYZING ACOUSTIC CADENCE",
        glow: "rgba(86, 156, 255, 0.35)",
      };
    }
    if (riskState === "CRITICAL" || predictionState === "LIKELY_SYNTHETIC") {
      return {
        primary: 0xff5365, // Coral Alert
        secondary: 0xff8595,
        ambient: 0x660011,
        label: "SYNTHETIC ANOMALY DETECTED",
        glow: "rgba(255, 83, 101, 0.45)",
      };
    }
    if (riskState === "WARNING" || predictionState === "INCONCLUSIVE") {
      return {
        primary: 0xf4b942, // Amber caution
        secondary: 0xffd277,
        ambient: 0x553300,
        label: "SUSPICIOUS DIVERGENCE",
        glow: "rgba(244, 185, 66, 0.35)",
      };
    }
    if (riskState === "SAFE" || predictionState === "LIKELY_GENUINE") {
      return {
        primary: 0x23c483, // Emerald Bona Fide Human
        secondary: 0x76f5be,
        ambient: 0x004422,
        label: "BONA FIDE HUMAN HARMONICS",
        glow: "rgba(35, 196, 131, 0.35)",
      };
    }
    if (isMicActive) {
      return {
        primary: 0xf6821f, // VoxGuard Ember Orange
        secondary: 0xffa454,
        ambient: 0x4a2200,
        label: "MONITORING LIVE SPECTRAL CADENCE",
        glow: "rgba(246, 130, 31, 0.35)",
      };
    }
    return {
      primary: 0x38bdf8, // Idle Ambient Cyan/Navy
      secondary: 0x93c5fd,
      ambient: 0x0c213b,
      label: "VOICE TRUST CORE STANDBY",
      glow: "rgba(56, 189, 248, 0.20)",
    };
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    const testCanvas = document.createElement("canvas");
    const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
    if (!gl) {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 260;

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. Geometry Construction
    // A) Central Holographic Core (Icosahedron Wireframe)
    const coreGeo = new THREE.IcosahedronGeometry(1.0, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xf6821f,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // B) Concentric Orbital Resonance Rings
    const rings: THREE.LineLoop[] = [];
    const ringRadii = [1.35, 1.6, 1.85];
    ringRadii.forEach((radius, i) => {
      const ringGeo = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      const segments = 64;
      for (let j = 0; j <= segments; j++) {
        const theta = (j / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
      }
      ringGeo.setFromPoints(points);
      const ringMat = new THREE.LineBasicMaterial({
        color: 0xf6821f,
        transparent: true,
        opacity: 0.25 - i * 0.05,
      });
      const ring = new THREE.LineLoop(ringGeo, ringMat);
      ring.rotation.x = (Math.PI / 4) * (i + 1);
      ring.rotation.y = (Math.PI / 6) * i;
      scene.add(ring);
      rings.push(ring);
    });

    // C) Audio Particle Cloud (Lattice nodes)
    const particleCount = 260;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      const r = 1.15;
      const x = r * Math.cos(theta) * Math.sin(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xf6821f,
      size: 0.045,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particleCloud = new THREE.Points(particleGeo, particleMat);
    scene.add(particleCloud);

    // 3. Animation Loop
    let animationFrameId: number;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Energy factor (combining microphone RMS and analyzing pulse)
      const energy = Math.max(audioEnergy, isAnalyzing ? 0.45 : 0.08);
      const colors = getThemeColors();

      // Smooth color transitions
      coreMat.color.lerp(new THREE.Color(colors.primary), 0.08);
      particleMat.color.lerp(new THREE.Color(colors.secondary), 0.08);
      rings.forEach((r) => {
        (r.material as THREE.LineBasicMaterial).color.lerp(new THREE.Color(colors.primary), 0.08);
      });

      // Rotational dynamics
      const rotSpeed = isAnalyzing ? 1.6 : 0.4 + energy * 0.8;
      coreMesh.rotation.y += 0.008 * rotSpeed;
      coreMesh.rotation.x += 0.005 * rotSpeed;

      rings[0].rotation.z += 0.006 * rotSpeed;
      rings[1].rotation.x += 0.009 * rotSpeed;
      rings[2].rotation.y += 0.007 * rotSpeed;

      // Particle audio-frequency displacement
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const bx = basePositions[i * 3];
        const by = basePositions[i * 3 + 1];
        const bz = basePositions[i * 3 + 2];

        // Harmonic wave formula simulating vocal formant perturbation
        const wave = Math.sin(elapsedTime * 4.0 + bx * 3.0 + by * 2.0) * (0.05 + energy * 0.22);
        arr[i * 3] = bx * (1.0 + wave);
        arr[i * 3 + 1] = by * (1.0 + wave);
        arr[i * 3 + 2] = bz * (1.0 + wave);
      }
      posAttr.needsUpdate = true;

      // Pulse scaling
      const baseScale = 1.0 + Math.sin(elapsedTime * 2.5) * 0.03 + energy * 0.15;
      coreMesh.scale.set(baseScale, baseScale, baseScale);

      renderer.render(scene, camera);
    };

    animate();

    // 4. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 320;
      const newH = container.clientHeight || 260;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [riskState, predictionState, isMicActive, isAnalyzing, audioEnergy]);

  const activeTheme = getThemeColors();

  return (
    <div
      className={cn(
        "relative rounded-xl border border-[#223047] bg-gradient-to-b from-[#0D1422] to-[#080D17] p-4 flex flex-col items-center justify-between overflow-hidden shadow-2xl backdrop-blur-md",
        className
      )}
    >
      {/* Tactical Glow Aura */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${activeTheme.glow} 0%, rgba(8, 13, 23, 0) 70%)`,
        }}
      />

      {/* Top Telemetry Header */}
      <div className="w-full flex items-center justify-between z-10 text-[10px] font-mono tracking-wider text-[#74839B]">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#F6821F]" />
          <span className="text-gray-300 font-semibold uppercase">Voice Trust Core</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor:
                riskState === "CRITICAL"
                  ? "#FF5365"
                  : riskState === "WARNING"
                  ? "#F4B942"
                  : riskState === "SAFE"
                  ? "#23C483"
                  : "#F6821F",
            }}
          />
          <span className="font-semibold text-gray-200">{riskState}</span>
        </div>
      </div>

      {/* 3D WebGL Canvas or SVG Fallback */}
      <div className="relative w-full h-44 sm:h-52 my-1 flex items-center justify-center">
        {webglSupported ? (
          <div ref={mountRef} className="w-full h-full flex items-center justify-center cursor-crosshair" />
        ) : (
          /* High-Fidelity SVG Fallback */
          <div className="relative w-36 h-36 flex items-center justify-center">
            <div className="visualizer-ring visualizer-ring-1 text-[#F6821F]" />
            <div className="visualizer-ring visualizer-ring-2 text-[#569CFF]" />
            <div className="visualizer-ring visualizer-ring-3 text-emerald-400" />
            <Shield className="w-10 h-10 text-[#F6821F] animate-pulse" />
          </div>
        )}
      </div>

      {/* Bottom Status Readout Pill */}
      <div className="w-full z-10 flex items-center justify-between pt-2 border-t border-[#1F2C42]/80 text-[11px] font-mono">
        <span className="text-[#A9B7CC] tracking-tight truncate max-w-[210px]">{activeTheme.label}</span>
        <span className="text-gray-400 font-semibold font-mono">
          {authenticity !== undefined ? `${authenticity.toFixed(1)}% Authentic` : "60 FPS WebGL"}
        </span>
      </div>
    </div>
  );
}
