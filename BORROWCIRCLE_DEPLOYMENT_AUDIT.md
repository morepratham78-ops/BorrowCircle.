# BorrowCircle — Deployment Audit & Architecture Report

**Generated:** 2026-11-17  
**Project:** BorrowCircle (Hyperlocal Equipment & Tool Sharing Marketplace)  
**Target Repository:** `https://github.com/morepratham78-ops/BorrowCircle` (Private)  
**DevOps Engineer / Deployment Specialist:** Antigravity System  

---

## 1. Executive Summary

This deployment audit documents the exact architecture, technical specifications, database topology, build pipeline, security posture, and deployment requirements of the **BorrowCircle** platform. 

In strict adherence to project constraints:
- **Zero code modifications** were made to existing frontend or backend source code.
- **Zero schema changes** were made to the database.
- **Zero UI or design modifications** were introduced.
- **Zero dependencies** were altered.

BorrowCircle is structured as a **Unified Monolith Architecture**, where a single Node.js Express service serves the compiled Vite React frontend SPA, the RESTful API endpoints, WebSockets via Socket.IO, and static media uploads over a single unified port.

---

## 2. Technical Stack & Architecture

### 2.1 Frontend Architecture
- **Framework:** React 18.3.1 (SPA with Vite 6.0.1)
- **Language:** TypeScript 5.7.2
- **Styling:** Tailwind CSS 3.4.16, Autoprefixer 10.4.20, PostCSS 8.4.49
- **Animations & Icons:** Framer Motion 11.13.1, Lucide React 0.468.0
- **Routing & Navigation:** State-driven unified tab navigation with SPA deep-link fallback (`/explore`, `/my-listings`, `/rentals`, `/admin`, `/messages`)
- **API Client:** Native `fetch` wrapper in `client/src/services/api.ts` with relative `/api` base URL (dynamic same-origin resolution)
- **Build Output:** `client/dist/` (Static HTML, CSS, JavaScript chunks)

