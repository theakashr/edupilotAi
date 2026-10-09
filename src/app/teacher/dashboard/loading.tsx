import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans">
      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
          <h2 className="text-lg font-semibold text-slate-700">Loading Dashboard...</h2>
          <p className="text-sm text-slate-500">Preparing your intelligent workspace</p>
        </div>
      </main>
    </div>
  );
}
