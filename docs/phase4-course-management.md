# EduPilot AI — Phase 4: Teacher Course Management + Supabase Storage

## 1. System Architecture Overview

Phase 4 establishes the **Teacher Course Management** workspace and the **Supabase Cloud Storage** pipeline for educational files while keeping Firebase Authentication and Firestore as the core application identity and relational data layer.

```
                           EduPilot AI Stack
                     ┌───────────────────────────┐
                     │  Firebase Authentication  │ (Identity & Session Tokens)
                     └─────────────┬─────────────┘
                                   │ UID + Role (Teacher)
                     ┌─────────────▼─────────────┐
                     │     Cloud Firestore       │ (Metadata, Courses, Memberships,
                     └─────────────┬─────────────┘  Material Records, Announcements)
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   Teacher Management Workspace               Supabase Cloud Storage
   - /teacher/dashboard                       (Private Bucket: edupilot-materials)
   - /teacher/courses                         - Structured object paths:
   - /teacher/courses/new                       courses/{courseId}/materials/{id}/{file}
   - /teacher/courses/[courseId]              - Signed temporary download URLs
   - /teacher/courses/[courseId]/students     - Multi-cloud boundary bridge
   - /teacher/courses/[courseId]/materials    - Zero exposure of service-role keys
   - /teacher/courses/[courseId]/announcements
```

---

## 2. Component Responsibility Division

| Layer | Responsibility | Storage / Security Model |
| :--- | :--- | :--- |
| **Firebase Auth** | User authentication, identity claims, password/OAuth credentials | Client JWT with UID & Role claim |
| **Cloud Firestore** | Courses, Course Members, Material metadata, Announcements, Roles | Role-based rules (`firestore.rules`) enforcing course teacher ownership |
| **Supabase Storage** | Physical binary storage of PDFs, textbooks, slides, documents | Private bucket `edupilot-materials` with temporary signed URLs (60s) |
| **Next.js Server API** | Privileged bridge between Firebase identity and Supabase Storage | Server-side `SUPABASE_SERVICE_ROLE_KEY` accessed exclusively in API routes |

---

## 3. Storage Architecture & Path Specification

### Bucket Name
- `edupilot-materials` (Private, non-public bucket)

### Canonical Path Structure
```
courses/{courseId}/materials/{materialId}/{sanitizedFileName}
```

**Example:**
```
courses/cs101_sys/materials/mat_982348_a7f2/Chapter_2_Memory_Hierarchy.pdf
```

### Sanitization Policy
Raw user filenames are sanitized using `sanitizeFileName()`:
- Slashes (`/`, `\`) replaced with underscores (`_`)
- Spaces replaced with underscores (`_`)
- Non-alphanumeric characters (except `.`, `-`, `_`) stripped
- Prevents path traversal and encoding issues

---

## 4. File Validation Specifications

| Constraint | Limit / Rule | Error Response |
| :--- | :--- | :--- |
| **Max File Size** | 50 MB (`50 * 1024 * 1024` bytes) | "File is too large (X MB). Maximum permitted size is 50 MB." |
| **Supported Formats** | `.pdf`, `.ppt`, `.pptx`, `.doc`, `.docx`, `.txt` | "Unsupported file format. Supported formats: .pdf, .ppt, .pptx, .doc, .docx, .txt." |
| **Minimum Size** | > 0 bytes | "Selected file is empty (0 bytes)." |

---

## 5. End-to-End Operational Workflows

### A. Material Upload Flow
```
Teacher selects file in UploadMaterialModal
                │
                ▼
Local client-side validation (Size <= 50MB, extension check)
                │
                ▼
Generate unique materialId & sanitized storage path
                │
                ▼
POST /api/storage/upload (Multipart FormData)
                │
                ▼
Next.js API route uploads buffer to Supabase Storage ('edupilot-materials')
                │
                ▼
Create Firestore document in 'materials' collection:
{
  id: materialId,
  courseId: courseId,
  uploadedBy: teacherUid,
  title: customDisplayTitle,
  description: optionalNotes,
  type: 'pdf' | 'ppt' | 'document' | 'note',
  storagePath: 'courses/...',
  fileName: originalFileName,
  fileSize: bytes,
  mimeType: 'application/pdf',
  status: 'uploaded',
  version: 1,
  storageProvider: 'supabase',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
                │
                ▼
Status = "uploaded" (Ready for Phase 5 extraction)
```

### B. Secure Download / View Flow
Because the Supabase Storage bucket is private:
1. Teacher clicks **Download / View** icon on material card.
2. Client requests temporary signed URL via `GET /api/storage/download?storagePath=...&expiresIn=60`.
3. Server generates temporary signed URL valid for 60 seconds.
4. Browser opens or downloads the file directly from Supabase Storage securely without permanent public exposure.

### C. Safe Material Deletion Flow
1. Teacher confirms deletion modal.
2. Client requests `POST /api/storage/delete` to purge the binary from Supabase Storage.
3. Firestore material metadata document is deleted via `materialService.deleteMaterial(materialId)`.
4. Prevents orphaned storage objects and dangling database pointers.

---

## 6. Environment Configuration

### Required Client-side Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Required Server-side Only Variables
```env
# NEVER prefix with NEXT_PUBLIC_ — Server-side privileged access only
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

---

## 7. Future PDF Processing Integration Boundary (Phase 5+)

In Phase 4, the material upload lifecycle ends strictly at `status = "uploaded"`.

```
Phase 4 Boundary
---------------------------------------------------------
File Uploaded → Stored in Supabase → Status = "uploaded"
---------------------------------------------------------
Phase 5 (Future):
   ↓
Text Extraction (PDF parser)
   ↓
Chunking Pipeline (Text chunks with page numbers)
   ↓
material_chunks collection populated
   ↓
Phase 6+ (Future):
   ↓
Embedding & Vector Search
   ↓
Agnes 3.0 Flash Co-Pilot
```

No AI extraction, vector searches, or text parsing was performed in this phase.
