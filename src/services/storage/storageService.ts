import { supabase } from '@/lib/supabase/client';
import { STORAGE_BUCKET } from '@/lib/supabase/storage';
import type { DbResult } from '@/types';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * Common Storage Service Interface for modular cloud storage providers.
 * Makes it possible to swap Supabase Storage for S3/GCS without altering UI components.
 */
export interface IStorageService {
  uploadFile(
    file: File | Blob,
    storagePath: string,
    contentType?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DbResult<{ storagePath: string }>>;

  deleteFile(storagePath: string): Promise<DbResult<void>>;

  getSignedUrl(
    storagePath: string,
    expiresInSeconds?: number
  ): Promise<DbResult<string>>;

  getDownloadUrl(storagePath: string): Promise<DbResult<string>>;
}

/**
 * Concrete Supabase implementation of the Storage Service.
 */
export class SupabaseStorageService implements IStorageService {
  private bucket: string;

  constructor(bucket: string = STORAGE_BUCKET) {
    this.bucket = bucket;
  }

  /**
   * Uploads an educational file to the private Supabase Storage bucket.
   * Uses XMLHttpRequest when available to track real-time upload progress.
   */
  async uploadFile(
    file: File | Blob,
    storagePath: string,
    contentType?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DbResult<{ storagePath: string }>> {
    try {
      // If running in browser environment, use XMLHttpRequest for real-time progress events
      if (typeof window !== 'undefined' && typeof XMLHttpRequest !== 'undefined') {
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/storage/upload');

          if (onProgress && xhr.upload) {
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable && event.total > 0) {
                const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
                onProgress({ loaded: event.loaded, total: event.total, percent });
              }
            };
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText);
                resolve({ success: true, data: { storagePath: json.storagePath || storagePath } });
              } catch {
                resolve({ success: true, data: { storagePath } });
              }
            } else {
              try {
                const errJson = JSON.parse(xhr.responseText);
                resolve({
                  success: false,
                  error: errJson.error || `Upload failed (Status ${xhr.status})`,
                });
              } catch {
                resolve({ success: false, error: `Upload failed (Status ${xhr.status})` });
              }
            }
          };

          xhr.onerror = () => {
            resolve({
              success: false,
              error: 'Upload interrupted: Network connection lost. Please check your internet connection and try again.',
            });
          };

          xhr.ontimeout = () => {
            resolve({
              success: false,
              error: 'Upload timed out. The file may be too large for the current connection speed.',
            });
          };

          // 5 minute timeout for large files
          xhr.timeout = 300000;

          const formData = new FormData();
          formData.append('file', file);
          formData.append('storagePath', storagePath);
          if (contentType) {
            formData.append('contentType', contentType);
          }
          xhr.send(formData);
        });
      }

      // Fallback for non-browser/Node.js environment
      const formData = new FormData();
      formData.append('file', file);
      formData.append('storagePath', storagePath);
      if (contentType) {
        formData.append('contentType', contentType);
      }

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        return { success: true, data: { storagePath: json.storagePath || storagePath } };
      }

      const { data, error } = await supabase.storage
        .from(this.bucket)
        .upload(storagePath, file, {
          contentType: contentType || (file instanceof File ? file.type : undefined),
          upsert: true,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: { storagePath: data.path } };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Storage upload failed',
      };
    }
  }

  /**
   * Deletes a file from Supabase Storage.
   */
  async deleteFile(storagePath: string): Promise<DbResult<void>> {
    try {
      // Try server-side deletion route
      const res = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath }),
      });

      if (res.ok) {
        return { success: true, data: undefined };
      }

      // Fallback to client
      const { error } = await supabase.storage.from(this.bucket).remove([storagePath]);
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Storage deletion failed',
      };
    }
  }

  /**
   * Generates a temporary signed URL (e.g. 60 seconds) to view a private file.
   */
  async getSignedUrl(
    storagePath: string,
    expiresInSeconds = 60
  ): Promise<DbResult<string>> {
    try {
      // Request signed URL via server route
      const res = await fetch(
        `/api/storage/download?storagePath=${encodeURIComponent(storagePath)}&expiresIn=${expiresInSeconds}`
      );

      if (res.ok) {
        const json = await res.json();
        if (json.signedUrl) {
          return { success: true, data: json.signedUrl };
        }
      }

      // Fallback to client createSignedUrl
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error || !data?.signedUrl) {
        return { success: false, error: error?.message || 'Failed to sign download URL' };
      }

      return { success: true, data: data.signedUrl };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to generate signed URL',
      };
    }
  }

  /**
   * Alias for getSignedUrl for private downloads.
   */
  async getDownloadUrl(storagePath: string): Promise<DbResult<string>> {
    return this.getSignedUrl(storagePath, 120);
  }
}

/**
 * Singleton instance of the storage service.
 */
export const storageService = new SupabaseStorageService();
