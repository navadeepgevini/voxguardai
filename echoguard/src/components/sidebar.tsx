"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  History,
  Users,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Radio,
  Cpu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/", label: "Live Analysis", icon: Activity, description: "Real-time stream & 3D Core" },
  { href: "/call-history", label: "Call History", icon: History, description: "Forensic threat audit trail" },
  { href: "/identities", label: "Identities", icon: Users, description: "Speaker voiceprint registry" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Defense thresholds & billing" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const getInitials = () => {
    if (!user) return "OP";
    if (user.full_name) {
      const parts = user.full_name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    return user.username.slice(0, 2).toUpperCase();
  };

  const content = (
    <div className="flex flex-col h-full bg-[#0D1422] border-r border-[#1F2C42] text-[#F7F9FC] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1F2C42] shrink-0">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#F6821F] to-[#E85D04] p-0.5 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0D1422] animate-pulse" />
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="flex flex-col leading-none">
              <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                VOXGUARD
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[#F6821F] font-semibold mt-0.5">
                AI DEFENSE SOC
              </span>
            </div>
          )}
        </Link>
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#121C2D]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-gradient-to-r from-[#F6821F]/20 to-[#F6821F]/5 text-white border-l-2 border-[#F6821F] shadow-sm shadow-orange-500/10"
                  : "text-[#A9B7CC] hover:text-white hover:bg-[#121C2D] border-l-2 border-transparent"
              )}
              title={collapsed && !mobileOpen ? item.label : undefined}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive ? "text-[#F6821F]" : "text-gray-400 group-hover:text-white"
                )}
              />
              {(!collapsed || mobileOpen) && (
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{item.label}</span>
                  <span className="text-[10px] text-[#74839B] group-hover:text-[#A9B7CC] leading-tight truncate">
                    {item.description}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* System Telemetry Pill */}
      {(!collapsed || mobileOpen) && (
        <div className="px-3.5 py-3 mx-2 mb-3 bg-[#121C2D]/80 rounded-lg border border-[#223047] backdrop-blur-sm">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-400 font-mono tracking-tight">SOC ACTIVE</span>
            </div>
            <span className="text-[10px] font-mono text-gray-400 bg-[#080D17] px-1.5 py-0.5 rounded border border-[#223047]">
              v2.4
            </span>
          </div>
          <p className="text-[10px] text-[#74839B] flex items-center gap-1 font-mono">
            <Cpu className="w-3 h-3 text-[#F6821F]" /> AMVTF 3-Layer Fusion
          </p>
        </div>
      )}

      {/* Operator Account Footer */}
      <div className="border-t border-[#1F2C42] p-3 shrink-0 relative bg-[#090E18]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F6821F] to-[#B45309] flex items-center justify-center text-xs font-bold shrink-0 text-white shadow-sm ring-1 ring-white/10"
            title={user ? `${user.full_name} (${user.username})` : "Operator"}
          >
            {getInitials()}
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate" title={user?.full_name || "Operator"}>
                {user?.full_name || user?.username || "Operator"}
              </p>
              <p className="text-[10px] text-[#74839B] truncate font-mono" title={user?.role || "SOC Analyst"}>
                {user?.role || "SOC Analyst"}
              </p>
            </div>
          )}
          {(!collapsed || mobileOpen) && (
            <button
              onClick={() => logout()}
              className="text-[#74839B] hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-[#121C2D]"
              title="Sign Out of SOC Console"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          "hidden md:block transition-all duration-300 ease-in-out relative z-30 shrink-0",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {content}
        {/* Collapse Toggle Handle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-[#121C2D] border border-[#223047] rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1F2C42] transition-colors z-40 shadow-md"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative w-72 max-w-[85vw] z-50 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
