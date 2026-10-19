"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/sidebar";
import { Shield, Menu, Bell, Radio, Activity, Sparkles, CheckCircle2 } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isLoading && user && isLoginPage) {
      router.replace("/");
    }
    if (!isLoading && !user && !isLoginPage) {
      router.replace("/login");
    }
  }, [user, isLoading, isLoginPage, router]);

  // Section title & breadcrumb mapping
  const getSectionMetadata = () => {
    switch (pathname) {
      case "/":
        return { title: "Live Voice Trust Console", subtitle: "Real-Time Multi-Modal Threat Detection & 3D Core" };
      case "/call-history":
        return { title: "Call Threat Audit Trail", subtitle: "SQLite Biometric Forensic Records & Evidence" };
      case "/identities":
        return { title: "Speaker Voiceprint Registry", subtitle: "ECAPA-TDNN 192-Dim Biometric Enrolled Profiles" };
      case "/settings":
        return { title: "Platform Settings & Telephony API", subtitle: "AMVTF Defense Thresholds & Indian Rupee (₹) Billing" };
      default:
        return { title: "Security Operations Center", subtitle: "Voice Intelligence Defense Deck" };
    }
  };

  // Login page layout
  if (isLoginPage) {
    if (user && !isLoading) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#080D17] text-white">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#F6821F] to-[#E85D04] flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm text-gray-400 font-mono">Redirecting to SOC Console...</p>
          </div>
        </div>
      );
    }
    return <main className="min-h-screen w-full bg-[#080D17] text-[#F7F9FC]">{children}</main>;
  }

  // Auth Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#080D17] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F6821F] to-[#E85D04] flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
          </div>
          <div className="text-center">
            <h2 className="text-base font-semibold tracking-wide text-gray-100 font-mono">VOXGUARD SOC SECURITY</h2>
            <p className="text-xs text-[#74839B] mt-1 font-mono">Verifying cryptographic session credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated Redirect
  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#080D17] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F6821F] flex items-center justify-center animate-pulse">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-gray-400 font-mono">Redirecting to Login...</p>
        </div>
      </div>
    );
  }

  const { title, subtitle } = getSectionMetadata();

  return (
    <div className="flex min-h-screen w-full bg-[#080D17] text-[#F7F9FC]">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden min-w-0">
        {/* Flagship Aerospace Top Navigation Bar */}
        <header className="h-16 border-b border-[#1F2C42] bg-[#0D1422]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#121C2D] transition-colors"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb & Section Identification */}
            <div className="flex items-center gap-2 text-xs font-mono text-[#74839B] truncate">
              <span className="text-[#A9B7CC] font-semibold tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F6821F]" />
                VoxGuard SOC
              </span>
              <span>/</span>
              <span className="text-gray-300 truncate">{title}</span>
            </div>
          </div>

          {/* Right Status Badges & Controls */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            {/* Live Engine Status Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#121C2D] border border-[#223047] text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-medium">AMVTF v2.4 Live</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">16kHz Mono</span>
            </div>

            {/* Indian Rupee Telephony Rate Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F6821F]/10 border border-[#F6821F]/30 text-xs font-mono text-[#F6821F]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>₹2.00 / Min</span>
            </div>

            {/* Notifications Button */}
            <Link
              href="/settings"
              className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#121C2D] transition-colors border border-transparent hover:border-[#223047]"
              title="Alert Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F6821F]" />
            </Link>

            {/* Operator Quick Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#1F2C42]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F6821F] to-[#E85D04] flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-white/10">
                {user.username ? user.username.slice(0, 2).toUpperCase() : "OP"}
              </div>
              <span className="hidden xl:inline text-xs font-medium text-gray-300">
                {user.full_name || user.username}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Body */}
        <main className="flex-1 bg-[#080D17] soc-grid relative">
          {children}
        </main>
      </div>
    </div>
  );
}
