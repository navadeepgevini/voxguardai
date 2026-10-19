"use client";

import { useState, useEffect, Fragment } from "react";
import {
  Search,
  Bell,
  ChevronRight,
  Filter,
  Download,
  Eye,
  ShieldCheck,
  ShieldAlert,
  MessageSquareWarning,
  Phone,
  Calendar,
  Clock,
  ArrowUpDown,
  RefreshCw,
  Trash2,
  PhoneCall,
  Activity,
  Info,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCalls, deleteCall, clearAllCalls, CallRecord } from "@/lib/api";

const verdictConfig = {
  SAFE: { label: "Safe", color: "text-emerald-400", bg: "bg-emerald-950/60", border: "border-emerald-700/60", icon: ShieldCheck },
  WARNING: { label: "Suspicious", color: "text-amber-400", bg: "bg-amber-950/60", border: "border-amber-700/60", icon: MessageSquareWarning },
  CRITICAL: { label: "Deepfake", color: "text-red-400", bg: "bg-red-950/60", border: "border-red-700/60", icon: ShieldAlert },
};

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVerdict, setFilterVerdict] = useState<"ALL" | "SAFE" | "WARNING" | "CRITICAL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const fetchRealCalls = async () => {
    setLoading(true);
    try {
      const data = await getCalls(filterVerdict, searchQuery);
      setCalls(data);
    } catch (err) {
      console.error("Failed to load calls from backend:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealCalls();
  }, [filterVerdict, searchQuery]);

  const stats = {
    total: calls.length,
    safe: calls.filter((c) => c.verdict === "SAFE").length,
    warning: calls.filter((c) => c.verdict === "WARNING").length,
    critical: calls.filter((c) => c.verdict === "CRITICAL").length,
  };

  const handleExportCSV = () => {
    if (calls.length === 0) return;
    const headers = ["ID,Caller,Agent,Date,Time,Duration,Authenticity (%),Identity (%),Verdict,Context,Flagged Phrases"];
    const rows = calls.map((c) =>
      `"${c.id}","${c.caller}","${c.agent}","${c.date}","${c.time}","${c.duration}",${c.authenticity},${c.identity},"${c.verdict}","${c.context}","${c.flaggedPhrases.join("; ")}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `voxguard_audit_trail_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteCall = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete call record ${id}?`)) return;
    try {
      await deleteCall(id);
      setCalls((prev) => prev.filter((c) => c.id !== id));
      if (selectedCall?.id === id) setSelectedCall(null);
    } catch (err) {
      console.error("Failed to delete call record:", err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all call records from SQLite?")) return;
    try {
      await clearAllCalls();
      setCalls([]);
      setSelectedCall(null);
    } catch (err) {
      console.error("Failed to clear call history:", err);
    }
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
                  <Activity className="w-3 h-3 animate-pulse" /> Telemetry Ledger
                </span>
                <span className="text-[#64748B] text-xs font-mono">•</span>
                <span className="text-[#94A3B8] text-xs font-mono">SQLite Session Store</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7F9FC] tracking-tight">
                Call Threat Audit Trail
              </h1>
              <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
                Forensically indexed audio sessions analyzed by the AMVTF multi-signal fusion engine
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Search caller, ID, verdict..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-[#121C2D] border border-[#223047] focus:border-[#F6821F] rounded-lg text-xs sm:text-sm text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#F6821F] w-48 sm:w-64 transition-all"
                />
              </div>

              <Button
                onClick={fetchRealCalls}
                variant="outline"
                size="sm"
                className="bg-[#121C2D] border-[#223047] text-[#94A3B8] hover:text-[#F7F9FC] hover:border-[#384D6B] h-9 px-3 gap-1.5"
                title="Refresh from database"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading ? "animate-spin text-[#F6821F]" : "")} />
                <span className="hidden sm:inline text-xs">Sync</span>
              </Button>

              {calls.length > 0 && (
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs bg-red-950/30 text-red-400 border-red-800/50 hover:bg-red-900/40 hover:text-red-300 h-9"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </Button>
              )}

              <Button
                onClick={handleExportCSV}
                disabled={calls.length === 0}
                variant="outline"
                className="gap-2 text-xs sm:text-sm bg-[#121C2D] border-[#223047] text-[#F7F9FC] hover:border-[#F6821F] hover:text-[#F6821F] h-9 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#F6821F]" /> Export CSV ({calls.length})
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
                <Phone className="w-5 h-5 text-[#94A3B8]" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#F7F9FC] font-mono tracking-tight">{stats.total}</p>
                <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-semibold">Indexed Calls</p>
              </div>
            </div>
          </div>

          <div className="cyber-panel bg-[#0D1422]/90 border border-emerald-900/40 rounded-xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-950/50 border border-emerald-800/40 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">{stats.safe}</p>
                <p className="text-[11px] text-emerald-500/80 uppercase tracking-wider font-semibold">Verified Safe</p>
              </div>
            </div>
          </div>

          <div className="cyber-panel bg-[#0D1422]/90 border border-amber-900/40 rounded-xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-950/50 border border-amber-800/40 rounded-lg">
                <MessageSquareWarning className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-amber-400 font-mono tracking-tight">{stats.warning}</p>
                <p className="text-[11px] text-amber-500/80 uppercase tracking-wider font-semibold">Suspicious</p>
              </div>
            </div>
          </div>

          <div className="cyber-panel bg-[#0D1422]/90 border border-red-900/40 rounded-xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-950/50 border border-red-800/40 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-red-400 font-mono tracking-tight">{stats.critical}</p>
                <p className="text-[11px] text-red-500/80 uppercase tracking-wider font-semibold">Deepfakes Flagged</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mr-2 font-mono">
            <Filter className="w-3.5 h-3.5 text-[#F6821F]" /> Filter:
          </div>
          {(["ALL", "SAFE", "WARNING", "CRITICAL"] as const).map((v) => (
            <Button
              key={v}
              variant="outline"
              size="sm"
              onClick={() => setFilterVerdict(v)}
              className={cn(
                "text-xs font-medium rounded-lg transition-all cursor-pointer h-8 px-3 border",
                filterVerdict === v
                  ? v === "ALL"
                    ? "bg-[#F6821F] text-white border-[#F6821F] shadow-sm shadow-[#F6821F]/20"
                    : v === "SAFE"
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-600 shadow-sm shadow-emerald-500/20"
                    : v === "WARNING"
                    ? "bg-amber-950/60 text-amber-300 border-amber-600 shadow-sm shadow-amber-500/20"
                    : "bg-red-950/60 text-red-300 border-red-600 shadow-sm shadow-red-500/20"
                  : "bg-[#121C2D] text-[#94A3B8] border-[#223047] hover:text-[#F7F9FC] hover:border-[#384D6B]"
              )}
            >
              {v === "ALL" ? "All Calls" : verdictConfig[v].label}
            </Button>
          ))}
          <div className="flex-1" />
          <span className="text-xs font-mono text-[#64748B]">{calls.length} database entries</span>
        </div>

        {/* Call Table */}
        <div className="bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#080D17] border-b border-[#223047]">
                  <th className="text-left py-3.5 px-4 font-mono text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                    <span className="flex items-center gap-1">ID <ArrowUpDown className="w-3 h-3 text-[#64748B]" /></span>
                  </th>
                  <th className="text-left py-3.5 px-4 font-mono text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Caller</th>
                  <th className="text-left py-3.5 px-4 font-mono text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Agent</th>
                  <th className="text-left py-3.5 px-4 font-mono text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Timestamp</th>
                  <th className="text-left py-3.5 px-4 font-mono text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Duration</th>
                  <th className="text-left py-3.5 px-4 font-mono text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Authenticity</th>
                  <th className="text-left py-3.5 px-4 font-mono text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Identity</th>
                  <th className="text-left py-3.5 px-4 font-mono text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Verdict</th>
                  <th className="text-right py-3.5 px-4 font-mono text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#223047]/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-[#94A3B8]">
                      <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-[#F6821F]" />
                      <p className="text-sm font-medium text-[#F7F9FC]">Querying call audit records from SQLite...</p>
                      <p className="text-xs text-[#64748B] mt-1 font-mono">Synchronizing state with AMVTF session store</p>
                    </td>
                  </tr>
                ) : calls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="w-12 h-12 rounded-xl bg-[#121C2D] border border-[#223047] flex items-center justify-center mx-auto mb-3">
                        <PhoneCall className="w-6 h-6 text-[#64748B]" />
                      </div>
                      <p className="text-base font-bold text-[#F7F9FC]">No Call Records Found</p>
                      <p className="text-xs text-[#94A3B8] mt-1 mb-5 max-w-sm mx-auto">
                        No audio sessions have been analyzed or logged in the database yet.
                      </p>
                      <Link href="/">
                        <Button size="sm" className="bg-[#F6821F] hover:bg-[#E85D04] text-white text-xs font-semibold gap-2 shadow-lg shadow-[#F6821F]/20 cursor-pointer">
                          <Activity className="w-3.5 h-3.5" /> Launch Live Analysis
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ) : (
                  calls.map((call) => {
                    const isSelected = selectedCall?.id === call.id;
                    const v = verdictConfig[call.verdict] || verdictConfig.SAFE;
                    const Icon = v.icon;

                    let meta: any = null;
                    if (call.spectrogramMetadata) {
                      try {
                        meta = typeof call.spectrogramMetadata === "string"
                          ? JSON.parse(call.spectrogramMetadata)
                          : call.spectrogramMetadata;
                      } catch {
                        meta = null;
                      }
                    }

                    return (
                      <Fragment key={call.id}>
                        <tr
                          className={cn(
                            "hover:bg-[#121C2D]/70 transition-colors cursor-pointer",
                            isSelected ? "bg-[#F6821F]/10 border-l-2 border-l-[#F6821F]" : ""
                          )}
                          onClick={() => setSelectedCall(isSelected ? null : call)}
                        >
                          <td className="py-3.5 px-4 font-mono text-xs text-[#64748B]">{call.id}</td>
                          <td className="py-3.5 px-4 font-semibold text-[#F7F9FC]">{call.caller}</td>
                          <td className="py-3.5 px-4 text-xs text-[#94A3B8]">{call.agent}</td>
                          <td className="py-3.5 px-4 text-xs text-[#94A3B8]">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-[#64748B]" />
                              <span>{call.date}</span>
                              <Clock className="w-3 h-3 text-[#64748B] ml-1" />
                              <span>{call.time}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono text-[#94A3B8]">{call.duration}</td>
                          <td className="py-3.5 px-4">
                            <span className={cn("font-bold font-mono text-xs", call.authenticity > 50 ? "text-emerald-400" : "text-red-400")}>
                              {call.authenticity}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={cn("font-bold font-mono text-xs", call.identity > 70 ? "text-emerald-400" : "text-amber-400")}>
                              {call.identity}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge className={cn("gap-1 font-medium text-[11px] border shadow-xs", v.bg, v.color, v.border)}>
                              <Icon className="w-3 h-3" />
                              {v.label}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCall(isSelected ? null : call);
                                }}
                                className={cn(
                                  "text-xs gap-1.5 h-8 px-2.5 font-medium transition-all shadow-sm cursor-pointer",
                                  isSelected
                                    ? "bg-[#F6821F] text-white border-[#F6821F]"
                                    : "bg-[#121C2D] text-[#F6821F] border-[#F6821F]/40 hover:bg-[#F6821F] hover:text-white"
                                )}
                                title={isSelected ? "Close Spectrogram Evidence" : "Inspect Spectrogram & Forensic Evidence"}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{isSelected ? "Close" : "Evidence"}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDeleteCall(call.id, e)}
                                className="text-[#64748B] hover:text-red-400 hover:bg-red-950/30 p-1.5 h-8 w-8 cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {/* ─── INLINE ACCORDION EXPANSION: SPECTROGRAM & FORENSIC EVIDENCE ─── */}
                        {isSelected && (
                          <tr className="bg-[#080D17]/95 border-b border-[#F6821F]/30 animate-in fade-in duration-200">
                            <td colSpan={9} className="p-5 sm:p-6">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-[#223047] pb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#F6821F] animate-ping" />
                                    <h3 className="font-bold text-[#F7F9FC] text-sm tracking-tight">
                                      Forensic Ledger: <span className="font-mono text-[#F6821F]">{call.id}</span>
                                    </h3>
                                    <span className="text-[#64748B]">—</span>
                                    <span className="text-[#94A3B8] text-xs font-mono">{call.caller}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedCall(null)}
                                    className="text-xs text-[#94A3B8] hover:text-red-400 hover:bg-red-950/20 cursor-pointer h-7"
                                  >
                                    Close Detail
                                  </Button>
                                </div>

                                <div className="grid md:grid-cols-3 gap-3 text-xs">
                                  <div className="bg-[#0D1422] p-3.5 rounded-xl border border-[#223047] space-y-1">
                                    <p className="text-[#64748B] font-mono font-semibold uppercase tracking-wider text-[10px]">Acoustic Authenticity</p>
                                    <p className={cn("text-xl font-extrabold font-mono", call.authenticity > 50 ? "text-emerald-400" : "text-red-400")}>
                                      {call.authenticity}%
                                    </p>
                                    <p className="text-[#94A3B8] text-[11px]">Threshold: &gt;50% Human</p>
                                  </div>
                                  <div className="bg-[#0D1422] p-3.5 rounded-xl border border-[#223047] space-y-1">
                                    <p className="text-[#64748B] font-mono font-semibold uppercase tracking-wider text-[10px]">Speaker Identity Match</p>
                                    <p className={cn("text-xl font-extrabold font-mono", call.identity > 70 ? "text-emerald-400" : "text-amber-400")}>
                                      {call.identity}%
                                    </p>
                                    <p className="text-[#94A3B8] text-[11px]">ECAPA Cosine Score</p>
                                  </div>
                                  <div className="bg-[#0D1422] p-3.5 rounded-xl border border-[#223047] space-y-1">
                                    <p className="text-[#64748B] font-mono font-semibold uppercase tracking-wider text-[10px]">Conversation Context</p>
                                    <p className="text-sm font-semibold text-[#F7F9FC] truncate" title={call.context}>{call.context}</p>
                                    <p className="text-[#94A3B8] text-[11px] truncate">
                                      Flagged: {call.flaggedPhrases.length ? call.flaggedPhrases.join(", ") : "None"}
                                    </p>
                                  </div>
                                </div>

                                {/* Evidentiary Analysis Spectrogram Section */}
                                {call.spectrogramData ? (
                                  <div className="p-4 bg-[#0D1422] border border-[#223047] rounded-xl space-y-3 shadow-xl">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#223047] pb-2.5">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-xs font-bold text-[#F7F9FC] tracking-tight uppercase font-mono">
                                            Analysis Spectrogram Evidence
                                          </h4>
                                          <Badge
                                            variant="outline"
                                            className="bg-emerald-950/60 text-emerald-300 border-emerald-700/60 text-[10px] font-semibold"
                                          >
                                            Retained Evidence
                                          </Badge>
                                        </div>
                                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                                          High-resolution STFT spectrogram generated directly from forensic audio buffers.
                                        </p>
                                      </div>
                                      <span className="text-[11px] font-mono text-[#64748B]">
                                        {call.id}
                                      </span>
                                    </div>

                                    {/* Accessible Summary Notice */}
                                    <div
                                      role="status"
                                      aria-live="polite"
                                      className="text-xs bg-[#121C2D] border border-[#223047] text-[#94A3B8] px-3.5 py-2 rounded-lg font-mono flex flex-wrap items-center justify-between gap-2"
                                    >
                                      <span className="font-sans font-medium text-[#E2E8F0]">
                                        {meta?.summary || (
                                          <>
                                            Spectrogram for <span className="font-semibold text-[#F7F9FC]">{meta?.filename || call.caller}</span>, duration{" "}
                                            <span className="font-semibold text-[#F6821F]">{meta?.duration_seconds ? `${meta.duration_seconds}s` : call.duration}</span>, sample rate{" "}
                                            <span className="font-semibold text-emerald-400">{meta?.sample_rate?.toLocaleString() || "16,000"} Hz</span>.
                                          </>
                                        )}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] bg-[#080D17] font-mono text-[#94A3B8] border-[#223047]">
                                        {meta?.preprocessing_version || "AMVTF-v2.1-Preprocessed-16kHz"}
                                      </Badge>
                                    </div>

                                    {/* Render Image */}
                                    <div className="relative rounded-lg overflow-hidden border border-[#223047] bg-[#050811] shadow-2xl max-w-4xl mx-auto">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={call.spectrogramData}
                                        alt={meta?.summary || `Analysis Spectrogram for ${call.caller}`}
                                        className="w-full h-auto block select-none"
                                      />
                                    </div>

                                    {/* Metadata Badges */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 max-w-4xl mx-auto">
                                      <div className="bg-[#121C2D] p-2 rounded-lg border border-[#223047]">
                                        <span className="text-[#64748B] text-[10px] uppercase font-semibold block font-mono">Analysis ID</span>
                                        <span className="font-bold font-mono text-[#F7F9FC] text-xs truncate block">
                                          {call.id}
                                        </span>
                                      </div>
                                      <div className="bg-[#121C2D] p-2 rounded-lg border border-[#223047]">
                                        <span className="text-[#64748B] text-[10px] uppercase font-semibold block font-mono">Sample Rate</span>
                                        <span className="font-bold font-mono text-[#F7F9FC] text-xs">
                                          {meta?.sample_rate?.toLocaleString() || "16,000"} Hz (Mono)
                                        </span>
                                      </div>
                                      <div className="bg-[#121C2D] p-2 rounded-lg border border-[#223047]">
                                        <span className="text-[#64748B] text-[10px] uppercase font-semibold block font-mono">FFT & Hop</span>
                                        <span className="font-bold font-mono text-[#F7F9FC] text-xs">
                                          {meta?.n_fft || 512} FFT / {meta?.hop_length || 256} Hop
                                        </span>
                                      </div>
                                      <div className="bg-[#121C2D] p-2 rounded-lg border border-[#223047]">
                                        <span className="text-[#64748B] text-[10px] uppercase font-semibold block font-mono">Frequency Scale</span>
                                        <span className="font-bold font-mono text-[#F7F9FC] text-xs">
                                          {meta?.frequency_scale || "Linear 0 - 8,000 Hz"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3.5 bg-[#0D1422] border border-[#223047] rounded-xl flex items-start gap-3">
                                    <Info className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" />
                                    <div className="text-xs space-y-0.5">
                                      <p className="font-semibold text-[#F7F9FC]">Evidentiary Spectrogram</p>
                                      <p className="text-[#94A3B8]">
                                        Visual evidence unavailable for this historical record (audio retention policy expired or pre-dates evidentiary logging).
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
