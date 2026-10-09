import {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  materialCollection,
  materialChunkCollection,
  typedDoc,
} from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type {
  Material,
  MaterialChunk,
  DbResult,
} from '@/types';
import type {
  CreateMaterialInput,
  UpdateMaterialInput,
  CreateMaterialChunkInput,
} from '@/lib/validation';

/**
 * Service handling educational materials and RAG chunk repository operations.
 */
export const materialService = {
  /**
   * Register a new educational material document.
   */
  async createMaterial(
    input: CreateMaterialInput
  ): Promise<DbResult<Material>> {
    try {
      const colRef = materialCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newMaterial: Material = {
        id: newDocRef.id,
        courseId: input.courseId,
        uploadedBy: input.uploadedBy,
        title: input.title,
        type: input.type,
        storagePath: input.storagePath,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        status: input.status,
        version: input.version,
        storageProvider: input.storageProvider || 'supabase',
        createdAt: now,
        updatedAt: now,
        ...(input.description ? { description: input.description } : {}),
        ...(input.pageCount !== undefined ? { pageCount: input.pageCount } : {}),
        ...(input.chunkCount !== undefined ? { chunkCount: input.chunkCount } : {}),
        ...(input.processingError ? { processingError: input.processingError } : {}),
      };


      await setDoc(newDocRef, newMaterial);
      return { success: true, data: newMaterial };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create material',
      };
    }
  },

  /**
   * Get material metadata by ID.
   */
  async getMaterialById(
    materialId: string
  ): Promise<DbResult<Material | null>> {
    try {
      const docRef = typedDoc<Material>(COLLECTIONS.MATERIALS, materialId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return { success: true, data: null };
      }

      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve material',
      };
    }
  },

  /**
   * List all materials for a course.
   */
  async listCourseMaterials(
    courseId: string
  ): Promise<DbResult<Material[]>> {
    try {
      try {
        const q = query(
          materialCollection(),
          where('courseId', '==', courseId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const materials = snapshot.docs.map((d) => d.data());
        return { success: true, data: materials };
      } catch (queryErr: unknown) {
        const errMsg = queryErr instanceof Error ? queryErr.message : '';
        if (errMsg.includes('requires an index') || errMsg.includes('failed-precondition')) {
          const fallbackQuery = query(
            materialCollection(),
            where('courseId', '==', courseId)
          );
          const snapshot = await getDocs(fallbackQuery);
          const materials = snapshot.docs
            .map((d) => d.data())
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
          return { success: true, data: materials };
        }
        throw queryErr;
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list course materials',
      };
    }
  },

  /**
   * Update material metadata or processing status.
   */
  async updateMaterial(
    materialId: string,
    updates: UpdateMaterialInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<Material>(COLLECTIONS.MATERIALS, materialId);
      const cleanedUpdates: Record<string, unknown> = {
        updatedAt: nowTimestamp(),
      };
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) {
          cleanedUpdates[k] = v;
        }
      }
      await updateDoc(docRef, cleanedUpdates);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update material',
      };
    }
  },


  /**
   * Create an extracted material text chunk for knowledge retrieval.
   */
  async createMaterialChunk(
    input: CreateMaterialChunkInput
  ): Promise<DbResult<MaterialChunk>> {
    try {
      const colRef = materialChunkCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newChunk: MaterialChunk = {
        id: newDocRef.id,
        materialId: input.materialId,
        courseId: input.courseId,
        chunkIndex: input.chunkIndex,
        text: input.text,
        createdAt: now,
        updatedAt: now,
        ...(input.pageNumber !== undefined ? { pageNumber: input.pageNumber } : {}),
        ...(input.sectionTitle ? { sectionTitle: input.sectionTitle } : {}),
      };


      await setDoc(newDocRef, newChunk);
      return { success: true, data: newChunk };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create material chunk',
      };
    }
  },

  /**
   * Batch create multiple extracted chunks for a material.
   * Chunks are written using Firestore writeBatch in chunks under 500 ops.
   */
  async createMaterialChunksBatch(
    chunks: Omit<MaterialChunk, 'createdAt' | 'updatedAt'>[]
  ): Promise<DbResult<number>> {
    try {
      if (chunks.length === 0) {
        return { success: true, data: 0 };
      }

      const now = nowTimestamp();
      const colRef = materialChunkCollection();
      const BATCH_SIZE = 450; // Safely below Firestore 500 limit

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunkBatch = chunks.slice(i, i + BATCH_SIZE);

        for (const item of chunkBatch) {
          const docRef = doc(colRef, item.id);
          const fullChunk: MaterialChunk = {
            ...item,
            createdAt: now,
            updatedAt: now,
          };
          batch.set(docRef, fullChunk);
        }

        await batch.commit();
      }

      return { success: true, data: chunks.length };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to batch save material chunks',
      };
    }
  },

  /**
   * Delete all chunks belonging to a material (used during reprocessing and cleanup).
   */
  async deleteMaterialChunks(
    materialId: string
  ): Promise<DbResult<number>> {
    try {
      const q = query(
        materialChunkCollection(),
        where('materialId', '==', materialId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: true, data: 0 };
      }

      const BATCH_SIZE = 450;
      let totalDeleted = 0;

      for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchDocs = snapshot.docs.slice(i, i + BATCH_SIZE);

        for (const docSnap of batchDocs) {
          batch.delete(docSnap.ref);
          totalDeleted++;
        }

        await batch.commit();
      }

      return { success: true, data: totalDeleted };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete material chunks',
      };
    }
  },

  /**
   * List all chunks belonging to a material ordered by chunkIndex.
   */
  async listMaterialChunks(
    materialId: string
  ): Promise<DbResult<MaterialChunk[]>> {
    try {
      const q = query(
        materialChunkCollection(),
        where('materialId', '==', materialId),
        orderBy('chunkIndex', 'asc')
      );
      const snapshot = await getDocs(q);
      const chunks = snapshot.docs.map((d) => d.data());
      return { success: true, data: chunks };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list material chunks',
      };
    }
  },

  /**
   * Retrieve a single material chunk by its ID.
   */
  async getMaterialChunkById(
    chunkId: string
  ): Promise<DbResult<MaterialChunk | null>> {
    try {
      const docRef = typedDoc<MaterialChunk>(COLLECTIONS.MATERIAL_CHUNKS, chunkId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return { success: true, data: null };
      }

      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve material chunk',
      };
    }
  },

  /**
   * Delete a material document by ID and clean up its associated chunks.
   */
  async deleteMaterial(materialId: string): Promise<DbResult<void>> {
    try {
      // 1. Delete associated chunks first to prevent orphaned data
      await this.deleteMaterialChunks(materialId);

      // 2. Delete the material document
      const docRef = typedDoc<Material>(COLLECTIONS.MATERIALS, materialId);
      await deleteDoc(docRef);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete material',
      };
    }
  },
};

