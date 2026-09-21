# Security Protocols & Identity Governance

## 1. Authentication Layer
- **Standard**: JWT (JSON Web Tokens) for session persistence.
- **Protocol**: 
  - Login generates a unique JWT stored in the browser's `localStorage`.
  - Frontend attaches the token to every request header via Axios Interceptors (`Authorization: Bearer <token>`).
- **Expiry**: Tokens are verified against the `JWT_SECRET` on every protected request.

## 2. 2FA Implementation (OTP)
- **Flow**:
  1. Primary authentication via password.
  2. Temporary 6-digit OTP generated and stored with an expiry timestamp.
  3. Node access only granted after successful OTP verification.

## 3. Role-Based Access Control (RBAC)
- **Roles**: `admin`, `manager`, `employee`.
- **Enforcement**:
  - `authMiddleware.js` verifies the role stored in the token.
  - UI components (Sidebar, Dashboard buttons) dynamically render based on user role.
  - API routes utilize custom role-check logic (e.g., Leads and Personnel management restricted to `isAdminOrManager`).

## 4. API Hardening
- **Rate Limiting**: Protects against brute-force attacks on login and OTP endpoints.
- **Environment Isolation**: Critical credentials (DB URI, JWT Secret, Cloudinary keys) are strictly managed via `.env` variables and validated at runtime.
- **Error Obfuscation**: Centralized error handling prevents detailed server stack traces from leaking to the client in production.
