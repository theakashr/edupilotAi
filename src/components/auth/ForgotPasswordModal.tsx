"use client";

import { useState } from "react";
import { resetPassword } from "@/services/auth/authService";
import { X, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  defaultEmail = "",
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please provide your account email address.");
      return;
    }

    setError(null);
    setLoading(true);

    const res = await resetPassword(email.trim());
    setLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || "Failed to send reset email. Please try again.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 id="forgot-password-title" className="text-lg font-bold text-slate-900 tracking-tight">
              Reset Password
            </h2>
            <p className="text-xs text-slate-500">
              Enter your email to receive recovery instructions.
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Password Reset Link Sent
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We have sent instructions to <strong className="text-slate-800">{email}</strong>. Check your inbox and spam folder.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Account Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Link...</span>
                  </>
                ) : (
                  <span>Send Recovery Email</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
