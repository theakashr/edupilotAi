import { Loader2 } from "lucide-react";

export default function TeacherLoading() {
  return (
    <div className="w-full h-[80vh] flex flex-col items-center justify-center gap-4 bg-[#FAFAF9]/50 animate-in fade-in duration-300">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shadow-inner">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
      <div className="text-center">
        <h2 className="text-sm font-bold text-slate-800">Loading Dashboard...</h2>
        <p className="text-xs text-slate-500 mt-1">Preparing your workspace</p>
      </div>
    </div>
  );
}