### 2.2 Backend Architecture
- **Runtime:** Node.js v22.x LTS
- **Framework:** Express 4.21.2
- **Language:** TypeScript 5.7.2 compiled to CommonJS in `server/dist/`
- **Real-time Protocol:** Socket.IO 4.8.1 (Room-based chat and status event broadcasting)
- **Security & Middleware:**
  - `cors` 2.8.5 with reflected origin support for credentialed requests
  - `express-rate-limit` 7.5.0
  - `jsonwebtoken` 9.0.2 for stateless JWT session tokens
  - `bcryptjs` 2.4.3 for password hashing
  - Reverse proxy trust enabled (`app.set('trust proxy', 1)`)
  - Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`)

### 2.3 Database & ORM
- **Database Engine:** SQLite (single-file relational database)
- **ORM:** Prisma Client 5.22.0
- **Datasource:** `file:./dev.db` (local dev) / `file:/data/borrowcircle.db` (persistent staging volume)
- **Current Active Database File:** `server/prisma/dev.db` (Size: ~1.12 MB)
- **Core Entities:**
  - `User` (Dual-mode: BORROWER / LENDER; roles: USER / ADMIN)
  - `Item` (Equipment catalog with categories, GPS location, condition logs)
  - `ItemImage` (Image attachments)
  - `Category` (System equipment taxonomy)
  - `Booking` (Complete rental lifecycle: PENDING, PAYMENT_PENDING, CONFIRMED, READY_FOR_PICKUP, ACTIVE, RETURN_REQUESTED, INSPECTION_PENDING, COMPLETED, CANCELLED, REJECTED, DISPUTED)
  - `ExtensionRequest` (Rental extension approvals)
  - `InspectionRecord` (15-minute return inspection logs)
  - `DamageClaim` (Dispute management and compensation claims)
  - `Payment` (Transaction records and Razorpay webhook tracking)
  - `Review` (Dual-sided ratings and trust scoring)
  - `Message` (Peer-to-peer equipment chat)
  - `Notification` (In-app notifications)
  - `WishlistItem` (Saved user equipment)

### 2.4 Media & Storage Subsystem
- **Handler:** Multer 1.4.5 disk storage
- **Upload Endpoint:** `/api/upload/image` (MIME validation: JPEG, PNG, WebP; 5 MB size limit)
- **Storage Target:** Configurable via `CONFIG.UPLOAD_DIR` (defaults to local `uploads/`)
- **Public Serving:** Static Express route at `/uploads/*`
- **Staging Requirement:** Mounted persistent volume required so user-uploaded photos survive container restarts.

---

## 3. Git & Repository Status

| Attribute | Current Value |
|---|---|
| **Local Git Repository** | Not yet initialized in `borrowcircle` root |
| **Existing Remotes** | None |
| **Existing Branches** | None |
| **Global Git User** | `Pratham More` (`morepratham78-ops`) |
| **Default Branch** | `main` |
| **Target GitHub Account** | `https://github.com/morepratham78-ops` |
| **Target Repository Name** | `BorrowCircle` |
| **Target Visibility** | **Private** |
| **Existing Public Repos** | Checked via GitHub API: `BorrowCircle` does not exist publicly on `morepratham78-ops` |

---

## 4. Build & Run Pipeline

### Build Commands:
```bash
# 1. Compile backend TypeScript
cd server && npm install && npx prisma generate && npm run build

# 2. Compile frontend Vite SPA
cd ../client && npm install && npm run build
```

### Start Command (Unified Monolith):
```bash
cd server && node dist/index.js
```
The server binds to `process.env.PORT || 5000`, serves the compiled SPA from `client/dist`, handles all API traffic under `/api/*`, and handles WebSocket connections.

---

## 5. Environment Variables & Configuration Requirements

| Variable | Staging Value / Description | Required By |
|---|---|---|
| `PORT` | `5000` (or dynamically injected by PaaS provider) | Server |
| `NODE_ENV` | `staging` (or `production`) | Server |
| `DATABASE_URL` | `file:/data/borrowcircle.db` (Persistent volume mount) | Prisma & Server |
| `JWT_SECRET` | 64-character high-entropy cryptographic secret | Server / Auth |
| `CORS_ORIGIN` | Target staging origin (e.g. `https://borrowcircle-staging.up.railway.app` or `*`) | Server / CORS |
| `UPLOAD_DIR` | `/data/uploads` (Mounted persistent volume path) | Multer / Static |
| `RAZORPAY_KEY_ID` | `rzp_test_...` (Sandbox test credentials only) | Payment Gateway |
| `RAZORPAY_KEY_SECRET` | Razorpay test secret key | Payment Gateway |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured in Razorpay Webhook settings | Payment Webhook |
| `ADMIN_EMAIL` | `admin@borrowcircle.in` | Seed / Admin Auth |
| `ADMIN_PASSWORD` | Cryptographically secure passphrase | Seed / Admin Auth |

---

## 6. Pre-Commit Security & Exclusion Checklist

The root `.gitignore` currently defines:
- `node_modules/`
- `.env`, `.env.*`, `*.env` (except `.env.example`)
- `*.db`, `*.db-journal`, `dev.db`, `server/prisma/*.db`
- `dist/`, `build/`
- `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`
- `*.log`

### Security Audit Findings:
1. `server/.env` exists locally and contains local development secrets. It is strictly excluded by `.gitignore` and **will NOT be committed**.
2. `server/prisma/dev.db` contains local test SQLite records. It is strictly excluded by `server/prisma/*.db` and **will NOT be committed**.
3. Scratch test scripts (`server/debug_*.js`, `server/test_*.js`, `scratch/*`) were created during previous debugging sessions. They should be reviewed and excluded or kept outside the commit to preserve repository cleanliness.
4. No hardcoded production API keys or credentials exist in the client or server codebase.

---

## 7. Next Actions Requiring User Authorization

In accordance with Phase 2 of the task specification:
1. **GitHub Connection & Repository Creation:**
   - Authorize repository creation for `BorrowCircle` under `https://github.com/morepratham78-ops` as a **PRIVATE** repository.
   - Authorize Git initialization (`git init`) in the project root.
2. **Push Authorization:**
   - Review and authorize the initial commit and push to `origin/main` of the private repository.
3. **Hosting Selection:**
   - Select the preferred PaaS hosting target (**Railway**, **Render**, or **Fly.io**) for unified monolith deployment with persistent volume storage for SQLite and uploads.
