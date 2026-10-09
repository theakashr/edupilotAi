# EduPilot AI — Adaptive Learning & Teacher AI Co-Pilot

## Project Overview
EduPilot AI is an agentic learning platform that connects teachers and students. It allows teachers to create courses and upload educational resources, while students receive personalized, AI-adapted learning paths based on their performance, prior knowledge, and learning preferences.

## Architecture Overview
The platform uses a modern, maintainable full-stack architecture designed for scalability.
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js Server Actions / API Routes
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage
- **AI**: Agnes 3.0 Flash (Integration abstraction layer prepared for future phases)

## Folder Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/components/ui/` - Reusable UI components
- `src/components/layout/` - Layout components (Navigation, sidebars)
- `src/features/` - Feature-based modules (teacher, student, courses, assessments)
- `src/lib/` - Shared utilities and integrations (firebase, auth, database, validation)
- `src/services/` - Business logic and external API communication
- `src/agents/` - AI agents (orchestrator, resource, learner, planner, assessment)
- `docs/` - Project documentation

## Technology Stack
- Next.js
- React
- TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore, Storage)
- Zod (Validation)
- React Hook Form

## Environment Variables
Copy `.env.example` to `.env.local` and fill in the Firebase and Agnes API keys. 
**Note**: Never expose `AGNES_API_KEY` to the client (do not use the `NEXT_PUBLIC_` prefix).

## Local Development Setup
1. Clone the repository
2. Run `npm install`
3. Setup `.env.local`
4. Run `npm run dev`

## Current Implementation Status
**Phase 1 Completed**: Project Foundation and Architecture.
- Basic Next.js App Router structure initialized.
- Folder scaffolding for features, services, lib, and agents created.
- Route placeholders created for Teacher and Student modules.
- Environment variables template created.

## Future Phases
Please see `docs/development-phases.md` for a detailed breakdown of future phases.
