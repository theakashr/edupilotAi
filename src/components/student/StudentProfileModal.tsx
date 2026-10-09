"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { logoutUser } from "@/services/auth/authService";
import { updateStudentDisplayName } from "@/lib/firebase/firestore";
import { generateStudentId } from "@/lib/studentId";
import {
  X,
  Copy,
  Check,
  Mail,
  Shield,
  KeyRound,
  LogOut,
  Edit2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StudentProfileModal({ isOpen, onClose }: StudentProfileModalProps) {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profile?.displayName || "");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !user) return null;

  const studentId = profile?.studentId || generateStudentId(user.uid);
  const displayName = profile?.displayName || user.displayName || user.email?.split("@")[0] || "Student";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(studentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim() || editedName.trim() === displayName) {
      setIsEditingName(false);
      return;
    }

    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    const res = await updateStudentDisplayName(user.uid, editedName.trim());
    setSaveLoading(false);

    if (res.success) {
      setSaveSuccess(true);
      setIsEditingName(false);
      await refreshProfile();
      setTimeout(() => setSaveSuccess(false), 2000);
    } else {
      setSaveError(res.error || "Failed to update display name");
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onClose();
    router.push("/login");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Gradient Header */}
        <div className="h-24 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 p-6 flex justify-between items-start relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-semibold backdrop-blur-md">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Learner Identity</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Close profile dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar badge overlapping header */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg shadow-indigo-900/10">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-2xl shadow-inner">
                {userInitials}
              </div>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Verified Student
            </span>
          </div>

          {/* User Name & Edit */}
          <div className="mb-4">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="px-3 py-1.5 text-sm font-semibold border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    id="student-profile-title"
                    className="text-xl font-extrabold text-slate-900 tracking-tight"
                  >
                    {displayName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditedName(displayName);
                    setIsEditingName(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                  title="Edit Display Name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {saveSuccess && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Name updated successfully
              </p>
            )}
            {saveError && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {saveError}
              </p>
            )}
          </div>

          {/* Student ID Card with Copy Button */}
          <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100/90 p-4 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Official Student ID
              </span>
              <span className="text-[10px] text-indigo-500 font-medium">
                Share with instructor
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-indigo-200/80 shadow-2xs">
              <code className="font-mono text-sm font-bold text-indigo-950 tracking-wider">
                {studentId}
              </code>

              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-indigo-700/80 mt-2 leading-relaxed">
              Your instructor uses this unique ID to enroll you into course workspaces.
            </p>
          </div>

          {/* Account Details Table */}
          <div className="space-y-2.5 text-xs text-slate-600 mb-6 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-2 text-slate-500">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Role</span>
              </span>
              <span className="font-semibold text-slate-800 capitalize">
                {profile?.role || "student"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-2 text-slate-500">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Primary Email</span>
              </span>
              <span className="font-mono text-slate-700 truncate max-w-[200px]" title={user.email || ""}>
                {user.email}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-2 text-slate-500">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>System UID</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400 truncate max-w-[170px]" title={user.uid}>
                {user.uid}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of EduPilot</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
