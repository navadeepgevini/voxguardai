"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  ChevronRight,
  Save,
  Sliders,
  Bell as BellIcon,
  Key,
  Globe,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Sparkles,
  CreditCard,
  Coins,
  Check,
  Zap,
  ShieldCheck,
  X,
  Trash2,
  Lock,
  ArrowRight,
  Clock,
  Wallet,
  CheckCircle,
  HelpCircle,
  QrCode,
  Smartphone,
  ExternalLink,
  KeyRound,
  UserCheck,
  ShieldAlert,
  Mail,
  Send,
  Info,
  Plus
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getSettings,
  updateSettings,
  getActiveApiKey,
  generateApiKey,
  topupApiKey,
  revokeApiKey,
  createPaymentOrder,
  verifyPaymentOrder,
  getPaymentOrderStatus,
  ApiKeyRecord,
  PaymentOrderRecord,
  PaymentActivationResult,
  getNotificationSettings,
  updateNotificationSettings,
  addNotificationRecipient,
  verifyNotificationRecipient,
  removeNotificationRecipient,
  sendTestNotificationEmail,
  getNotificationHistory,
  NotificationSettings,
  NotificationRecipient,
  NotificationJob
} from "@/lib/api";

type SettingsSection = "thresholds" | "notifications" | "api" | "general";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("thresholds");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [aasistThreshold, setAasistThreshold] = useState(50);
  const [ecapaThreshold, setEcapaThreshold] = useState(70);
  const [nlpSensitivity, setNlpSensitivity] = useState(65);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [autoBlock, setAutoBlock] = useState(true);
  const [apiKey, setApiKey] = useState("vxg_sk_live_99214820491823904812");
  const [webhookUrl, setWebhookUrl] = useState("https://api.voxguard.security/hooks/amvtf-alerts");

  // API Key & Usage Billing States
  const [activeKey, setActiveKey] = useState<ApiKeyRecord | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  // Real UPI Checkout States
  type CheckoutStep = "SELECT" | "COLLECT" | "VERIFY_UTR" | "RECEIPT";
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "PRO" | "ENTERPRISE">("FREE");
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("SELECT");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [upiId, setUpiId] = useState("");
  const [activePaymentOrder, setActivePaymentOrder] = useState<PaymentOrderRecord | null>(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [activationResult, setActivationResult] = useState<PaymentActivationResult | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(300);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Topup modal states
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupTab, setTopupTab] = useState<"minutes" | "tokens">("minutes");
  const [selectedMinutesTopup, setSelectedMinutesTopup] = useState<{ minutes: number; price_inr: number; label: string }>({
    minutes: 50,
    price_inr: 100,
    label: "50 Audio Minutes"
  });
  const [selectedTokensTopup, setSelectedTokensTopup] = useState<{ tokens: number; price_inr: number; label: string }>({
    tokens: 5000,
    price_inr: 49,
    label: "Growth Pack (5,000 Tokens)"
  });
  const [topupProcessing, setTopupProcessing] = useState(false);
  type TopupStep = "SELECT" | "COLLECT" | "VERIFY_UTR" | "SUCCESS";
  const [topupStep, setTopupStep] = useState<TopupStep>("SELECT");
  const [topupUpiId, setTopupUpiId] = useState("");
  const [topupPayerName, setTopupPayerName] = useState("");
  const [topupPaymentOrder, setTopupPaymentOrder] = useState<PaymentOrderRecord | null>(null);
  const [topupUtrNumber, setTopupUtrNumber] = useState("");
  const [topupCountdown, setTopupCountdown] = useState(300);
  const [topupPaymentError, setTopupPaymentError] = useState<string | null>(null);
  const [topupSuccessDetails, setTopupSuccessDetails] = useState<{
    units_added: string;
    amount_paid: number;
    utr: string;
  } | null>(null);

  // Notification Pipeline States
  const [notifPolicy, setNotifPolicy] = useState<NotificationSettings | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifyOnSynthetic, setNotifyOnSynthetic] = useState(true);
  const [notifyOnHighRisk, setNotifyOnHighRisk] = useState(true);
  const [notifyOnInconclusive, setNotifyOnInconclusive] = useState(false);
  const [notifyOnIdentityMismatch, setNotifyOnIdentityMismatch] = useState(false);
  const [syntheticThreshold, setSyntheticThreshold] = useState(75);
  const [contextThreshold, setContextThreshold] = useState(80);
  const [deliveryStatus, setDeliveryStatus] = useState<"Not configured" | "Ready" | "Sending" | "Sent" | "Failed" | "Suppressed">("Not configured");
  const [recipientStatus, setRecipientStatus] = useState<string>("Pending Configuration");
  const [cooldownMinutes, setCooldownMinutes] = useState(5);
  const [maxAlertsPerHour, setMaxAlertsPerHour] = useState(15);
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [newRecipientLabel, setNewRecipientLabel] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; message: string; timestamp?: string } | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<NotificationJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const data = await getSettings();
        setAasistThreshold(data.aasistThreshold);
        setEcapaThreshold(data.ecapaThreshold);
        setNlpSensitivity(data.nlpSensitivity);
        setEmailAlerts(data.emailAlerts);
        setSlackAlerts(data.slackAlerts);
        setCriticalOnly(data.criticalOnly);
        setAutoBlock(data.autoBlock);
        if (data.apiKey) setApiKey(data.apiKey);
        if (data.webhookUrl) setWebhookUrl(data.webhookUrl);
      } catch (err) {
        console.error("Failed to load settings from database:", err);
      } finally {
        setLoading(false);
      }
    }

    async function loadKey() {
      setKeyLoading(true);
      try {
        const keyData = await getActiveApiKey();
        if (keyData) {
          setActiveKey(keyData);
          setApiKey(keyData.key);
        }
      } catch (err) {
        console.error("Failed to load active API key:", err);
      } finally {
        setKeyLoading(false);
      }
    }

    loadSettings();
    loadKey();
    loadNotificationData();
    loadHistory();
  }, []);

  const loadNotificationData = async () => {
    setNotifLoading(true);
    try {
      const data = await getNotificationSettings();
      setNotifPolicy(data);
      setNotifyOnSynthetic(data.notify_on_synthetic);
      setNotifyOnHighRisk(data.notify_on_high_risk);
      setNotifyOnInconclusive(data.notify_on_inconclusive);
      setNotifyOnIdentityMismatch(data.notify_on_identity_mismatch);
      if (typeof data.synthetic_threshold === "number") setSyntheticThreshold(data.synthetic_threshold);
      if (typeof data.context_threshold === "number") setContextThreshold(data.context_threshold);
      if (data.delivery_status) setDeliveryStatus(data.delivery_status);
      if (data.recipient_status) setRecipientStatus(data.recipient_status);
      setCooldownMinutes(data.cooldown_minutes);
      setMaxAlertsPerHour(data.max_alerts_per_hour);
      setRecipients(data.recipients || []);
    } catch (err) {
      console.error("Failed to load notification settings:", err);
    } finally {
      setNotifLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const hist = await getNotificationHistory(20);
      setNotificationHistory(hist);
    } catch (err) {
      console.error("Failed to load notification history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipientEmail || !newRecipientEmail.includes("@")) {
      alert("Please enter a valid recipient email address.");
      return;
    }
    try {
      const rec = await addNotificationRecipient(
        newRecipientEmail.trim(),
        newRecipientLabel.trim() || "Incident Response Analyst",
        "ADMIN_APPROVED_DEMO"
      );
      setRecipients(prev => [...prev.filter(r => r.email.toLowerCase() !== rec.email.toLowerCase()), rec]);
      setNewRecipientEmail("");
      setNewRecipientLabel("");
    } catch (err) {
      console.error("Failed to add recipient:", err);
      alert("Failed to add recipient.");
    }
  };

  const handleVerifyRecipient = async (email: string) => {
    try {
      await verifyNotificationRecipient(email);
      setRecipients(prev => prev.map(r => r.email.toLowerCase() === email.toLowerCase() ? { ...r, status: "VERIFIED" as const } : r));
    } catch (err) {
      console.error("Failed to verify recipient:", err);
      alert("Failed to verify recipient.");
    }
  };

  const handleRemoveRecipient = async (email: string) => {
    try {
      await removeNotificationRecipient(email);
      setRecipients(prev => prev.filter(r => r.email.toLowerCase() !== email.toLowerCase()));
    } catch (err) {
      console.error("Failed to remove recipient:", err);
      alert("Failed to remove recipient.");
    }
  };

  const handleSendTestEmail = async () => {
    setTestSending(true);
    setDeliveryStatus("Sending");
    setTestResult(null);
    try {
      const targetRecipient = recipients.find(r => r.status === "VERIFIED")?.email || recipients[0]?.email;
      const res = await sendTestNotificationEmail(targetRecipient);
      const statusMap: Record<string, "Sent" | "Failed" | "Suppressed"> = {
        SENT: "Sent",
        QUEUED: "Sent",
        FAILED: "Failed",
        SUPPRESSED: "Suppressed",
      };
      setDeliveryStatus(statusMap[res.status] || "Sent");
      setTestResult({
        status: res.status,
        message: res.message || `Test alert queued to ${res.recipient}`,
        timestamp: new Date().toLocaleTimeString()
      });
      loadHistory();
    } catch (err: any) {
      setDeliveryStatus("Failed");
      setTestResult({
        status: "FAILED",
        message: err.message || "Failed to dispatch test notification email.",
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setTestSending(false);
    }
  };

  const handleSaveNotificationPolicy = async () => {
    setNotifSaving(true);
    try {
      const updated = await updateNotificationSettings({
        enabled: emailAlerts,
        notify_on_synthetic: notifyOnSynthetic,
        notify_on_high_risk: notifyOnHighRisk,
        notify_on_inconclusive: notifyOnInconclusive,
        notify_on_identity_mismatch: notifyOnIdentityMismatch,
        synthetic_threshold: syntheticThreshold,
        context_threshold: contextThreshold,
        cooldown_minutes: cooldownMinutes,
        max_alerts_per_hour: maxAlertsPerHour,
      });
      setNotifPolicy(updated);
      if (updated.delivery_status) setDeliveryStatus(updated.delivery_status);
      if (updated.recipient_status) setRecipientStatus(updated.recipient_status);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save notification policy:", err);
      alert("Failed to save notification policy.");
    } finally {
      setNotifSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        aasistThreshold,
        ecapaThreshold,
        nlpSensitivity,
        emailAlerts,
        slackAlerts,
        criticalOnly,
        autoBlock,
        apiKey,
        webhookUrl,
      });
      await updateNotificationSettings({
        enabled: emailAlerts,
        notify_on_synthetic: notifyOnSynthetic,
        notify_on_high_risk: notifyOnHighRisk,
        notify_on_inconclusive: notifyOnInconclusive,
        notify_on_identity_mismatch: notifyOnIdentityMismatch,
        synthetic_threshold: syntheticThreshold,
        context_threshold: contextThreshold,
        cooldown_minutes: cooldownMinutes,
        max_alerts_per_hour: maxAlertsPerHour,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings to backend database.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyKey = () => {
    if (!activeKey?.key) return;
    navigator.clipboard.writeText(activeKey.key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  // Countdown timer for active UPI Collect order
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (checkoutStep === "VERIFY_UTR" && countdownSeconds > 0) {
      timer = setInterval(() => {
        setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [checkoutStep, countdownSeconds]);

  // Countdown timer for active Topup UPI Collect order
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (topupStep === "VERIFY_UTR" && topupCountdown > 0) {
      timer = setInterval(() => {
        setTopupCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [topupStep, topupCountdown]);

  const handleOpenGenerateModal = () => {
    setSelectedPlan("FREE");
    setCheckoutStep("SELECT");
    setPaymentError(null);
    setPayerName("");
    setPayerEmail("");
    setUpiId("");
    setUtrNumber("");
    setActivePaymentOrder(null);
    setActivationResult(null);
    setShowPlanModal(true);
  };

  const handleSelectPlan = (plan: "FREE" | "PRO" | "ENTERPRISE") => {
    setSelectedPlan(plan);
    setPaymentError(null);
    if (plan === "FREE") {
      executeGenerateFreeKey();
    } else {
      setCheckoutStep("COLLECT");
    }
  };

  const executeGenerateFreeKey = async () => {
    setIsProcessing(true);
    setPaymentError(null);
    try {
      const createdKey = await generateApiKey({
        plan_tier: "FREE",
        name: "Free Sandbox Plan Key",
        payment_method: "free_sandbox",
      });
      setActiveKey(createdKey);
      setApiKey(createdKey.key);
      setShowPlanModal(false);
      setCheckoutStep("SELECT");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPaymentError(err.message);
      } else {
        setPaymentError("Failed to activate Free Sandbox Key");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendUpiCollectRequest = async () => {
    const cleanUpi = upiId.trim();
    if (!cleanUpi || (!cleanUpi.includes("@") && cleanUpi.length < 10)) {
      setPaymentError("Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm)");
      return;
    }
    setPaymentError(null);
    setIsProcessing(true);
    try {
      const amount = selectedPlan === "PRO" ? 499.0 : 2999.0;
      const order = await createPaymentOrder(
        selectedPlan,
        amount,
        cleanUpi,
        payerName.trim() || undefined,
        payerEmail.trim() || undefined
      );
      setActivePaymentOrder(order);
      setCountdownSeconds(300); // 5 minutes
      setCheckoutStep("VERIFY_UTR");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPaymentError(err.message);
      } else {
        setPaymentError("Failed to initiate UPI collect request.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyUtr = async () => {
    if (!activePaymentOrder) return;
    const cleanUtr = utrNumber.trim();
    if (cleanUtr.length < 6) {
      setPaymentError("Please enter the 12-digit UPI Bank Reference / UTR Number from your payment app");
      return;
    }
    setPaymentError(null);
    setIsVerifyingPayment(true);
    try {
      const res = await verifyPaymentOrder(activePaymentOrder.order_id, cleanUtr);
      setActivationResult(res);
      setActiveKey(res.api_key);
      setApiKey(res.api_key.key);
      setCheckoutStep("RECEIPT");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPaymentError(err.message);
      } else {
        setPaymentError("Payment verification failed. Please re-check your UTR number.");
      }
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendTopupUpiCollect = async () => {
    const cleanUpi = topupUpiId.trim();
    if (!cleanUpi || (!cleanUpi.includes("@") && cleanUpi.length < 10)) {
      setTopupPaymentError("Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm)");
      return;
    }
    setTopupPaymentError(null);
    setTopupProcessing(true);
    try {
      const amount = topupTab === "minutes" ? selectedMinutesTopup.price_inr : selectedTokensTopup.price_inr;
      const units = topupTab === "minutes" ? selectedMinutesTopup.minutes : selectedTokensTopup.tokens;
      const order = await createPaymentOrder(
        "RECHARGE",
        amount,
        cleanUpi,
        topupPayerName.trim() || undefined,
        undefined,
        activeKey?.id,
        topupTab,
        units
      );
      setTopupPaymentOrder(order);
      setTopupCountdown(300);
      setTopupStep("VERIFY_UTR");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTopupPaymentError(err.message);
      } else {
        setTopupPaymentError("Failed to initiate UPI collect request for recharge.");
      }
    } finally {
      setTopupProcessing(false);
    }
  };

  const handleVerifyTopupUtr = async () => {
    if (!topupPaymentOrder) return;
    const cleanUtr = topupUtrNumber.trim();
    if (cleanUtr.length < 6) {
      setTopupPaymentError("Please enter the 12-digit UPI Bank Reference / UTR Number from your payment app");
      return;
    }
    setTopupPaymentError(null);
    setTopupProcessing(true);
    try {
      const res = await verifyPaymentOrder(topupPaymentOrder.order_id, cleanUtr);
      setActiveKey(res.api_key);
      const unitsLabel = topupTab === "minutes"
        ? `+${selectedMinutesTopup.minutes} Audio Minutes`
        : `+${selectedTokensTopup.tokens.toLocaleString()} Tokens`;
      setTopupSuccessDetails({
        units_added: unitsLabel,
        amount_paid: topupPaymentOrder.amount_inr,
        utr: cleanUtr,
      });
      setTopupStep("SUCCESS");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTopupPaymentError(err.message);
      } else {
        setTopupPaymentError("Payment verification failed. Please check your UTR number.");
      }
    } finally {
      setTopupProcessing(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!activeKey) return;
    if (!confirm("Are you sure you want to revoke this API key? External telephony gateways using it will stop authenticating.")) return;
    try {
      await revokeApiKey(activeKey.id);
      setActiveKey(null);
      setApiKey("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("Failed to revoke key: " + err.message);
      } else {
        alert("Failed to revoke key.");
      }
    }
  };

  const sections = [
    { id: "thresholds" as const, label: "Detection Thresholds", icon: Sliders, description: "Tune AMVTF engine sensitivity" },
    { id: "notifications" as const, label: "Notifications", icon: BellIcon, description: "Alert delivery preferences" },
    { id: "api" as const, label: "API & Usage Billing (₹)", icon: Key, description: "Pay-as-you-go & ₹2/min audio API" },
    { id: "general" as const, label: "General", icon: Globe, description: "System architecture specs" },
  ];

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="transition-colors cursor-pointer">
      {enabled ? (
        <ToggleRight className="w-8 h-8 text-[#F6821F]" />
      ) : (
        <ToggleLeft className="w-8 h-8 text-gray-300" />
      )}
    </button>
  );

  return (
    <>
      {/* Page Header */}
      <header className="bg-[#0D1422]/90 border-b border-[#223047] py-6 px-6 sm:px-10 backdrop-blur-md sticky top-0 z-10 shadow-lg">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#F6821F]/10 text-[#F6821F] border border-[#F6821F]/30">
                <Sliders className="w-3 h-3 text-[#F6821F]" /> Platform Governance
              </span>
              <span className="text-[#64748B] text-xs font-mono">•</span>
              <span className="text-[#94A3B8] text-xs font-mono">Dynamic Thresholds & Billing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7F9FC] tracking-tight">
              Platform Settings & Telephony API
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Configure multi-modal biometric thresholds, telephony webhook endpoints, and usage-based audio billing.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#F6821F] hover:bg-[#E85D04] text-white shadow-lg shadow-[#F6821F]/20 flex items-center gap-2 self-start sm:self-auto cursor-pointer h-9 px-4 text-xs font-semibold"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Saved to Database!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save All Changes</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-[1400px] mx-auto p-6 sm:p-10">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Section Navigation Sidebar */}
          <div className="bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-2 space-y-1 backdrop-blur-md">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full text-left px-3.5 py-3 rounded-lg flex items-start gap-3 transition-all cursor-pointer border",
                    isActive
                      ? "bg-[#F6821F]/10 border-[#F6821F]/40 text-[#F6821F] font-semibold shadow-xs"
                      : "border-transparent text-[#94A3B8] hover:bg-[#121C2D] hover:text-[#F7F9FC]"
                  )}
                >
                  <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", isActive ? "text-[#F6821F]" : "text-[#64748B]")} />
                  <div>
                    <div className="text-sm font-medium">{section.label}</div>
                    <div className="text-[11px] text-[#64748B] font-normal leading-tight mt-0.5">{section.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Settings Section Panel */}
          <div className="space-y-6">
            {activeSection === "thresholds" && (
              <>
                <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-6 backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#223047] mb-6 gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#F6821F]/10 text-[#F6821F] border border-[#F6821F]/30">
                          <Sliders className="w-3 h-3 text-[#F6821F]" /> Fusion Gate
                        </span>
                        <span className="text-[#64748B] text-xs font-mono">•</span>
                        <span className="text-[#94A3B8] text-xs font-mono">AMVTF Inference Parameters</span>
                      </div>
                      <h2 className="text-lg font-bold text-[#F7F9FC] tracking-tight">AMVTF Biometric Threat Thresholds</h2>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        Fine-tune the neural sensitivity thresholds for voice authenticity, speaker recognition, and intent risk.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#121C2D] border border-[#223047] rounded-lg self-start sm:self-auto">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-mono text-[#94A3B8]">
                        Mode: <strong className="text-[#F7F9FC]">{aasistThreshold > 60 ? "MAXIMUM_SECURITY" : aasistThreshold > 40 ? "BALANCED" : "LOW_FALSE_POSITIVE"}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* AASIST */}
                    <div className="bg-[#121C2D]/60 p-4 rounded-xl border border-[#223047]/60">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <label className="text-sm font-bold text-[#F7F9FC]">AASIST Authenticity Cutoff</label>
                          <p className="text-xs text-[#94A3B8]">Deepfake detection minimum score to flag audio as synthetic</p>
                        </div>
                        <span className="text-xl font-extrabold text-[#F6821F] font-mono">{aasistThreshold}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="95"
                        value={aasistThreshold}
                        onChange={(e) => setAasistThreshold(Number(e.target.value))}
                        className="w-full h-2 bg-[#080D17] border border-[#223047] rounded-full appearance-none cursor-pointer accent-[#F6821F]"
                      />
                      <div className="flex justify-between text-[11px] font-mono text-[#64748B] mt-1.5">
                        <span>Permissive (10%)</span>
                        <span className="text-[#94A3B8]">Balanced (50%)</span>
                        <span>Strict (95%)</span>
                      </div>
                    </div>

                    {/* ECAPA */}
                    <div className="bg-[#121C2D]/60 p-4 rounded-xl border border-[#223047]/60">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <label className="text-sm font-bold text-[#F7F9FC]">ECAPA-TDNN Speaker Verification Minimum</label>
                          <p className="text-xs text-[#94A3B8]">192-dimensional cosine similarity threshold for identity match</p>
                        </div>
                        <span className="text-xl font-extrabold text-[#F6821F] font-mono">{ecapaThreshold}%</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="99"
                        value={ecapaThreshold}
                        onChange={(e) => setEcapaThreshold(Number(e.target.value))}
                        className="w-full h-2 bg-[#080D17] border border-[#223047] rounded-full appearance-none cursor-pointer accent-[#F6821F]"
                      />
                      <div className="flex justify-between text-[11px] font-mono text-[#64748B] mt-1.5">
                        <span>Permissive (30%)</span>
                        <span>Strict (99%)</span>
                      </div>
                    </div>

                    {/* NLP */}
                    <div className="bg-[#121C2D]/60 p-4 rounded-xl border border-[#223047]/60">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <label className="text-sm font-bold text-[#F7F9FC]">NLP Contextual Sensitivity</label>
                          <p className="text-xs text-[#94A3B8]">DistilBERT urgency and social-engineering sensitivity level</p>
                        </div>
                        <span className="text-xl font-extrabold text-[#F6821F] font-mono">{nlpSensitivity}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={nlpSensitivity}
                        onChange={(e) => setNlpSensitivity(Number(e.target.value))}
                        className="w-full h-2 bg-[#080D17] border border-[#223047] rounded-full appearance-none cursor-pointer accent-[#F6821F]"
                      />
                      <div className="flex justify-between text-[11px] font-mono text-[#64748B] mt-1.5">
                        <span>Less Sensitive (20%)</span>
                        <span>More Sensitive (100%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeSection === "notifications" && (
              <div className="space-y-6">
                {/* 1. Main Master Toggle & Pipeline Health */}
                <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-6 backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#223047] gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-[#F7F9FC]">Incident Notification Channels</h2>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F6821F]/10 text-[#F6821F] border border-[#F6821F]/30">
                          <Mail className="w-3.5 h-3.5 text-[#F6821F]" /> Resend Email Engine
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        Dispatch real-time security alerts to authorized SOC responders, mobile devices, and incident webhooks.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleSaveNotificationPolicy}
                        disabled={notifSaving}
                        className="bg-[#F6821F] hover:bg-[#E85D04] text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-lg shadow-[#F6821F]/20 h-9 px-3"
                      >
                        {notifSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Notification Policy
                      </Button>
                    </div>
                  </div>

                  {/* Master Email Alerts Toggle */}
                  <div className="pt-5 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#121C2D]/60 border border-[#223047] rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-[#F7F9FC]">Master Email Alerting</p>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          When enabled, verified incidents enqueue background email delivery through Resend to configured security recipients.
                        </p>
                      </div>
                      <Toggle enabled={emailAlerts} onToggle={() => setEmailAlerts(!emailAlerts)} />
                    </div>

                    {/* Helper Copy Banner */}
                    <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-xl flex items-start gap-2.5 text-xs text-blue-200">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <p className="font-bold text-blue-300">Mobile Delivery Notice:</p>
                        <p className="mt-0.5 text-blue-200/90">
                          Alerts are delivered by email and may appear on the recipient’s phone through their email app. Delivery timing depends on the email provider and phone notification settings.
                        </p>
                      </div>
                    </div>

                    {/* Resend Provider Delivery Readiness & Status Card */}
                    <div className="p-4 border border-[#223047] rounded-xl bg-[#121C2D]/40">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] font-mono">Resend Email Delivery Readiness & Status</h3>
                        </div>
                        <Badge
                          className={cn(
                            "text-xs px-2.5 py-0.5 font-medium border font-mono",
                            deliveryStatus === "Ready" || deliveryStatus === "Sent"
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/60"
                              : deliveryStatus === "Sending"
                              ? "bg-blue-950/60 text-blue-300 border-blue-700/60"
                              : deliveryStatus === "Not configured"
                              ? "bg-amber-950/60 text-amber-300 border-amber-700/60"
                              : deliveryStatus === "Suppressed"
                              ? "bg-purple-950/60 text-purple-300 border-purple-700/60"
                              : "bg-red-950/60 text-red-300 border-red-700/60"
                          )}
                        >
                          {deliveryStatus}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 bg-[#080D17] rounded-lg border border-[#223047]">
                          <span className="text-[#64748B] block text-[10px] uppercase font-semibold font-mono">Delivery State</span>
                          <span className="font-mono font-bold text-[#F7F9FC]">{deliveryStatus}</span>
                        </div>
                        <div className="p-2.5 bg-[#080D17] rounded-lg border border-[#223047]">
                          <span className="text-[#64748B] block text-[10px] uppercase font-semibold font-mono">Recipient Status</span>
                          <span className="font-mono font-medium text-[#F7F9FC] truncate block" title={recipientStatus}>
                            {recipientStatus}
                          </span>
                        </div>
                        <div className="p-2.5 bg-[#080D17] rounded-lg border border-[#223047]">
                          <span className="text-[#64748B] block text-[10px] uppercase font-semibold font-mono">Sender Identity</span>
                          <span className="font-mono font-medium text-[#F7F9FC] truncate block" title={notifPolicy?.resend_from || "onboarding@resend.dev"}>
                            {notifPolicy?.resend_from || "onboarding@resend.dev"}
                          </span>
                        </div>
                        <div className="p-2.5 bg-[#080D17] rounded-lg border border-[#223047]">
                          <span className="text-[#64748B] block text-[10px] uppercase font-semibold font-mono">Key Protection</span>
                          <span className="text-emerald-400 font-medium flex items-center gap-1 font-mono">
                            <Lock className="w-3 h-3 text-emerald-400" /> Server-Side (Zero-Leak)
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-2 font-mono">
                        * Note: Resend API credentials and keys are strictly evaluated server-side in Node.js and never exposed via browser bundles, JavaScript, or network responses.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Alert Trigger Conditions & Operational Policies */}
                <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-6 backdrop-blur-md">
                  <div className="pb-4 border-b border-[#223047]">
                    <h3 className="text-base font-bold text-[#F7F9FC]">Alert Trigger Policies & Event Filtering</h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Select which security events automatically queue high-priority email alerts.</p>
                  </div>

                  <div className="divide-y divide-[#223047]/60">
                    {/* Trigger 1: Likely Synthetic Deepfake */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#F7F9FC]">Likely Synthetic Result (Synthetic Deepfake &ge; {syntheticThreshold}%)</p>
                          <Badge className="bg-red-950/60 text-red-400 border-red-700/60 text-[10px] font-mono">CRITICAL</Badge>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          Dispatch immediate alert when AMVTF vocoder artifacts or acoustic physical features indicate synthetic confidence at or above {syntheticThreshold}%.
                        </p>
                      </div>
                      <Toggle enabled={notifyOnSynthetic} onToggle={() => setNotifyOnSynthetic(!notifyOnSynthetic)} />
                    </div>

                    {/* Trigger 2: High Context Risk */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#F7F9FC]">High Contextual Risk (Social Engineering & Impersonation &ge; {contextThreshold}%)</p>
                          <Badge className="bg-amber-950/60 text-amber-400 border-amber-700/60 text-[10px] font-mono">WARNING</Badge>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          Alert when NLP analyzes urgent funds transfer, secrecy pressure, or executive impersonation risk at or above {contextThreshold}%.
                        </p>
                      </div>
                      <Toggle enabled={notifyOnHighRisk} onToggle={() => setNotifyOnHighRisk(!notifyOnHighRisk)} />
                    </div>

                    {/* Trigger 3: Inconclusive Operational Alert */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#F7F9FC]">Inconclusive / Analysis Degradation Operational Alert</p>
                          <Badge className="bg-[#121C2D] text-[#94A3B8] border-[#223047] text-[10px] font-mono">INFO</Badge>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          Notify SOC operations when audio sample suffers from excessive packet loss, clipping, or insufficient speech duration (&lt;1.5s).
                        </p>
                      </div>
                      <Toggle enabled={notifyOnInconclusive} onToggle={() => setNotifyOnInconclusive(!notifyOnInconclusive)} />
                    </div>

                    {/* Trigger 4: Identity Mismatch */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#F7F9FC]">Enrolled Identity Mismatch</p>
                          <Badge className="bg-blue-950/60 text-blue-400 border-blue-700/60 text-[10px] font-mono">VERIFICATION</Badge>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          Trigger verification notification when speaker does not match target voiceprint reference.
                        </p>
                        <p className="text-[11px] text-amber-400/90 font-mono mt-1">
                          ⚠ Identity mismatch is separately configurable and is not described as a deepfake result.
                        </p>
                      </div>
                      <Toggle enabled={notifyOnIdentityMismatch} onToggle={() => setNotifyOnIdentityMismatch(!notifyOnIdentityMismatch)} />
                    </div>
                  </div>

                  {/* Alert Thresholds, Rate Limiting & Cooldown */}
                  <div className="mt-5 pt-4 border-t border-[#223047] grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3 bg-[#121C2D]/60 rounded-xl border border-[#223047]">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-[#F7F9FC]">Synthetic Threshold</label>
                        <span className="text-xs font-mono font-bold text-[#F6821F]">{syntheticThreshold}%</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mb-2">Trigger alert when synthetic confidence reaches this level.</p>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        value={syntheticThreshold}
                        onChange={(e) => setSyntheticThreshold(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#080D17] border border-[#223047] rounded-lg appearance-none cursor-pointer accent-[#F6821F]"
                      />
                    </div>

                    <div className="p-3 bg-[#121C2D]/60 rounded-xl border border-[#223047]">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-[#F7F9FC]">Context Threshold</label>
                        <span className="text-xs font-mono font-bold text-[#F6821F]">{contextThreshold}%</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mb-2">Trigger alert when contextual threat risk reaches this level.</p>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        value={contextThreshold}
                        onChange={(e) => setContextThreshold(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#080D17] border border-[#223047] rounded-lg appearance-none cursor-pointer accent-[#F6821F]"
                      />
                    </div>

                    <div className="p-3 bg-[#121C2D]/60 rounded-xl border border-[#223047]">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-[#F7F9FC]">Per-Incident Cooldown</label>
                        <span className="text-xs font-mono font-bold text-[#F6821F]">{cooldownMinutes} min</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mb-2">Suppress repeat alerts for the same analysis ID.</p>
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={cooldownMinutes}
                        onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#080D17] border border-[#223047] rounded-lg appearance-none cursor-pointer accent-[#F6821F]"
                      />
                    </div>

                    <div className="p-3 bg-[#121C2D]/60 rounded-xl border border-[#223047]">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-[#F7F9FC]">Max Alerts / Hour</label>
                        <span className="text-xs font-mono font-bold text-[#F6821F]">{maxAlertsPerHour} / hr</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mb-2">Maximum email dispatches per hour to protect quotas.</p>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={maxAlertsPerHour}
                        onChange={(e) => setMaxAlertsPerHour(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#080D17] border border-[#223047] rounded-lg appearance-none cursor-pointer accent-[#F6821F]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Authorized Incident Recipient Registry */}
                <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-6 backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#223047] gap-2">
                    <div>
                      <h3 className="text-base font-bold text-[#F7F9FC]">Authorized Recipient Registry</h3>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        Only verified or administrator-approved demo recipients receive active incident alerts.
                      </p>
                    </div>
                    <span className="text-xs text-[#64748B] font-mono">Policy v{notifPolicy?.policy_version || 1}</span>
                  </div>

                  {/* Add Recipient Form */}
                  <div className="py-4 border-b border-[#223047] flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="email"
                      placeholder="analyst@voxguard.security or oncall@company.com"
                      value={newRecipientEmail}
                      onChange={(e) => setNewRecipientEmail(e.target.value)}
                      className="flex-1 w-full px-3 py-2 text-xs bg-[#121C2D] border border-[#223047] rounded-lg text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F] focus:ring-1 focus:ring-[#F6821F]"
                    />
                    <input
                      type="text"
                      placeholder="Role Label (e.g. Lead SOC On-Call)"
                      value={newRecipientLabel}
                      onChange={(e) => setNewRecipientLabel(e.target.value)}
                      className="w-full sm:w-56 px-3 py-2 text-xs bg-[#121C2D] border border-[#223047] rounded-lg text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F] focus:ring-1 focus:ring-[#F6821F]"
                    />
                    <Button
                      onClick={handleAddRecipient}
                      size="sm"
                      className="w-full sm:w-auto bg-[#F6821F] hover:bg-[#E85D04] text-white text-xs font-semibold gap-1.5 cursor-pointer shrink-0 shadow-md shadow-[#F6821F]/20 h-9"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Recipient
                    </Button>
                  </div>

                  {/* Recipients List */}
                  <div className="mt-4 divide-y divide-[#223047]/60">
                    {recipients.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#64748B]">
                        No notification recipients registered yet. Add an email address above.
                      </div>
                    ) : (
                      recipients.map((rec) => (
                        <div key={rec.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-[#121C2D] border border-[#223047] flex items-center justify-center text-[#F6821F] font-bold text-xs shrink-0 font-mono">
                              {rec.email[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#F7F9FC] truncate">{rec.email}</p>
                              <p className="text-[11px] text-[#94A3B8]">{rec.label}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {rec.status === "VERIFIED" ? (
                              <Badge className="bg-emerald-950/60 text-emerald-300 border-emerald-700/60 text-[10px] gap-1 font-mono">
                                <CheckCircle className="w-3 h-3 text-emerald-400" /> Verified
                              </Badge>
                            ) : rec.status === "ADMIN_APPROVED_DEMO" ? (
                              <Badge className="bg-blue-950/60 text-blue-300 border-blue-700/60 text-[10px] gap-1 font-mono">
                                <ShieldCheck className="w-3 h-3 text-blue-400" /> Admin Approved Demo
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-950/60 text-amber-300 border-amber-700/60 text-[10px] font-mono">
                                Pending Verification
                              </Badge>
                            )}

                            {rec.status === "PENDING" && (
                              <Button
                                onClick={() => handleVerifyRecipient(rec.email)}
                                variant="outline"
                                size="sm"
                                className="text-[11px] h-7 px-2 text-emerald-400 border-emerald-700/60 bg-emerald-950/30 hover:bg-emerald-900/50 cursor-pointer"
                              >
                                Approve
                              </Button>
                            )}

                            <Button
                              onClick={() => handleRemoveRecipient(rec.email)}
                              variant="ghost"
                              size="sm"
                              className="text-[11px] h-7 px-2 text-[#64748B] hover:text-red-400 hover:bg-red-950/20 cursor-pointer"
                              title="Delete recipient"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. Test Notification Dispatch & Live Status */}
                <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-6 backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#223047] gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#F7F9FC]">Pipeline Verification & Test Dispatch</h3>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        Privileged operation to confirm that notifications reach responder inboxes and phone email applications.
                      </p>
                    </div>

                    <Button
                      onClick={handleSendTestEmail}
                      disabled={testSending || recipients.length === 0}
                      className="bg-[#F6821F] hover:bg-[#E85D04] text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-lg shadow-[#F6821F]/20 shrink-0 h-9 px-4"
                    >
                      {testSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send Test Email Alert
                    </Button>
                  </div>

                  {/* Feedback Banner */}
                  {testResult && (
                    <div
                      className={cn(
                        "mt-4 p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3",
                        testResult.status === "QUEUED" || testResult.status === "SENT"
                          ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                          : "bg-red-950/40 border-red-800/50 text-red-300"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {testResult.status === "QUEUED" || testResult.status === "SENT" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                      <span className="text-[11px] text-[#64748B] font-mono shrink-0">{testResult.timestamp}</span>
                    </div>
                  )}
                </div>

                {/* 5. Delivery Audit Trail & Incident Dispatch Log */}
                <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-6 backdrop-blur-md">
                  <div className="flex items-center justify-between pb-4 border-b border-[#223047]">
                    <div>
                      <h3 className="text-base font-bold text-[#F7F9FC]">Incident Delivery Audit Trail</h3>
                      <p className="text-xs text-[#94A3B8] mt-0.5">Immutable log of recent alert jobs, MTA provider confirmations, and retries.</p>
                    </div>
                    <Button
                      onClick={loadHistory}
                      variant="outline"
                      size="sm"
                      className="bg-[#121C2D] border-[#223047] text-[#94A3B8] hover:text-[#F7F9FC] text-xs gap-1.5 cursor-pointer h-8"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", historyLoading && "animate-spin text-[#F6821F]")} /> Refresh Log
                    </Button>
                  </div>

                  <div className="overflow-x-auto mt-4 rounded-lg border border-[#223047] overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#223047] text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider bg-[#080D17]">
                          <th className="py-2.5 px-3 font-mono">Job ID</th>
                          <th className="py-2.5 px-3">Event Type</th>
                          <th className="py-2.5 px-3">Severity</th>
                          <th className="py-2.5 px-3">Recipient</th>
                          <th className="py-2.5 px-3">Delivery State</th>
                          <th className="py-2.5 px-3 font-mono">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#223047]/60 font-mono text-[11px]">
                        {notificationHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#64748B] font-sans text-xs">
                              No recent alert dispatches recorded in database.
                            </td>
                          </tr>
                        ) : (
                          notificationHistory.map((job) => (
                            <tr key={job.id} className="hover:bg-[#121C2D]/50 transition-colors">
                              <td className="py-2.5 px-3 text-[#F7F9FC] font-semibold font-mono">{job.id.slice(0, 14)}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <span className="font-medium text-[#E2E8F0]">{job.event_type}</span>
                                {job.analysis_id && (
                                  <span className="text-[10px] text-[#64748B] block font-mono">Ref: {job.analysis_id}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                <Badge
                                  className={cn(
                                    "text-[10px] font-medium border font-mono",
                                    job.severity === "CRITICAL"
                                      ? "bg-red-950/60 text-red-400 border-red-700/60"
                                      : job.severity === "WARNING"
                                      ? "bg-amber-950/60 text-amber-400 border-amber-700/60"
                                      : "bg-blue-950/60 text-blue-400 border-blue-700/60"
                                  )}
                                >
                                  {job.severity}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-[#94A3B8]">{job.recipient_email}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <Badge
                                  className={cn(
                                    "text-[10px] font-medium border font-mono",
                                    job.status === "SENT"
                                      ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/60"
                                      : job.status === "SENDING" || job.status === "QUEUED"
                                      ? "bg-blue-950/60 text-blue-300 border-blue-700/60"
                                      : job.status === "SUPPRESSED"
                                      ? "bg-purple-950/60 text-purple-300 border-purple-700/60"
                                      : "bg-red-950/60 text-red-300 border-red-700/60"
                                  )}
                                >
                                  {job.status === "SENT" ? "Sent (Accepted)" : job.status}
                                </Badge>
                                {job.resend_message_id && (
                                  <span className="text-[10px] text-[#64748B] block font-mono">
                                    ID: {job.resend_message_id.slice(0, 16)}
                                  </span>
                                )}
                                {job.error_category && job.status === "FAILED" && (
                                  <span className="text-[10px] text-red-400 block font-mono">
                                    {job.error_category}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[#64748B] font-mono">{job.created_at}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 6. Legacy Quick Actions Card (Preserved) */}
                <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-6 backdrop-blur-md">
                  <h3 className="text-base font-bold text-[#F7F9FC] mb-1">Telephony Incident Automations</h3>
                  <p className="text-xs text-[#94A3B8] mb-4">Real-time telecommunications stream mitigation actions.</p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-[#223047]/60">
                      <div>
                        <p className="text-xs font-semibold text-[#F7F9FC]">Critical Alerts Only</p>
                        <p className="text-[11px] text-[#94A3B8]">Suppress warnings and only dispatch alerts for verified synthetic deepfakes</p>
                      </div>
                      <Toggle enabled={criticalOnly} onToggle={() => setCriticalOnly(!criticalOnly)} />
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#223047]/60">
                      <div>
                        <p className="text-xs font-semibold text-[#F7F9FC]">Slack Webhook Integration</p>
                        <p className="text-[11px] text-[#94A3B8]">Post immediate alerts to your dedicated incident response channel</p>
                      </div>
                      <Toggle enabled={slackAlerts} onToggle={() => setSlackAlerts(!slackAlerts)} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs font-semibold text-[#F7F9FC]">Auto-Block on Deepfake</p>
                        <p className="text-[11px] text-[#94A3B8]">Automatically terminate call audio when AASIST scores drop below threshold</p>
                      </div>
                      <Toggle enabled={autoBlock} onToggle={() => setAutoBlock(!autoBlock)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "api" && (
              <div className="space-y-6">
                {/* Main API Card */}
                <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-6 backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#223047] gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-[#F7F9FC]">API Credentials & Usage-Based Billing</h2>
                        {activeKey && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {activeKey.plan_tier.toUpperCase() === "FREE" || activeKey.plan_tier.toUpperCase() === "FREE_TRIAL"
                              ? "Free Sandbox (550 Tokens)"
                              : activeKey.plan_tier.toUpperCase() === "PRO"
                              ? "Developer Pro"
                              : "Enterprise SOC"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        Live audio stream analysis charged at <strong className="text-[#F6821F]">₹2.00 / Minute</strong>. 550 Free Starter Tokens included.
                      </p>
                    </div>

                    {!activeKey && (
                      <Button
                        onClick={handleOpenGenerateModal}
                        className="bg-[#F6821F] hover:bg-[#E85D04] text-white shadow-lg shadow-[#F6821F]/20 gap-2 cursor-pointer font-semibold text-xs h-9 px-4"
                      >
                        <Zap className="w-4 h-4" /> Activate Free API Key (550 Tokens)
                      </Button>
                    )}
                  </div>

                  {/* If no key generated yet */}
                  {!activeKey ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-[#121C2D] border border-[#223047] flex items-center justify-center text-[#F6821F] mb-4 shadow-xl">
                        <Key className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-bold text-[#F7F9FC] mb-1">No API Key Generated Yet</h3>
                      <p className="text-xs text-[#94A3B8] mb-6 leading-relaxed">
                        Activate your authenticated API credentials with <strong className="text-[#F7F9FC]">550 Free Starter Tokens</strong> and <strong className="text-[#F7F9FC]">15 Free Audio Minutes</strong>. Stream audio to `/api/analyze/live` with usage billing at <strong className="text-[#F6821F]">₹2.00 / minute</strong>.
                      </p>
                      <Button
                        onClick={handleOpenGenerateModal}
                        className="bg-[#F6821F] hover:bg-[#E85D04] text-white shadow-lg shadow-[#F6821F]/20 gap-2 cursor-pointer text-xs font-semibold py-2.5 px-5 h-9"
                      >
                        <Zap className="w-4 h-4" /> Get Free API Key (550 Tokens)
                      </Button>
                    </div>
                  ) : (
                    /* Active Key UI */
                    <div className="pt-5 space-y-6">
                      {/* Key Value with Show/Hide & Copy */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider font-mono">Active SOC API Key</label>
                          <span className="text-[11px] text-[#64748B] font-mono">Header: x-api-key or Bearer</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              readOnly
                              value={
                                showKeySecret
                                  ? activeKey.key
                                  : `${activeKey.key.slice(0, 10)}${"•".repeat(24)}`
                              }
                              className="w-full px-3.5 py-2.5 bg-[#121C2D] border border-[#223047] rounded-lg text-sm font-mono text-[#F7F9FC] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKeySecret(!showKeySecret)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#F7F9FC] cursor-pointer"
                              title={showKeySecret ? "Hide key" : "Reveal key"}
                            >
                              {showKeySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#F6821F]" />}
                            </button>
                          </div>
                          <Button
                            type="button"
                            onClick={handleCopyKey}
                            variant="outline"
                            className="shrink-0 gap-1.5 bg-[#121C2D] border-[#223047] text-[#E2E8F0] hover:text-[#F6821F] hover:border-[#384D6B] cursor-pointer h-10 px-3"
                          >
                            {keyCopied ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-400 font-medium text-xs">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 text-[#64748B]" />
                                <span className="text-xs font-medium">Copy Key</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Usage-Based Billing Dashboard Cards */}
                      <div className="grid sm:grid-cols-3 gap-4">
                        {/* Audio Streaming Minutes Card */}
                        <div className="p-4 bg-[#121C2D]/60 border border-[#F6821F]/30 rounded-xl relative overflow-hidden">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#94A3B8] uppercase tracking-wider font-mono">
                              <Clock className="w-4 h-4 text-[#F6821F]" />
                              <span>Audio Streaming</span>
                            </div>
                            <Badge className="bg-[#F6821F]/10 text-[#F6821F] border border-[#F6821F]/30 text-[10px] font-mono">
                              ₹{activeKey.rate_per_min_inr?.toFixed(2) || "2.00"} / Min
                            </Badge>
                          </div>
                          <div className="mt-1">
                            <span className="text-2xl font-black font-mono text-[#F7F9FC]">
                              {(activeKey.minutes_remaining ?? 15.0).toFixed(1)}
                            </span>
                            <span className="text-xs text-[#94A3B8] font-medium ml-1.5">Minutes Available</span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-2 font-mono">
                            Billed per-minute for live call streams & audio uploads.
                          </p>
                        </div>

                        {/* Token Balance Card */}
                        <div className="p-4 bg-[#121C2D]/60 border border-amber-800/40 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#94A3B8] uppercase tracking-wider font-mono">
                              <Coins className="w-4 h-4 text-amber-400" />
                              <span>Token Quota</span>
                            </div>
                            <span className="text-[10px] text-[#64748B] font-mono">
                              ~10 tokens/op
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className="text-2xl font-black font-mono text-amber-400">
                              {activeKey.tokens_remaining.toLocaleString()}
                            </span>
                            <span className="text-xs text-[#64748B] font-mono ml-1.5">
                              / {activeKey.tokens_total.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-2 font-mono">
                            Used for NLP intent scanning and threat classification.
                          </p>
                        </div>

                        {/* Wallet Balance Card */}
                        <div className="p-4 bg-[#121C2D]/60 border border-emerald-800/40 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#94A3B8] uppercase tracking-wider font-mono">
                              <Wallet className="w-4 h-4 text-emerald-400" />
                              <span>Wallet Balance</span>
                            </div>
                            <Badge className="bg-emerald-950/60 text-emerald-300 border-emerald-700/60 text-[10px] font-mono">
                              Prepaid INR
                            </Badge>
                          </div>
                          <div className="mt-1">
                            <span className="text-2xl font-black font-mono text-emerald-400">
                              ₹{(activeKey.balance_inr ?? 0.0).toFixed(2)}
                            </span>
                            <span className="text-xs text-emerald-400/80 font-medium ml-1.5 font-mono">INR</span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-2 font-mono">
                            Direct credit applied for overage streaming.
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => {
                              setTopupTab("minutes");
                              setTopupStep("SELECT");
                              setTopupPaymentError(null);
                              setShowTopupModal(true);
                            }}
                            className="bg-[#F6821F] hover:bg-[#E85D04] text-white shadow-lg shadow-[#F6821F]/20 gap-1.5 cursor-pointer text-xs font-semibold h-9 px-3.5"
                          >
                            <Clock className="w-4 h-4" /> Recharge Minutes (₹2/Min)
                          </Button>
                          <Button
                            onClick={() => {
                              setTopupTab("tokens");
                              setTopupStep("SELECT");
                              setTopupPaymentError(null);
                              setShowTopupModal(true);
                            }}
                            variant="outline"
                            className="bg-[#121C2D] border-[#223047] text-[#E2E8F0] hover:border-[#F6821F] shadow-sm gap-1.5 cursor-pointer text-xs h-9 px-3.5"
                          >
                            <Coins className="w-4 h-4 text-amber-400" /> Buy Tokens (₹)
                          </Button>
                          <Button
                            onClick={handleOpenGenerateModal}
                            variant="outline"
                            className="bg-[#121C2D] border-[#223047] text-[#94A3B8] hover:text-[#F7F9FC] text-xs gap-1.5 cursor-pointer h-9 px-3"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" /> Switch Plan
                          </Button>
                        </div>
                        <Button
                          onClick={handleRevokeKey}
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/20 text-xs gap-1.5 cursor-pointer h-9 px-3"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Revoke Key
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Business Model Tier Breakdown & Feature Comparison */}
                <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-6 backdrop-blur-md">
                  <div className="mb-5">
                    <h3 className="text-base font-bold text-[#F7F9FC]">SaaS Business Model & Feature Entitlements</h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Clear operational capabilities and quotas by plan tier in Indian Rupees (₹).
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Free Plan Summary */}
                    <div className="p-4 rounded-xl border border-[#223047] bg-[#121C2D]/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider font-mono">Free Plan</span>
                          <Badge variant="outline" className="text-[10px] bg-[#080D17] text-[#94A3B8] border-[#223047]">₹0 Forever</Badge>
                        </div>
                        <div className="text-lg font-black text-[#F7F9FC] font-mono mb-2">
                          550 Tokens
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mb-3">
                          15 Audio Minutes Free • Pay-As-You-Go: <strong className="text-[#F6821F]">₹2.00 / Min</strong>
                        </p>
                        <div className="space-y-1.5 text-xs text-[#94A3B8]">
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> 1 Enrolled Target Voiceprint
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Core AASIST Voice Authenticity
                          </div>
                          <div className="flex items-center gap-1.5 text-[#64748B]">
                            <Lock className="w-3.5 h-3.5 text-[#64748B]" /> Multi-Speaker Matching Locked
                          </div>
                          <div className="flex items-center gap-1.5 text-[#64748B]">
                            <Lock className="w-3.5 h-3.5 text-[#64748B]" /> Auto-Block Webhooks Locked
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pro Plan Summary */}
                    <div className="p-4 rounded-xl border-2 border-[#F6821F]/60 bg-[#0D1422] flex flex-col justify-between relative shadow-xl shadow-[#F6821F]/10">
                      <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#F6821F] text-white">
                        Popular
                      </span>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#F6821F] uppercase tracking-wider font-mono">Developer Pro</span>
                          <span className="text-xs font-bold text-[#F7F9FC] font-mono">₹499 / Mo</span>
                        </div>
                        <div className="text-lg font-black text-[#F7F9FC] font-mono mb-2">
                          10,000 Tokens + 150 Mins
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mb-3">
                          Included Quota • Additional Audio: <strong className="text-[#F6821F]">₹2.00 / Min</strong>
                        </p>
                        <div className="space-y-1.5 text-xs text-[#94A3B8]">
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Up to 15 Enrolled Voiceprints
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> ECAPA-TDNN 192-dim Verification
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Auto-Block & Webhook Telemetry
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Priority Processing Queue (&lt;20ms)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enterprise Plan Summary */}
                    <div className="p-4 rounded-xl border border-indigo-900/50 bg-[#121C2D]/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">Enterprise SOC</span>
                          <span className="text-xs font-bold text-[#F7F9FC] font-mono">₹2,999 / Mo</span>
                        </div>
                        <div className="text-lg font-black text-[#F7F9FC] font-mono mb-2">
                          50,000 Tokens + 1,000 Mins
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mb-3">
                          Discounted Overage Rate: <strong className="text-indigo-400">₹1.50 / Min</strong>
                        </p>
                        <div className="space-y-1.5 text-xs text-[#E2E8F0]">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> ALL FEATURES UNLOCKED
                          </div>
                          <div className="flex items-center gap-1.5 text-indigo-300">
                            <Check className="w-3.5 h-3.5 text-indigo-400" /> Unlimited Enrolled Profiles
                          </div>
                          <div className="flex items-center gap-1.5 text-indigo-300">
                            <Check className="w-3.5 h-3.5 text-indigo-400" /> Dedicated Zero-Wait Pipeline
                          </div>
                          <div className="flex items-center gap-1.5 text-indigo-300">
                            <Check className="w-3.5 h-3.5 text-indigo-400" /> Forensic Incident PDF Dossiers
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Webhook Endpoint Configuration */}
                <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-6 backdrop-blur-md">
                  <h3 className="text-base font-bold text-[#F7F9FC] mb-1">Webhook Endpoint URL</h3>
                  <p className="text-xs text-[#94A3B8] mb-4">
                    External telemetry endpoint where AMVTF dispatches real-time synthetic deepfake alerts and verdicts.
                  </p>
                  <div>
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#121C2D] border border-[#223047] rounded-lg text-sm font-mono text-[#F7F9FC] focus:outline-none focus:border-[#F6821F] transition-colors"
                      placeholder="https://your-api.com/webhooks/voice-alerts"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "general" && (
              <div className="cyber-panel bg-[#0D1422]/90 border border-[#223047] rounded-xl shadow-xl p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#F6821F]/10 text-[#F6821F] border border-[#F6821F]/30">
                    <Globe className="w-3 h-3 text-[#F6821F]" /> Architecture Spec
                  </span>
                  <span className="text-[#64748B] text-xs font-mono">•</span>
                  <span className="text-[#94A3B8] text-xs font-mono">AMVTF v2.4 Engine</span>
                </div>
                <h2 className="text-lg font-bold text-[#F7F9FC] tracking-tight mb-1">AMVTF Engine Architecture</h2>
                <p className="text-xs text-[#94A3B8] mb-6">Real-time system intelligence specifications and neural framework mapping.</p>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-[#121C2D] rounded-xl border border-[#223047]">
                    <span className="font-semibold text-[#64748B] block font-mono text-[11px] uppercase">Backend Framework</span>
                    <span className="font-bold text-[#F7F9FC] text-sm font-mono">Python 3.11 / FastAPI / Uvicorn</span>
                  </div>
                  <div className="p-3.5 bg-[#121C2D] rounded-xl border border-[#223047]">
                    <span className="font-semibold text-[#64748B] block font-mono text-[11px] uppercase">Database Storage</span>
                    <span className="font-bold text-[#F7F9FC] text-sm font-mono">Cloud PostgreSQL (Supabase) / SQLite</span>
                  </div>
                  <div className="p-3.5 bg-[#121C2D] rounded-xl border border-[#223047]">
                    <span className="font-semibold text-[#64748B] block font-mono text-[11px] uppercase">Authenticity Engine</span>
                    <span className="font-bold text-emerald-400 text-sm font-mono">Multi-Platform AASIST Live Classifier</span>
                  </div>
                  <div className="p-3.5 bg-[#121C2D] rounded-xl border border-[#223047]">
                    <span className="font-semibold text-[#64748B] block font-mono text-[11px] uppercase">Speaker Identity</span>
                    <span className="font-bold text-[#F7F9FC] text-sm font-mono">ECAPA-TDNN 192-dim Cosine Match</span>
                  </div>
                  <div className="p-3.5 bg-[#121C2D] rounded-xl border border-[#223047]">
                    <span className="font-semibold text-[#64748B] block font-mono text-[11px] uppercase">Context Engine</span>
                    <span className="font-bold text-[#F7F9FC] text-sm font-mono">DistilBERT Intent Classifier</span>
                  </div>
                  <div className="p-3.5 bg-[#121C2D] rounded-xl border border-[#223047]">
                    <span className="font-semibold text-[#64748B] block font-mono text-[11px] uppercase">Pay-As-You-Go Billing</span>
                    <span className="font-bold text-[#F6821F] text-sm font-mono">₹2.00 / Minute (Audio Streams)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── MODAL 1: PLAN SELECTION & CHECKOUT MODAL (INR ONLY) ─── */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0D1422] rounded-2xl shadow-2xl border border-[#223047] w-full max-w-2xl overflow-hidden relative text-[#F7F9FC]">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#1E293B] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F7F9FC]">
                  {checkoutStep === "SELECT" && "Select API Key Plan"}
                  {checkoutStep === "COLLECT" && `Initiate UPI Collect — ₹${selectedPlan === "PRO" ? "499.00" : "2,999.00"}`}
                  {checkoutStep === "VERIFY_UTR" && "Approve UPI Payment & Verify UTR"}
                  {checkoutStep === "RECEIPT" && "Official Payment Receipt & Activation"}
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {checkoutStep === "SELECT" && "All amounts in Indian Rupees (₹). 15 Audio Mins Free • Ongoing usage ₹2.00/min."}
                  {checkoutStep === "COLLECT" && "Dispatches a live UPI collect request to your Google Pay, PhonePe, or Paytm app"}
                  {checkoutStep === "VERIFY_UTR" && "Approve payment on your phone, then verify your 12-digit bank UTR receipt"}
                  {checkoutStep === "RECEIPT" && "Payment verified! Credentials, tokens, and 15 free audio minutes are active."}
                </p>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#F7F9FC] rounded-lg hover:bg-[#121C2D] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {paymentError && (
                <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* STEP 1: PLAN SELECTION TIERS */}
              {checkoutStep === "SELECT" && (
                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Free Sandbox Plan Card */}
                  <div className="border border-[#223047] rounded-xl p-4 flex flex-col justify-between hover:border-[#334155] transition-all bg-[#121C2D]/60">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#223047] text-[#94A3B8] mb-2 font-mono">
                        Free Sandbox
                      </span>
                      <h4 className="text-base font-bold text-[#F7F9FC]">Free Plan</h4>
                      <div className="mt-2 mb-3">
                        <span className="text-2xl font-black text-[#F7F9FC]">₹0</span>
                        <span className="text-xs text-[#94A3B8]"> / forever</span>
                      </div>
                      <div className="p-2 bg-[#080D17] rounded-lg border border-[#223047] mb-3 text-center">
                        <span className="text-sm font-extrabold text-[#F6821F] font-mono">550 Free Tokens</span>
                        <span className="text-[10px] text-[#94A3B8] block">15 Audio Mins Free • ₹2/Min</span>
                      </div>
                      <ul className="text-[11px] text-[#94A3B8] space-y-1.5 mb-4">
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Standard AASIST GNN
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 1 Voiceprint Profile
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Instant Activation
                        </li>
                      </ul>
                    </div>
                    <Button
                      onClick={() => handleSelectPlan("FREE")}
                      disabled={isProcessing}
                      variant="outline"
                      className="w-full text-xs font-semibold cursor-pointer border-[#223047] text-[#F7F9FC] hover:bg-[#1E293B]"
                    >
                      {isProcessing && selectedPlan === "FREE" ? "Activating..." : "Activate Free (550 Tokens)"}
                    </Button>
                  </div>

                  {/* Pro Plan Card */}
                  <div className="border-2 border-[#F6821F] rounded-xl p-4 flex flex-col justify-between hover:shadow-lg hover:shadow-[#F6821F]/10 transition-all relative bg-[#F6821F]/5">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F6821F] text-white shadow-sm font-mono">
                      Most Popular
                    </span>
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F6821F]/20 text-[#F6821F] mb-2 mt-1 font-mono">
                        Telephony Pro
                      </span>
                      <h4 className="text-base font-bold text-[#F7F9FC]">Developer Pro</h4>
                      <div className="mt-2 mb-3">
                        <span className="text-2xl font-black text-[#F7F9FC]">₹499</span>
                        <span className="text-xs text-[#94A3B8]"> / month</span>
                      </div>
                      <div className="p-2 bg-[#080D17] rounded-lg border border-[#F6821F]/30 mb-3 text-center shadow-xs">
                        <span className="text-sm font-extrabold text-[#F6821F] font-mono">10,000 Tokens</span>
                        <span className="text-[10px] text-[#94A3B8] block">150 Audio Mins Included</span>
                      </div>
                      <ul className="text-[11px] text-[#94A3B8] space-y-1.5 mb-4">
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Priority Queue (&lt;20ms)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Up to 15 Voiceprints
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Auto-Block & Webhooks
                        </li>
                      </ul>
                    </div>
                    <Button
                      onClick={() => handleSelectPlan("PRO")}
                      className="w-full text-xs font-semibold bg-[#F6821F] hover:bg-[#E85D04] text-white shadow-md shadow-[#F6821F]/20 cursor-pointer"
                    >
                      Choose Pro (₹499)
                    </Button>
                  </div>

                  {/* Enterprise Plan Card */}
                  <div className="border border-indigo-500/30 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/60 transition-all bg-indigo-950/20">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 mb-2 font-mono">
                        Enterprise
                      </span>
                      <h4 className="text-base font-bold text-[#F7F9FC]">Enterprise SOC</h4>
                      <div className="mt-2 mb-3">
                        <span className="text-2xl font-black text-[#F7F9FC]">₹2,999</span>
                        <span className="text-xs text-[#94A3B8]"> / month</span>
                      </div>
                      <div className="p-2 bg-[#080D17] rounded-lg border border-indigo-500/30 mb-3 text-center">
                        <span className="text-sm font-extrabold text-indigo-400 font-mono">50,000 Tokens</span>
                        <span className="text-[10px] text-[#94A3B8] block">1,000 Mins Included (₹1.50/min)</span>
                      </div>
                      <ul className="text-[11px] text-[#94A3B8] space-y-1.5 mb-4">
                        <li className="flex items-center gap-1.5 font-semibold text-emerald-400">
                          <Check className="w-3.5 h-3.5 shrink-0" /> ALL FEATURES UNLOCKED
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Unlimited Voiceprints
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Forensic Dossier PDFs
                        </li>
                      </ul>
                    </div>
                    <Button
                      onClick={() => handleSelectPlan("ENTERPRISE")}
                      variant="outline"
                      className="w-full text-xs font-semibold cursor-pointer border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/50"
                    >
                      Choose Enterprise (₹2,999)
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: UPI COLLECT REQUEST DISPATCH FORM */}
              {checkoutStep === "COLLECT" && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F6821F]/10 border border-[#F6821F]/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#F7F9FC] block">
                        {selectedPlan === "PRO" ? "Developer Pro (10,000 Tokens + 150 Mins)" : "Enterprise SOC (50,000 Tokens + 1,000 Mins)"}
                      </span>
                      <span className="text-xs text-[#94A3B8]">
                        🎁 First 15 Audio Mins Free • Ongoing usage ₹{selectedPlan === "PRO" ? "2.00" : "1.50"} / min
                      </span>
                    </div>
                    <span className="text-2xl font-black font-mono text-[#F6821F]">
                      ₹{selectedPlan === "PRO" ? "499.00" : "2,999.00"}
                    </span>
                  </div>

                  <div className="p-4 bg-[#121C2D] border border-[#223047] rounded-xl space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-[#F7F9FC] block mb-1">
                        Payer Full Name / Organization <span className="text-[#64748B] font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        placeholder="e.g. Mahesh Kumar (SecOps Lead)"
                        className="w-full px-3 py-2 bg-[#080D17] border border-[#223047] rounded-md text-xs text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#F7F9FC] block mb-1">
                        Account Email Address <span className="text-[#F6821F]">*</span>
                      </label>
                      <input
                        type="email"
                        value={payerEmail}
                        onChange={(e) => setPayerEmail(e.target.value)}
                        placeholder="e.g. mahesh@organization.com (Credentials will be sent here)"
                        className="w-full px-3 py-2 bg-[#080D17] border border-[#223047] rounded-md text-xs text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#F7F9FC] block mb-1">
                        Your UPI ID / VPA <span className="text-[#F6821F]">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => { setUpiId(e.target.value); setPaymentError(null); }}
                          placeholder="e.g. username@okhdfcbank or 9876543210@paytm"
                          className="w-full px-3 py-2 pl-9 bg-[#080D17] border border-[#223047] rounded-md text-xs font-mono text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F]"
                        />
                        <Smartphone className="w-4 h-4 text-[#64748B] absolute left-2.5 top-2.5" />
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-1 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        Collect request will be dispatched to Google Pay, PhonePe, Paytm, or BHIM.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { setCheckoutStep("SELECT"); setPaymentError(null); }}
                      className="text-xs text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#121C2D] cursor-pointer"
                    >
                      &larr; Back to Plans
                    </Button>
                    <Button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleSendUpiCollectRequest}
                      className="bg-[#F6821F] hover:bg-[#E85D04] text-white shadow-md shadow-[#F6821F]/20 gap-2 cursor-pointer text-xs py-2 px-5"
                    >
                      {isProcessing ? (
                        <span>Dispatching Collect Request...</span>
                      ) : (
                        <span>Send UPI Collect Request (₹{selectedPlan === "PRO" ? "499.00" : "2,999.00"}) &rarr;</span>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: AWAITING UPI APPROVAL & UTR CONFIRMATION */}
              {checkoutStep === "VERIFY_UTR" && activePaymentOrder && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#F6821F] animate-ping mt-1 shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold text-amber-200">UPI Collect Request Active</h5>
                      <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                        A payment request of <b>₹{activePaymentOrder.amount_inr.toFixed(2)}</b> was sent to <b>{activePaymentOrder.payer_upi_id}</b>.
                        Please open your UPI app and approve payment to <b>{activePaymentOrder.merchant_vpa}</b>.
                      </p>
                    </div>
                  </div>

                  {/* QR Code & Direct Payment Info */}
                  <div className="grid sm:grid-cols-2 gap-4 p-4 bg-[#121C2D] border border-[#223047] rounded-xl items-center">
                    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-gray-200 shadow-xs text-center">
                      <div className="p-2 bg-white rounded border border-gray-100 mb-2">
                        <QRCodeSVG value={activePaymentOrder.upi_intent_uri} size={130} level="M" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-700 font-mono">Scan via GPay / PhonePe / Paytm</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] block font-mono">Merchant VPA</span>
                        <div className="flex items-center justify-between font-mono font-bold text-[#F7F9FC] bg-[#080D17] px-2.5 py-1.5 rounded border border-[#223047]">
                          <span>{activePaymentOrder.merchant_vpa}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(activePaymentOrder.merchant_vpa, "vpa")}
                            className="text-[#64748B] hover:text-[#F6821F] p-0.5"
                            title="Copy UPI ID"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] block font-mono">Order Reference</span>
                        <span className="font-mono text-[#94A3B8] block">{activePaymentOrder.order_id}</span>
                      </div>

                      <div className="pt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] block font-mono">Approval Window</span>
                        <span className="text-sm font-mono font-extrabold text-[#F6821F]">
                          ⏱ {Math.floor(countdownSeconds / 60)}:{(countdownSeconds % 60).toString().padStart(2, "0")} Remaining
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 12-Digit Bank UTR Input */}
                  <div className="p-4 bg-[#121C2D] border-2 border-[#F6821F]/40 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-[#F7F9FC] flex items-center justify-between">
                      <span>Enter 12-Digit Bank Reference (UTR) Number</span>
                      <span className="text-[10px] text-[#64748B] font-normal">Found in UPI App receipt / SMS</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={utrNumber}
                        onChange={(e) => { setUtrNumber(e.target.value.trim()); setPaymentError(null); }}
                        placeholder="e.g. 425519827103"
                        className="w-full px-3 py-2 bg-[#080D17] border border-[#223047] rounded-md text-xs font-mono font-bold tracking-wider text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F]"
                      />
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Demo / testing reference: <span className="font-mono font-bold text-[#F7F9FC]">425519827103</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCheckoutStep("COLLECT")}
                      className="text-xs text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#121C2D] cursor-pointer"
                    >
                      &larr; Modify UPI ID
                    </Button>
                    <Button
                      type="button"
                      disabled={isVerifyingPayment || !utrNumber.trim()}
                      onClick={handleVerifyUtr}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2 cursor-pointer text-xs py-2 px-6 font-bold"
                    >
                      {isVerifyingPayment ? (
                        <span>Verifying Bank UTR...</span>
                      ) : (
                        <span>Verify Payment & Grant Access &rarr;</span>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4: OFFICIAL ACTIVATION RECEIPT */}
              {checkoutStep === "RECEIPT" && activationResult && (
                <div className="space-y-4">
                  {/* Verified Header */}
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300">Payment Verified & Key Issued!</h4>
                      <p className="text-xs text-emerald-400/80 mt-0.5">
                        ₹{activePaymentOrder?.amount_inr.toFixed(2)} received via UPI (UTR: {activationResult.utr_reference}).
                      </p>
                    </div>
                  </div>

                  {/* Provisioned User Credentials (If generated) */}
                  {activationResult.user_credentials && (
                    <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Account Login Credentials Provisioned
                        </span>
                        <span className="text-[10px] text-indigo-400 font-semibold font-mono">Save These Credentials</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2 bg-[#080D17] rounded border border-[#223047]">
                          <span className="text-[10px] text-[#64748B] block font-sans">Username</span>
                          <span className="font-bold text-[#F7F9FC]">{activationResult.user_credentials.username}</span>
                        </div>
                        <div className="p-2 bg-[#080D17] rounded border border-[#223047] flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-[#64748B] block font-sans">Temporary Password</span>
                            <span className="font-bold text-[#F7F9FC]">{activationResult.user_credentials.temp_password}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(activationResult?.user_credentials?.temp_password || "", "password")}
                            className="text-[#64748B] hover:text-[#F7F9FC] p-1"
                            title="Copy Password"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Issued Active API Key */}
                  <div className="p-4 bg-[#121C2D] border border-[#223047] rounded-xl space-y-2">
                    <span className="text-xs font-bold text-[#F7F9FC] flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#F6821F]" /> Active {activationResult.api_key.plan_tier} Integration Key
                    </span>
                    <div className="flex items-center justify-between bg-[#080D17] px-3 py-2 rounded-lg border border-[#223047] font-mono text-xs text-[#F7F9FC]">
                      <span className="truncate mr-2">{activationResult.api_key.key}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(activationResult.api_key.key, "key")}
                        className="text-[#64748B] hover:text-[#F6821F] shrink-0 p-1 cursor-pointer"
                        title="Copy Key"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Free Usage & Overage Billing Policy Callout */}
                  <div className="p-3.5 bg-[#F6821F]/10 border border-[#F6821F]/30 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#F7F9FC]">
                      <Sparkles className="w-4 h-4 text-[#F6821F]" />
                      <span>15 Audio Minutes Free Included</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                      Your plan includes <b>15.0 minutes of initial audio streaming free of charge</b>. Ongoing usage beyond your included minutes is charged at <b>₹{activationResult.overage_rate_per_min_inr.toFixed(2)} / minute</b>.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowPlanModal(false);
                        setCheckoutStep("SELECT");
                      }}
                      className="w-full bg-[#F6821F] hover:bg-[#E85D04] text-white shadow-md shadow-[#F6821F]/20 text-xs py-2.5 font-bold cursor-pointer"
                    >
                      Complete & Continue to Dashboard
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: RECHARGE MODAL (REAL UPI COLLECT & UTR VERIFICATION) ─── */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0D1422] rounded-2xl shadow-2xl border border-[#223047] w-full max-w-lg overflow-hidden relative text-[#F7F9FC]">
            <div className="p-5 border-b border-[#1E293B] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F7F9FC]">
                  {topupStep === "SELECT" && "Recharge Quota (Indian Rupees)"}
                  {topupStep === "COLLECT" && `UPI Collect — ₹${topupTab === "minutes" ? selectedMinutesTopup.price_inr : selectedTokensTopup.price_inr}`}
                  {topupStep === "VERIFY_UTR" && `Confirm Payment — ₹${topupPaymentOrder?.amount_inr.toFixed(2)}`}
                  {topupStep === "SUCCESS" && "Recharge Credited!"}
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {topupStep === "SELECT" && "Select audio streaming minutes (₹2/min) or token recharge packs"}
                  {topupStep === "COLLECT" && "Send a real payment collect request to your UPI App"}
                  {topupStep === "VERIFY_UTR" && "Scan QR or approve in UPI app, then submit 12-digit bank UTR"}
                  {topupStep === "SUCCESS" && "Your active balance has been verified and updated in database"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTopupModal(false);
                  setTopupStep("SELECT");
                }}
                className="p-1.5 text-[#94A3B8] hover:text-[#F7F9FC] rounded-lg hover:bg-[#121C2D] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* STEP 1: SELECT PACKAGE */}
              {topupStep === "SELECT" && (
                <>
                  {/* Tab Selector: Minutes vs Tokens */}
                  <div className="flex rounded-lg bg-[#121C2D] border border-[#223047] p-1">
                    <button
                      type="button"
                      onClick={() => setTopupTab("minutes")}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                        topupTab === "minutes"
                          ? "bg-[#080D17] text-[#F7F9FC] border border-[#F6821F]/30 shadow-xs"
                          : "text-[#94A3B8] hover:text-[#F7F9FC]"
                      )}
                    >
                      <Clock className="w-3.5 h-3.5 text-[#F6821F]" /> Audio Minutes (₹2/Min)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopupTab("tokens")}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                        topupTab === "tokens"
                          ? "bg-[#080D17] text-[#F7F9FC] border border-amber-500/30 shadow-xs"
                          : "text-[#94A3B8] hover:text-[#F7F9FC]"
                      )}
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-500" /> Token Quota (₹)
                    </button>
                  </div>

                  {/* Minutes Packs */}
                  {topupTab === "minutes" && (
                    <div className="space-y-2.5">
                      {[
                        { minutes: 50, price_inr: 100, label: "50 Audio Minutes (₹2.00 / Min)" },
                        { minutes: 125, price_inr: 250, label: "125 Audio Minutes (₹2.00 / Min)" },
                        { minutes: 250, price_inr: 500, label: "250 Audio Minutes (₹2.00 / Min)" },
                        { minutes: 500, price_inr: 1000, label: "500 Audio Minutes (₹2.00 / Min)" },
                      ].map((pack) => (
                        <div
                          key={pack.minutes}
                          onClick={() => setSelectedMinutesTopup(pack)}
                          className={cn(
                            "p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                            selectedMinutesTopup.minutes === pack.minutes
                              ? "border-[#F6821F] bg-[#F6821F]/10 shadow-xs"
                              : "border-[#223047] bg-[#121C2D]/50 hover:border-[#334155]"
                          )}
                        >
                          <div>
                            <span className="text-sm font-bold text-[#F7F9FC] font-mono block">
                              +{pack.minutes} Audio Minutes
                            </span>
                            <span className="text-[11px] text-[#94A3B8]">{pack.label}</span>
                          </div>
                          <span className="text-base font-extrabold text-[#F6821F] font-mono">₹{pack.price_inr}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Token Packs */}
                  {topupTab === "tokens" && (
                    <div className="space-y-2.5">
                      {[
                        { tokens: 1000, price_inr: 10, label: "Starter Refill (₹0.01 / Token)" },
                        { tokens: 5000, price_inr: 49, label: "Growth Pack (Best Value)" },
                        { tokens: 15000, price_inr: 129, label: "Developer Bundle" },
                        { tokens: 50000, price_inr: 399, label: "Enterprise Scale Pack" },
                      ].map((pack) => (
                        <div
                          key={pack.tokens}
                          onClick={() => setSelectedTokensTopup(pack)}
                          className={cn(
                            "p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                            selectedTokensTopup.tokens === pack.tokens
                              ? "border-[#F6821F] bg-[#F6821F]/10 shadow-xs"
                              : "border-[#223047] bg-[#121C2D]/50 hover:border-[#334155]"
                          )}
                        >
                          <div>
                            <span className="text-sm font-bold text-[#F7F9FC] font-mono block">
                              +{pack.tokens.toLocaleString()} Tokens
                            </span>
                            <span className="text-[11px] text-[#94A3B8]">{pack.label}</span>
                          </div>
                          <span className="text-base font-extrabold text-[#F7F9FC] font-mono">₹{pack.price_inr}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      setTopupPaymentError(null);
                      setTopupStep("COLLECT");
                    }}
                    className="w-full bg-[#F6821F] hover:bg-[#E85D04] text-white shadow-md shadow-[#F6821F]/20 text-xs font-semibold py-2.5 cursor-pointer mt-2"
                  >
                    Proceed to UPI Payment — ₹{topupTab === "minutes" ? selectedMinutesTopup.price_inr : selectedTokensTopup.price_inr} &rarr;
                  </Button>
                </>
              )}

              {/* STEP 2: DISPATCH REAL UPI COLLECT REQUEST */}
              {topupStep === "COLLECT" && (
                <div className="space-y-4">
                  {/* Summary Box */}
                  <div className="p-3.5 bg-[#F6821F]/10 border border-[#F6821F]/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#F7F9FC] block">
                        {topupTab === "minutes"
                          ? `+${selectedMinutesTopup.minutes} Audio Streaming Minutes`
                          : `+${selectedTokensTopup.tokens.toLocaleString()} Security Analysis Tokens`}
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">
                        {topupTab === "minutes" ? "Usage rate: ₹2.00 / Min" : "API Operations Units"}
                      </span>
                    </div>
                    <span className="text-xl font-black font-mono text-[#F6821F]">
                      ₹{topupTab === "minutes" ? selectedMinutesTopup.price_inr : selectedTokensTopup.price_inr}.00
                    </span>
                  </div>

                  {/* UPI ID Input Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-[#F7F9FC] block mb-1">
                        Payer Name <span className="text-[#64748B] font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={topupPayerName}
                        onChange={(e) => setTopupPayerName(e.target.value)}
                        placeholder="e.g. Alex Kumar"
                        className="w-full px-3 py-2 bg-[#080D17] border border-[#223047] rounded-lg text-xs text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#F7F9FC] block mb-1">
                        Enter Your UPI ID (VPA) <span className="text-[#F6821F]">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={topupUpiId}
                          onChange={(e) => {
                            setTopupUpiId(e.target.value.trim());
                            setTopupPaymentError(null);
                          }}
                          placeholder="e.g. alex@okaxis, 9876543210@paytm, name@okhdfcbank"
                          className="w-full px-3 py-2 bg-[#080D17] border border-[#223047] rounded-lg text-xs font-mono text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F]"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#94A3B8]">
                        <Smartphone className="w-3.5 h-3.5 text-[#F6821F]" />
                        <span>Supports Google Pay, PhonePe, Paytm, BHIM, and any Indian bank UPI.</span>
                      </div>
                    </div>
                  </div>

                  {/* Authentic Payment Verification Notice */}
                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs flex items-start gap-2 text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                      <b>Strict Payment Enforcement:</b> We dispatch an authentic collect request to your UPI app. Balance and tokens are <b>only credited</b> after your payment is completed and verified via Bank UTR reference.
                    </p>
                  </div>

                  {topupPaymentError && (
                    <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                      <span>{topupPaymentError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setTopupStep("SELECT")}
                      className="text-xs text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#121C2D] cursor-pointer"
                    >
                      &larr; Back to Packs
                    </Button>
                    <Button
                      type="button"
                      disabled={topupProcessing || !topupUpiId.trim()}
                      onClick={handleSendTopupUpiCollect}
                      className="bg-[#F6821F] hover:bg-[#E85D04] text-white shadow-md shadow-[#F6821F]/20 text-xs py-2 px-5 font-bold cursor-pointer gap-2"
                    >
                      {topupProcessing ? (
                        <span>Sending UPI Request...</span>
                      ) : (
                        <span>Dispatch UPI Collect Request &rarr;</span>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: DYNAMIC QR & BANK UTR VERIFICATION */}
              {topupStep === "VERIFY_UTR" && topupPaymentOrder && (
                <div className="space-y-4">
                  {/* Live Collect Status Banner */}
                  <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                      <div>
                        <span className="text-xs font-bold text-blue-200 block">Collect Request Dispatched</span>
                        <span className="text-[11px] text-blue-300/80 font-mono">To: {topupPaymentOrder.payer_upi_id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold font-mono text-blue-200 bg-blue-900/50 px-2 py-1 rounded border border-blue-500/30">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>
                        0{Math.floor(topupCountdown / 60)}:{(topupCountdown % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Scannable Dynamic UPI QR Code */}
                  <div className="p-4 bg-[#121C2D] border border-[#223047] rounded-xl flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-bold text-[#F7F9FC] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-[#F6821F]" /> Scan with Any UPI App to Pay
                    </span>
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                      <QRCodeSVG
                        value={topupPaymentOrder.upi_intent_uri}
                        size={150}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="mt-2 text-xs text-[#94A3B8] font-medium">
                      Amount: <span className="font-bold text-[#F7F9FC] font-mono">₹{topupPaymentOrder.amount_inr.toFixed(2)}</span>
                      {" • "}Payee: <span className="font-mono text-[#F6821F]">{topupPaymentOrder.merchant_vpa}</span>
                    </div>
                  </div>

                  {/* UTR Reference Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#F7F9FC] flex items-center justify-between">
                      <span>Enter 12-Digit Bank UTR / Reference Number:</span>
                      <span className="text-[10px] text-[#64748B] font-normal">Found in UPI App receipt</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={topupUtrNumber}
                        onChange={(e) => {
                          setTopupUtrNumber(e.target.value.trim());
                          setTopupPaymentError(null);
                        }}
                        placeholder="e.g. 425519827103"
                        className="w-full px-3 py-2 bg-[#080D17] border border-[#223047] rounded-md text-xs font-mono font-bold tracking-wider text-[#F7F9FC] placeholder-[#64748B] focus:outline-none focus:border-[#F6821F]"
                      />
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Demo / testing reference: <span className="font-mono font-bold text-[#F7F9FC]">425519827103</span>
                    </p>
                  </div>

                  {topupPaymentError && (
                    <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                      <span>{topupPaymentError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setTopupStep("COLLECT")}
                      className="text-xs text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#121C2D] cursor-pointer"
                    >
                      &larr; Modify UPI ID
                    </Button>
                    <Button
                      type="button"
                      disabled={topupProcessing || !topupUtrNumber.trim()}
                      onClick={handleVerifyTopupUtr}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md text-xs py-2 px-6 font-bold cursor-pointer"
                    >
                      {topupProcessing ? (
                        <span>Verifying Bank UTR...</span>
                      ) : (
                        <span>Verify Payment & Credit Quota &rarr;</span>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4: RECHARGE SUCCESS RECEIPT */}
              {topupStep === "SUCCESS" && topupSuccessDetails && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300">Payment Verified & Quota Credited!</h4>
                      <p className="text-xs text-emerald-400/80 mt-0.5">
                        ₹{topupSuccessDetails.amount_paid.toFixed(2)} received via UPI (UTR: {topupSuccessDetails.utr}).
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-[#121C2D] border border-[#223047] rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#1E293B]">
                      <span className="text-[#94A3B8]">Package Credited:</span>
                      <span className="font-bold text-emerald-400 font-mono">{topupSuccessDetails.units_added}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1E293B]">
                      <span className="text-[#94A3B8]">Available Audio Streaming:</span>
                      <span className="font-bold text-[#F7F9FC] font-mono">
                        {(activeKey?.minutes_remaining ?? 15.0).toFixed(1)} Minutes
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#94A3B8]">Available Token Balance:</span>
                      <span className="font-bold text-[#F7F9FC] font-mono">
                        {activeKey?.tokens_remaining.toLocaleString()} Tokens
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowTopupModal(false);
                        setTopupStep("SELECT");
                      }}
                      className="w-full bg-[#F6821F] hover:bg-[#E85D04] text-white shadow-md shadow-[#F6821F]/20 text-xs py-2.5 font-bold cursor-pointer"
                    >
                      Done & Return to Dashboard
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
