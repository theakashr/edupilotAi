"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  X,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  User,
  KeyRound,
} from "lucide-react";

interface ProvisionTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeacherProvisioned?: () => void;
}

export function ProvisionTeacherModal({
  isOpen,
  onClose,
  onTeacherProvisioned,
}: ProvisionTeacherModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"create" | "promote">("create");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [uid, setUid] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Email address is required.");
      return;
    }

    if (mode === "create" && (!password || password.length < 6)) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, string> = {
        action: "provision",
        email: cleanEmail,
        displayName: displayName.trim() || cleanEmail.split("@")[0],
      };

      if (mode === "create") {
        payload.password = password;
      }

      if (mode === "promote" && uid.trim()) {
        payload.uid = uid.trim();
      }

      const res = await fetch("/api/admin/provision-teacher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.uid || "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to provision teacher account.");
      }

      setSuccessMessage(
        mode === "create"
          ? `Teacher account created for ${cleanEmail}! They can now log in to the Educator Portal.`
          : `Teacher role successfully granted to ${cleanEmail}.`
      );

      // Trigger list refresh in parent
      onTeacherProvisioned?.();

      // Reset form after short delay
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmail("");
    setDisplayName("");
    setPassword("");
    setUid("");
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provision-teacher-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 id="provision-teacher-title" className="text-sm font-bold text-slate-900">
                Add Educator Account
              </h2>
              <p className="text-[11px] text-slate-500">
                Institutional faculty &amp; teacher provisioning
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
            aria-label="Close dialog"
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/30 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode("create");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === "create"
                ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Create New Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("promote");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === "promote"
                ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Promote Existing User
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-start gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-start gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Email input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teacher Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="colleague@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name / Title (Optional)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. Dr. Alan Turing"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password for Create mode */}
          {mode === "create" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Temporary Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  disabled={loading}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                The teacher will use this password to sign in to the Educator Portal.
              </p>
            </div>
          )}

          {/* Optional UID for Promote mode */}
          {mode === "promote" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Firebase UID (Optional if email exists)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. 4U3k7YbEryOsH5AKUErOa5JUxnw1"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-mono"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Security badge note */}
          <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-2 text-[11px] text-indigo-700">
            <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-600" />
            <span>
              Authorized educators receive immediate access to courses, student diagnostics, and AI co-pilot.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Boolean(successMessage)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Provisioning...</span>
                </>
              ) : (
                <span>
                  {mode === "create" ? "Create Teacher Account" : "Grant Teacher Privileges"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
