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
  SAFE: { label: "Safe", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: ShieldCheck },
  WARNING: { label: "Suspicious", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: MessageSquareWarning },
  CRITICAL: { label: "Deepfake", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: ShieldAlert },
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
      {/* Top Navbar */}
      <nav className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 z-20 sticky top-0">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-[#F6821F]">VoxGuard SOC</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Call Threat Audit Trail</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden lg:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search calls in database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-gray-100 border-transparent focus:bg-white border focus:border-[#F6821F] rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#F6821F] w-64 transition-all"
            />
          </div>
          <button
            onClick={fetchRealCalls}
            className="text-gray-500 hover:text-gray-900 p-1.5 rounded-md hover:bg-gray-100"
            title="Refresh from database"
          >
            <RefreshCw className={cn("w-4 h-4", loading ? "animate-spin text-[#F6821F]" : "")} />
          </button>
          <button className="text-gray-500 hover:text-gray-900 relative">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Page Header */}
      <header className="bg-white border-b border-gray-200 py-6 px-6 sm:px-10 shadow-sm">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Call Threat Audit Trail</h1>
              <p className="text-sm text-gray-500 mt-1">
                Real SQLite database records analyzed by the AMVTF multi-signal fusion engine
              </p>
            </div>
            <div className="flex items-center gap-2">
              {calls.length > 0 && (
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All History
                </Button>
              )}
              <Button
                onClick={handleExportCSV}
                disabled={calls.length === 0}
                variant="outline"
                className="gap-2 text-sm hover:border-[#F6821F] hover:text-[#F6821F] cursor-pointer"
              >
                <Download className="w-4 h-4" /> Export CSV ({calls.length})
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 sm:p-10 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg"><Phone className="w-5 h-5 text-gray-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Database Records</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{stats.safe}</p>
                <p className="text-xs text-gray-500">Verified Safe</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg"><MessageSquareWarning className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats.warning}</p>
                <p className="text-xs text-gray-500">Suspicious</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-red-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg"><ShieldAlert className="w-5 h-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
                <p className="text-xs text-gray-500">Deepfakes Flagged</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 mr-2">Filter:</span>
          {(["ALL", "SAFE", "WARNING", "CRITICAL"] as const).map((v) => (
            <Button
              key={v}
              variant="outline"
              size="sm"
              onClick={() => setFilterVerdict(v)}
              className={cn(
                "text-xs font-medium rounded-md transition-all cursor-pointer",
                filterVerdict === v
                  ? v === "ALL"
                    ? "bg-gray-900 text-white border-gray-900"
                    : v === "SAFE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-500"
                    : v === "WARNING"
                    ? "bg-amber-50 text-amber-700 border-amber-500"
                    : "bg-red-50 text-red-700 border-red-500"
                  : ""
              )}
            >
              {v === "ALL" ? "All Calls" : verdictConfig[v].label}
            </Button>
          ))}
          <div className="flex-1" />
          <span className="text-xs text-gray-500">{calls.length} database entries</span>
        </div>

        {/* Call Table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    <span className="flex items-center gap-1">ID <ArrowUpDown className="w-3 h-3 text-gray-400" /></span>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Caller</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Agent</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Timestamp</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Duration</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Authenticity</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Identity</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Verdict</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#F6821F]" />
                      Querying call audit records from SQLite...
                    </td>
                  </tr>
                ) : calls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <PhoneCall className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-base font-semibold text-gray-800">No Call Records Found</p>
                      <p className="text-xs text-gray-500 mt-1 mb-4">
                        No audio sessions have been analyzed or logged in the database yet.
                      </p>
                      <Link href="/">
                        <Button size="sm" className="bg-[#F6821F] hover:bg-[#E85D04] text-white text-xs gap-1.5">
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
                            "border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer",
                            isSelected ? "bg-orange-50/60 font-medium" : ""
                          )}
                          onClick={() => setSelectedCall(isSelected ? null : call)}
                        >
                          <td className="py-3 px-4 font-mono text-xs text-gray-500">{call.id}</td>
                          <td className="py-3 px-4 font-medium text-gray-900">{call.caller}</td>
                          <td className="py-3 px-4 text-gray-600">{call.agent}</td>
                          <td className="py-3 px-4 text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{call.date}</span>
                              <Clock className="w-3 h-3 text-gray-400 ml-1" />
                              <span>{call.time}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{call.duration}</td>
                          <td className="py-3 px-4">
                            <span className={cn("font-bold", call.authenticity > 50 ? "text-emerald-700" : "text-red-700")}>
                              {call.authenticity}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn("font-bold", call.identity > 70 ? "text-emerald-700" : "text-amber-700")}>
                              {call.identity}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={cn("gap-1 font-medium text-xs", v.bg, v.color, v.border)}>
                              <Icon className="w-3 h-3" />
                              {v.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
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
                                    : "bg-orange-50 text-[#F6821F] border-orange-200 hover:bg-[#F6821F] hover:text-white"
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
                                className="text-gray-400 hover:text-red-600 p-1.5 h-8 w-8"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {/* ─── INLINE ACCORDION EXPANSION: SPECTROGRAM & FORENSIC EVIDENCE ─── */}
                        {isSelected && (
                          <tr className="bg-orange-50/20 border-b border-orange-200 animate-in fade-in duration-150">
                            <td colSpan={9} className="p-5">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-900 text-sm">
                                      Call Detail: <span className="font-mono text-[#F6821F]">{call.id}</span>
                                    </h3>
                                    <span className="text-gray-400">—</span>
                                    <span className="text-gray-700 text-xs font-semibold">{call.caller}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedCall(null)}
                                    className="text-xs text-gray-500 hover:text-red-600 cursor-pointer"
                                  >
                                    Close Detail
                                  </Button>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4 text-xs">
                                  <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-1 shadow-xs">
                                    <p className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Acoustic Authenticity</p>
                                    <p className={cn("text-lg font-bold", call.authenticity > 50 ? "text-emerald-700" : "text-red-700")}>
                                      {call.authenticity}%
                                    </p>
                                    <p className="text-gray-500">Threshold: &gt;50% Human</p>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-1 shadow-xs">
                                    <p className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Speaker Identity Match</p>
                                    <p className={cn("text-lg font-bold", call.identity > 70 ? "text-emerald-700" : "text-amber-700")}>
                                      {call.identity}%
                                    </p>
                                    <p className="text-gray-500">ECAPA Cosine Score</p>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-1 shadow-xs">
                                    <p className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Conversation Context</p>
                                    <p className="text-sm font-bold text-gray-900 truncate" title={call.context}>{call.context}</p>
                                    <p className="text-gray-500 truncate">
                                      Flagged: {call.flaggedPhrases.length ? call.flaggedPhrases.join(", ") : "None"}
                                    </p>
                                  </div>
                                </div>

                                {/* Evidentiary Analysis Spectrogram Section */}
                                {call.spectrogramData ? (
                                  <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3 shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-xs font-bold text-gray-900 tracking-tight">
                                            Analysis Spectrogram
                                          </h4>
                                          <Badge
                                            variant="outline"
                                            className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-semibold"
                                          >
                                            Retained Evidence
                                          </Badge>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                          Generated from the audio used by the detection pipeline.
                                        </p>
                                      </div>
                                      <span className="text-[11px] font-mono text-gray-400">
                                        {call.id}
                                      </span>
                                    </div>

                                    {/* Accessible Summary Notice */}
                                    <div
                                      role="status"
                                      aria-live="polite"
                                      className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-mono flex flex-wrap items-center justify-between gap-2"
                                    >
                                      <span className="font-sans font-medium text-slate-900">
                                        {meta?.summary || (
                                          <>
                                            Spectrogram for <span className="font-semibold">{meta?.filename || call.caller}</span>, duration{" "}
                                            <span className="font-semibold">{meta?.duration_seconds ? `${meta.duration_seconds}s` : call.duration}</span>, sample rate{" "}
                                            <span className="font-semibold">{meta?.sample_rate?.toLocaleString() || "16,000"} Hz</span>.
                                          </>
                                        )}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] bg-slate-100 font-mono text-slate-600 border-slate-300">
                                        {meta?.preprocessing_version || "AMVTF-v2.1-Preprocessed-16kHz"}
                                      </Badge>
                                    </div>

                                    {/* Render Image */}
                                    <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#0B1120] shadow-inner max-w-4xl mx-auto">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={call.spectrogramData}
                                        alt={meta?.summary || `Analysis Spectrogram for ${call.caller}`}
                                        className="w-full h-auto block select-none"
                                      />
                                    </div>

                                    {/* Metadata Badges */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-0.5 max-w-4xl mx-auto">
                                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                        <span className="text-gray-400 text-[10px] uppercase font-semibold block">Analysis ID</span>
                                        <span className="font-bold font-mono text-gray-800 text-xs truncate block">
                                          {call.id}
                                        </span>
                                      </div>
                                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                        <span className="text-gray-400 text-[10px] uppercase font-semibold block">Sample Rate</span>
                                        <span className="font-bold font-mono text-gray-800 text-xs">
                                          {meta?.sample_rate?.toLocaleString() || "16,000"} Hz (Mono)
                                        </span>
                                      </div>
                                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                        <span className="text-gray-400 text-[10px] uppercase font-semibold block">FFT & Hop</span>
                                        <span className="font-bold font-mono text-gray-800 text-xs">
                                          {meta?.n_fft || 512} FFT / {meta?.hop_length || 256} Hop
                                        </span>
                                      </div>
                                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                        <span className="text-gray-400 text-[10px] uppercase font-semibold block">Frequency Scale</span>
                                        <span className="font-bold font-mono text-gray-800 text-xs">
                                          {meta?.frequency_scale || "Linear 0 - 8,000 Hz"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3.5 bg-white border border-gray-200 rounded-lg flex items-start gap-3">
                                    <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                    <div className="text-xs space-y-0.5">
                                      <p className="font-semibold text-gray-700">Evidentiary Spectrogram</p>
                                      <p className="text-gray-500">
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
