# Architecture

## Principles
1. **Separation of concerns**: UI components must not directly contain database or AI API logic.
2. **Server-Side Security**: All server-side secrets (like `AGNES_API_KEY`) must remain on the server and NEVER be exposed to the browser.
3. **Abstraction**: A service abstraction is used for future Agnes AI integration to allow flexibility.
4. **Data Access**: Keep database access in dedicated repository/service functions.
5. **Business Logic**: Keep business logic strictly separate from the UI layer.
6. **Types**: Use TypeScript strictly throughout the application.
7. **Minimal Dependencies**: Avoid unnecessary libraries to keep the app lightweight.
8. **Scalability**: Design for future modules without over-engineering Phase 1.

## Structure details
- **Frontend Layer**: Next.js App Router providing Server Components and Client Components.
- **Service Layer**: Found in `src/services/` and handles business logic, wrapping database calls and AI endpoints.
- **Agent Layer**: Found in `src/agents/` to house the AI Agent definitions for future intelligent capabilities.
- **Data Layer**: Integrations in `src/lib/firebase/` for Firestore operations.
