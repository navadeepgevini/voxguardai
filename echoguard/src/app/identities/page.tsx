"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  ChevronRight,
  Plus,
  UserCheck,
  UserX,
  Mic,
  Fingerprint,
  Trash2,
  TrendingUp,
  Shield,
  X,
  Sparkles,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Upload,
  Square,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getIdentities,
  enrollVoiceprint,
  enrollVoiceWithAudio,
  deleteIdentity,
  clearAllIdentities,
  VoiceProfile,
} from "@/lib/api";

const statusConfig = {
  ACTIVE: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-950/60", border: "border-emerald-700/60" },
  PENDING: { label: "Pending", color: "text-amber-400", bg: "bg-amber-950/60", border: "border-amber-700/60" },
  REVOKED: { label: "Revoked", color: "text-red-400", bg: "bg-red-950/60", border: "border-red-700/60" },
};

const qualityConfig = {
  HIGH: { label: "High Precision", color: "text-emerald-400", bg: "bg-emerald-950/60" },
  MEDIUM: { label: "Standard", color: "text-amber-400", bg: "bg-amber-950/60" },
  LOW: { label: "Low Precision", color: "text-red-400", bg: "bg-red-950/60" },
};

export default function IdentitiesPage() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "PENDING" | "REVOKED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state for enrolling new identity
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enrollStep, setEnrollStep] = useState<"IDLE" | "EXTRACTING" | "DONE">("IDLE");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchRealIdentities = async () => {
    setLoading(true);
    try {
      const data = await getIdentities(filterStatus, searchQuery);
      setProfiles(data);
    } catch (err) {
      console.error("Failed to load identities from database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealIdentities();
  }, [filterStatus, searchQuery]);

  const stats = {
    total: profiles.length,
    active: profiles.filter((p) => p.status === "ACTIVE").length,
    pending: profiles.filter((p) => p.status === "PENDING").length,
    avgConfidence: profiles.length
      ? Math.round(profiles.reduce((sum, p) => sum + p.confidence, 0) / profiles.length)
      : 0,
  };

  // Start real microphone recording for voice enrollment
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setRecordedBlob(blob);
        setSelectedFile(null);
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      alert("Microphone access unavailable. You can upload an audio file instead.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleStartEnrollment = async () => {
    if (!newName.trim() || !newDept.trim()) {
      alert("Please provide both name and department for voiceprint registration.");
      return;
    }

    setEnrollStep("EXTRACTING");
    try {
      let created: VoiceProfile;
      const audioToUpload = selectedFile || recordedBlob;

      if (audioToUpload) {
        created = await enrollVoiceWithAudio(newName.trim(), newDept.trim(), audioToUpload);
      } else {
        created = await enrollVoiceprint(newName.trim(), newDept.trim());
      }

      setEnrollStep("DONE");
      setProfiles((prev) => [created, ...prev]);
    } catch (err) {
      console.error("Enrollment failed:", err);
      alert("Failed to enroll voiceprint to backend database.");
      setEnrollStep("IDLE");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete voiceprint ${id}? This action removes it from biometric matching.`)) return;
    try {
      await deleteIdentity(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete identity:", err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all enrolled voice profiles?")) return;
    try {
      await clearAllIdentities();
      setProfiles([]);
    } catch (err) {
      console.error("Failed to clear identities:", err);
    }
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setNewName("");
    setNewDept("");
    setSelectedFile(null);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setIsRecording(false);
    setEnrollStep("IDLE");
  };

  return (
    <>
      {/* Page Header */}
      <header className="bg-[#0D1422]/90 border-b border-[#223047] py-6 px-6 sm:px-10 backdrop-blur-md sticky top-0 z-10 shadow-lg">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#F6821F]/10 text-[#F6821F] border border-[#F6821F]/30">
                  <Fingerprint className="w-3 h-3 text-[#F6821F]" /> ECAPA-TDNN Biometric Core
                </span>
                <span className="text-[#64748B] text-xs font-mono">•</span>
                <span className="text-[#94A3B8] text-xs font-mono">192-D Vector Vault</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7F9FC] tracking-tight">
                Speaker Voiceprint Registry
              </h1>
              <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
                Acoustically enrolled identities stored in SQLite for real-time cosine similarity verification
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={fetchRealIdentities}
                variant="outline"
                size="sm"
                className="bg-[#121C2D] border-[#223047] text-[#94A3B8] hover:text-[#F7F9FC] hover:border-[#384D6B] h-9 px-3 gap-1.5"
                title="Refresh database"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading ? "animate-spin text-[#F6821F]" : "")} />
                <span className="hidden sm:inline text-xs">Sync</span>
              </Button>

              {profiles.length > 0 && (
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs bg-red-950/30 text-red-400 border-red-800/50 hover:bg-red-900/40 hover:text-red-300 h-9"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Registry
                </Button>
              )}
              
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#F6821F] hover:bg-[#E85D04] text-white gap-2 text-xs sm:text-sm font-semibold shadow-lg shadow-[#F6821F]/20 h-9 px-4 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Enroll Voiceprint
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 sm:p-10 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#121C2D] border border-[#223047] rounded-lg">
                <Fingerprint className="w-5 h-5 text-[#94A3B8]" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#F7F9FC] font-mono tracking-tight">{stats.total}</p>
                <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-semibold">Database Profiles</p>
              </div>
            </div>
          </div>

          <div className="cyber-panel bg-[#0D1422]/90 border border-emerald-900/40 rounded-xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-950/50 border border-emerald-800/40 rounded-lg">
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">{stats.active}</p>
                <p className="text-[11px] text-emerald-500/80 uppercase tracking-wider font-semibold">High-Trust Profiles</p>
              </div>
            </div>
          </div>

          <div className="cyber-panel bg-[#0D1422]/90 border border-amber-900/40 rounded-xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-950/50 border border-amber-800/40 rounded-lg">
                <UserX className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-amber-400 font-mono tracking-tight">{stats.pending}</p>
                <p className="text-[11px] text-amber-500/80 uppercase tracking-wider font-semibold">Pending Samples</p>
              </div>
            </div>
          </div>

          <div className="cyber-panel bg-[#0D1422]/90 border border-blue-900/40 rounded-xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-950/50 border border-blue-800/40 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-blue-400 font-mono tracking-tight">{stats.avgConfidence}%</p>
                <p className="text-[11px] text-blue-400/80 uppercase tracking-wider font-semibold">Mean Verification</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-3 sm:p-4 flex flex-wrap items-center gap-3 backdrop-blur-md">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by identity name, department, or VP ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-[#121C2D] border border-[#223047] focus:border-[#F6821F] rounded-lg text-xs sm:text-sm text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#F6821F] transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            {(["ALL", "ACTIVE", "PENDING", "REVOKED"] as const).map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "text-xs font-medium rounded-lg transition-all cursor-pointer h-8 px-3 border",
                  filterStatus === s
                    ? s === "ALL"
                      ? "bg-[#F6821F] text-white border-[#F6821F] shadow-sm shadow-[#F6821F]/20"
                      : s === "ACTIVE"
                      ? "bg-emerald-950/60 text-emerald-300 border-emerald-600 shadow-sm shadow-emerald-500/20"
                      : s === "PENDING"
                      ? "bg-amber-950/60 text-amber-300 border-amber-600 shadow-sm shadow-amber-500/20"
                      : "bg-red-950/60 text-red-300 border-red-600 shadow-sm shadow-red-500/20"
                    : "bg-[#121C2D] text-[#94A3B8] border-[#223047] hover:text-[#F7F9FC] hover:border-[#384D6B]"
                )}
              >
                {s === "ALL" ? "All Profiles" : statusConfig[s].label}
              </Button>
            ))}
          </div>
        </div>

        {/* Profile Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full py-20 text-center text-[#94A3B8]">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#F6821F]" />
              <p className="text-sm font-medium text-[#F7F9FC]">Querying voice embeddings from SQLite...</p>
              <p className="text-xs text-[#64748B] mt-1 font-mono">Loading ECAPA-TDNN 192-dim biometric profiles</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="col-span-full py-16 text-center cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-2xl p-8 shadow-2xl backdrop-blur-md">
              <div className="w-14 h-14 rounded-2xl bg-[#121C2D] border border-[#223047] flex items-center justify-center mx-auto mb-3">
                <Fingerprint className="w-7 h-7 text-[#F6821F]" />
              </div>
              <h3 className="text-base font-bold text-[#F7F9FC]">No Enrolled Voiceprints</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto mt-1 mb-5">
                No authorized voice profiles are registered in SQLite yet. Enroll authorized personnel with audio samples so the ECAPA-TDNN engine can perform biometric speaker verification.
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#F6821F] hover:bg-[#E85D04] text-white text-xs font-semibold gap-2 shadow-lg shadow-[#F6821F]/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Enroll First Voiceprint
              </Button>
            </div>
          ) : (
            profiles.map((profile) => {
              const s = statusConfig[profile.status];
              const q = qualityConfig[profile.embeddingQuality];
              return (
                <div
                  key={profile.id}
                  className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl hover:border-[#F6821F]/50 hover:shadow-2xl hover:shadow-[#F6821F]/5 transition-all duration-200 overflow-hidden group flex flex-col justify-between"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3.5">
                      {/* Biometric Avatar with Waveform / Fingerprint Rings */}
                      <div className="relative">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#121C2D] to-[#1E293B] border border-[#F6821F]/40 flex items-center justify-center text-[#F7F9FC] text-sm font-bold shrink-0 shadow-md font-mono group-hover:border-[#F6821F] transition-colors">
                          {profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0D1422] flex items-center justify-center" title="Acoustic Vector Online" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-[#64748B] bg-[#121C2D] px-2 py-0.5 rounded border border-[#223047]">
                          {profile.id}
                        </span>
                        <button
                          onClick={() => handleDelete(profile.id)}
                          className="text-[#64748B] hover:text-red-400 hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all p-1 rounded cursor-pointer"
                          title="Delete voiceprint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-[#F7F9FC] text-sm tracking-tight">{profile.name}</h3>
                    <p className="text-xs text-[#94A3B8] mb-3 truncate">{profile.department}</p>

                    <div className="flex items-center gap-2 mb-4">
                      <Badge className={cn("text-[10px] font-medium border shadow-2xs", s.bg, s.color, s.border)}>
                        {s.label}
                      </Badge>
                      <Badge className={cn("text-[10px] font-medium border border-transparent shadow-2xs", q.bg, q.color)}>
                        <Shield className="w-2.5 h-2.5 mr-1" /> {q.label}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#94A3B8] pt-3 border-t border-[#223047]/60 font-mono">
                      <div className="flex justify-between">
                        <span className="text-[#64748B] font-sans">Enrolled:</span>
                        <span className="text-[#E2E8F0]">{profile.enrolledDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B] font-sans">Last Verified:</span>
                        <span className="text-[#E2E8F0]">{profile.lastVerified}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B] font-sans">Reference:</span>
                        <span className="text-[#E2E8F0]">{profile.samples} sessions</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-[#080D17] border-t border-[#223047] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#94A3B8]">Cosine Confidence</span>
                    <span className="text-xs font-mono font-extrabold text-emerald-400">{profile.confidence}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Voice Enrollment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#050811]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="cyber-panel bg-[#0D1422] border border-[#223047] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#223047] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#F6821F]/10 border border-[#F6821F]/30 rounded-xl">
                  <Fingerprint className="w-5 h-5 text-[#F6821F]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F7F9FC]">Enroll Speaker Voiceprint</h3>
                  <p className="text-xs text-[#94A3B8]">Compute 192-dim acoustic vector for database matching</p>
                </div>
              </div>
              <button onClick={resetModal} className="text-[#64748B] hover:text-[#F7F9FC] p-1 rounded-lg hover:bg-[#121C2D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {enrollStep === "IDLE" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith"
                    className="w-full px-3.5 py-2 bg-[#121C2D] border border-[#223047] rounded-lg text-sm text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F] focus:ring-1 focus:ring-[#F6821F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Department / Organization Role</label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    placeholder="e.g. Treasury Operations / Executive Office"
                    className="w-full px-3.5 py-2 bg-[#121C2D] border border-[#223047] rounded-lg text-sm text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F] focus:ring-1 focus:ring-[#F6821F]"
                  />
                </div>

                <div className="pt-2 border-t border-[#223047] space-y-3">
                  <label className="block text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Voice Sample Intake</label>
                  
                  {/* Voice recording or audio upload */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={cn(
                        "text-xs font-medium gap-1.5 h-16 flex flex-col items-center justify-center cursor-pointer transition-all",
                        isRecording
                          ? "bg-red-950/50 text-red-400 border-red-500 animate-pulse"
                          : "bg-[#121C2D] border-[#223047] text-[#F7F9FC] hover:border-[#F6821F]"
                      )}
                    >
                      {isRecording ? <Square className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-[#F6821F]" />}
                      <span>{isRecording ? "Stop Recording" : "Record Mic"}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium gap-1.5 h-16 flex flex-col items-center justify-center bg-[#121C2D] border-[#223047] text-[#F7F9FC] hover:border-[#F6821F] cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-[#F6821F]" />
                      <span className="truncate max-w-[130px]">{selectedFile ? selectedFile.name : "Upload Audio (.wav)"}</span>
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setSelectedFile(e.target.files[0]);
                          setRecordedBlob(null);
                          setPreviewUrl(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                      accept="audio/*"
                      className="hidden"
                    />
                  </div>

                  {(recordedBlob || selectedFile) && (
                    <div className="flex flex-col gap-2 p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl text-xs text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Audio sample captured: {selectedFile ? selectedFile.name : "Microphone intake stream (WAV)"}</span>
                      </div>
                      {previewUrl && (
                        <audio src={previewUrl} controls className="h-8 w-full mt-1.5 rounded" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#223047]">
                  <Button variant="ghost" size="sm" onClick={resetModal} className="text-[#94A3B8] hover:text-[#F7F9FC]">Cancel</Button>
                  <Button
                    onClick={handleStartEnrollment}
                    disabled={!newName.trim() || !newDept.trim()}
                    className="bg-[#F6821F] hover:bg-[#E85D04] text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-lg shadow-[#F6821F]/20 h-9 px-4"
                  >
                    <Cpu className="w-3.5 h-3.5" /> Extract Embedding & Save
                  </Button>
                </div>
              </div>
            )}

            {enrollStep === "EXTRACTING" && (
              <div className="py-10 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#F6821F]" />
                <p className="text-sm font-bold text-[#F7F9FC]">Extracting 192-Dim Acoustic Embedding...</p>
                <p className="text-xs text-[#94A3B8]">Computing FFT spectrogram filters and saving vector to SQLite...</p>
              </div>
            )}

            {enrollStep === "DONE" && (
              <div className="py-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <div>
                  <h4 className="text-base font-bold text-[#F7F9FC]">Voiceprint Successfully Enrolled!</h4>
                  <p className="text-xs text-[#94A3B8] mt-1">Profile saved to SQLite and active for real-time verification.</p>
                </div>
                <Button onClick={resetModal} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold w-full h-9">
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
