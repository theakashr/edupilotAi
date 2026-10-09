"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { materialService } from "@/services/materials/materialService";
import { storageService } from "@/services/storage/storageService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { CourseWorkspaceNav } from "@/components/teacher/CourseWorkspaceNav";
import { UploadMaterialModal } from "@/components/teacher/UploadMaterialModal";
import { EditMaterialModal } from "@/components/teacher/EditMaterialModal";
import type { Course, Material } from "@/types";
import {
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Edit3,
  ShieldAlert,
  Loader2,
  AlertCircle,
  FileCheck,
  Sparkles,
  Network,
} from "lucide-react";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default function CourseMaterialsPage({ params }: PageProps) {
  const { courseId } = use(params);
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // File download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  // File processing state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!courseId || !user?.uid) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Fetch course details
        const courseRes = await courseService.getCourseById(courseId);
        if (ignore) return;

        if (!courseRes.success) {
          setError(courseRes.error);
          setLoading(false);
          return;
        }

        if (!courseRes.data) {
          setError("Course not found");
          setLoading(false);
          return;
        }

        // Ownership verification
        if (courseRes.data.teacherId !== user.uid) {
          setIsAccessDenied(true);
          setLoading(false);
          return;
        }

        setCourse(courseRes.data);

        // 2. Fetch materials for this course
        const matRes = await materialService.listCourseMaterials(courseId);
        if (ignore) return;

        if (!matRes.success) {
          setError(matRes.error);
        } else {
          setMaterials(matRes.data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load materials");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [courseId, user?.uid]);

  const handleRefresh = async () => {
    if (!courseId) return;
    setRefreshing(true);
    const matRes = await materialService.listCourseMaterials(courseId);
    if (matRes.success) {
      setMaterials(matRes.data);
    }
    setRefreshing(false);
  };

  // Trigger server-side PDF document ingestion & text extraction pipeline (Phase 5)
  const handleProcess = async (mat: Material) => {
    if (!user?.uid) return;

    try {
      setProcessingId(mat.id);
      // Optimistically update local material status to 'processing'
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === mat.id ? { ...m, status: "processing", processingError: undefined } : m
        )
      );

      const res = await fetch("/api/materials/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: mat.id, userId: user.uid }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === mat.id
              ? {
                  ...m,
                  status: "ready",
                  pageCount: data.pageCount,
                  chunkCount: data.chunkCount,
                  processingError: undefined,
                }
              : m
          )
        );
      } else {
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === mat.id
              ? {
                  ...m,
                  status: "failed",
                  processingError: data.error || "Failed to extract text from PDF.",
                }
              : m
          )
        );
      }
    } catch {
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === mat.id
            ? {
                ...m,
                status: "failed",
                processingError: "Network error while triggering document processing.",
              }
            : m
        )
      );
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Material View / Download via Private Signed URL
  const handleDownload = async (mat: Material) => {
    try {
      setDownloadingId(mat.id);
      const urlRes = await storageService.getSignedUrl(mat.storagePath, 60);

      if (!urlRes.success) {
        alert(`Failed to generate secure download link: ${urlRes.error}`);
        return;
      }

      // Open signed URL in new tab / download
      window.open(urlRes.data, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle Material Deletion (Supabase Storage + Firestore)
  const handleDeleteConfirm = async () => {
    if (!deletingMaterial) return;

    setDeleteLoading(true);
    try {
      // 1. Delete binary from Supabase Storage
      await storageService.deleteFile(deletingMaterial.storagePath);

      // 2. Delete metadata from Firestore
      const dbRes = await materialService.deleteMaterial(deletingMaterial.id);
      if (!dbRes.success) {
        setError(`Failed to remove material from database: ${dbRes.error}`);
        setDeleteLoading(false);
        return;
      }

      setMaterials((prev) => prev.filter((m) => m.id !== deletingMaterial.id));
      setDeletingMaterial(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete material");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-sm text-gray-500 mt-2">
              You do not have permission to manage materials in this course.
            </p>
            <div className="mt-6">
              <Link
                href="/teacher/courses"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700"
              >
                Back to Courses
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav />
        <main className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TeacherNav courseId={course.id} courseTitle={course.title} />

      <CourseWorkspaceNav course={course} />

      <main id="main-content" className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Learning Materials ({materials.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload, extract text, and manage course textbooks, presentations, and documents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors shrink-0"
              title="Refresh materials list from Firestore"
            >
              <Loader2 className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Material</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm flex items-start gap-3 border border-red-200">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Materials Table / Cards */}
        {materials.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">
              No learning materials yet.
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
              Upload your first PDF, textbook, presentation, or document. Files are stored securely in Supabase Storage with metadata in Cloud Firestore.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload First Material</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-6 py-4">Title & File</th>
                    <th scope="col" className="px-6 py-4">Type</th>
                    <th scope="col" className="px-6 py-4">Size</th>
                    <th scope="col" className="px-6 py-4">Version</th>
                    <th scope="col" className="px-6 py-4">Status & Ingestion</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3 min-w-0 max-w-md">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                            <FileCheck className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {mat.title}
                            </p>
                            {mat.description && (
                              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                {mat.description}
                              </p>
                            )}
                            <p className="text-[11px] font-mono text-gray-400 mt-1 truncate">
                              {mat.fileName}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase bg-gray-100 text-gray-700">
                          {mat.type}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-600">
                        {(mat.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </td>

                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        v{mat.version || 1}
                      </td>

                      <td className="px-6 py-4">
                        {mat.status === "ready" && (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Ready
                            </span>
                            {(mat.pageCount !== undefined || mat.chunkCount !== undefined) && (
                              <p className="text-[11px] text-gray-500 mt-1">
                                {mat.pageCount !== undefined ? `${mat.pageCount} pages` : ""}
                                {mat.pageCount !== undefined && mat.chunkCount !== undefined ? " • " : ""}
                                {mat.chunkCount !== undefined ? `${mat.chunkCount} chunks` : ""}
                              </p>
                            )}
                          </div>
                        )}

                        {mat.status === "processing" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                            Processing…
                          </span>
                        )}

                        {mat.status === "failed" && (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Failed
                            </span>
                            {mat.processingError && (
                              <p className="text-[11px] text-red-600 mt-1 max-w-[200px] line-clamp-2" title={mat.processingError}>
                                {mat.processingError}
                              </p>
                            )}
                          </div>
                        )}

                        {mat.status === "uploaded" && (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              Uploaded
                            </span>
                            {mat.type === "pdf" && (
                              <p className="text-[11px] text-blue-600 mt-0.5">
                                Pending extraction
                              </p>
                            )}
                          </div>
                        )}

                        {mat.status === "archived" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Archived
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Process / Reprocess Action (Phase 5) */}
                          {mat.type === "pdf" && (
                            <button
                              type="button"
                              onClick={() => handleProcess(mat)}
                              disabled={processingId === mat.id || mat.status === "processing"}
                              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title={mat.status === "ready" ? "Reprocess Text Chunks" : "Extract & Chunk Text"}
                            >
                              {processingId === mat.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Knowledge Layer Navigation */}
                          {mat.status === "ready" && (
                            <Link
                              href={`/teacher/courses/${courseId}/knowledge`}
                              className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Explore in Knowledge Layer"
                            >
                              <Network className="w-4 h-4" />
                            </Link>
                          )}

                          {/* View/Download Action */}
                          <button
                            type="button"
                            onClick={() => handleDownload(mat)}
                            disabled={downloadingId === mat.id}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Open / Download from Supabase"
                          >
                            {downloadingId === mat.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit Metadata */}
                          <button
                            type="button"
                            onClick={() => setEditingMaterial(mat)}
                            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Title & Description"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete Action */}
                          <button
                            type="button"
                            onClick={() => setDeletingMaterial(mat)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Phase 5 Pipeline Active Note */}
        <div className="mt-8 rounded-xl bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 p-5 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 space-y-1">
            <p className="font-semibold text-indigo-900">Phase 5 Document Ingestion & PDF Extraction Active</p>
            <p className="text-indigo-700 leading-relaxed">
              PDF materials uploaded to Supabase Storage are automatically processed server-side: text is extracted with page boundaries preserved, cleaned, and segmented into deterministic <code className="font-mono bg-white/70 px-1 py-0.2 rounded text-indigo-800">material_chunks</code> in Cloud Firestore for future RAG retrieval and learning intelligence.
            </p>
          </div>
        </div>
      </main>

      {/* Upload Material Modal */}
      {isUploadOpen && (
        <UploadMaterialModal
          courseId={course.id}
          teacherId={user!.uid}
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onMaterialUploaded={(newMat) => {
            setMaterials((prev) => [newMat, ...prev]);
          }}
        />
      )}

      {/* Edit Material Modal */}
      {editingMaterial && (
        <EditMaterialModal
          material={editingMaterial}
          isOpen={true}
          onClose={() => setEditingMaterial(null)}
          onMaterialUpdated={(updated) => {
            setMaterials((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingMaterial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Delete Educational Material?
            </h3>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Are you sure you want to permanently delete <strong>{deletingMaterial.title}</strong>? The file will be removed from Supabase Storage and Firestore.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingMaterial(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs disabled:opacity-50 transition-colors"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Material</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
