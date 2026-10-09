"use client";

import { useState, useRef } from "react";
import {
  validateEducationalFile,
  determineMaterialType,
  generateStoragePath,
  generateMaterialId,
  ALLOWED_EXTENSIONS,
} from "@/lib/supabase/storage";
import { storageService } from "@/services/storage/storageService";
import { materialService } from "@/services/materials/materialService";
import type { Material } from "@/types";
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface UploadMaterialModalProps {
  courseId: string;
  teacherId: string;
  isOpen: boolean;
  onClose: () => void;
  onMaterialUploaded: (material: Material) => void;
}

export function UploadMaterialModal({
  courseId,
  teacherId,
  isOpen,
  onClose,
  onMaterialUploaded,
}: UploadMaterialModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadBytes, setUploadBytes] = useState<{ loaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (selectedFile: File | null) => {
    setError(null);
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const validation = validateEducationalFile({
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
    });

    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    // Suggest a default clean title if title is currently empty
    if (!title) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an educational file to upload.");
      return;
    }

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setError(null);
    setUploading(true);
    setUploadPercent(0);
    setUploadBytes(null);

    try {
      // 1. Generate Material ID & sanitized Storage Path
      const materialId = generateMaterialId();
      const storagePath = generateStoragePath(courseId, materialId, file.name);

      setProgressText("Uploading document to secure cloud storage...");

      // 2. Upload file binary to private Supabase Storage with real-time progress events
      const uploadRes = await storageService.uploadFile(
        file,
        storagePath,
        file.type,
        (progress) => {
          setUploadPercent(progress.percent);
          setUploadBytes({ loaded: progress.loaded, total: progress.total });
          setProgressText(
            `Uploading: ${progress.percent}% (${(progress.loaded / (1024 * 1024)).toFixed(1)} MB / ${(progress.total / (1024 * 1024)).toFixed(1)} MB)`
          );
        }
      );

      if (!uploadRes.success) {
        setError(uploadRes.error);
        setUploading(false);
        return;
      }

      setUploadPercent(100);
      setProgressText("Saving material metadata...");

      // 3. Create Firestore Material document
      const matType = determineMaterialType(file.name, file.type);
      const createRes = await materialService.createMaterial({
        courseId,
        uploadedBy: teacherId,
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        type: matType,
        storagePath: uploadRes.data.storagePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        status: "uploaded",
        version: 1,
        storageProvider: "supabase",
      });

      if (!createRes.success) {
        // Rollback storage file if database record failed
        await storageService.deleteFile(uploadRes.data.storagePath);
        setError(`Failed to save material metadata: ${createRes.error}`);
        setUploading(false);
        return;
      }

      // 4. Trigger document processing in background without blocking UI
      const finalMaterial = createRes.data;
      if (matType === 'pdf') {
        setProgressText("Upload complete! Scheduled text extraction.");
        fetch('/api/materials/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materialId: createRes.data.id,
            userId: teacherId,
          }),
        }).catch((err) => {
          console.warn('[UploadMaterialModal] Background extraction triggered:', err);
        });
      } else {
        setProgressText("Upload complete!");
      }

      // 5. Notify parent and close modal immediately
      onMaterialUploaded(finalMaterial);
      handleReset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred during upload");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setError(null);
    setProgressText("");
    setUploadPercent(0);
    setUploadBytes(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-material-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            <h2 id="upload-material-modal-title" className="text-lg font-semibold text-gray-900">
              Upload Educational Material
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
            aria-label="Close dialog"
            disabled={uploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-start gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Document or Textbook *
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                file
                  ? "border-blue-300 bg-blue-50/50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ALLOWED_EXTENSIONS.join(",")}
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-blue-600 shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[260px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready for upload
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-auto shrink-0" />
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-blue-600 hover:text-blue-700">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">
                    PDF, PPT, PPTX, DOC, DOCX, TXT (up to 50 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Title input */}
          <div>
            <label htmlFor="material-title" className="block text-sm font-medium text-gray-700 mb-1">
              Display Title *
            </label>
            <input
              id="material-title"
              type="text"
              required
              minLength={2}
              maxLength={200}
              placeholder="e.g. Chapter 2: Memory Hierarchy & Cache Design"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Description input */}
          <div>
            <label htmlFor="material-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              id="material-desc"
              rows={2}
              maxLength={1000}
              placeholder="e.g. Core textbook reading for Unit 3. Required prior to Quiz 1."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Upload Progress Status with real-time Progress Bar */}
          {uploading && (
            <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2 min-w-0">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                  <span className="truncate">{progressText}</span>
                </div>
                {uploadPercent > 0 && (
                  <span className="font-semibold text-blue-700 tabular-nums shrink-0 ml-2">
                    {uploadPercent}%
                  </span>
                )}
              </div>
              <div className="w-full bg-blue-200/70 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${Math.max(4, uploadPercent)}%` }}
                />
              </div>
              {uploadBytes && uploadBytes.total > 10 * 1024 * 1024 && (
                <p className="text-[11px] text-blue-600/80">
                  Large textbook ({(uploadBytes.total / (1024 * 1024)).toFixed(1)} MB) · Please keep window open
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Upload Material</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
