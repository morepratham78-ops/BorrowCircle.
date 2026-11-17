# BorrowCircle — Staging & Production Deployment Checklist

Use this checklist prior to promoting code, migrating infrastructure, or declaring a release complete.

---

## Phase 1: Pre-Deployment Build & Configuration Audit

- [ ] **TypeScript Compilation (Backend):** Ran `npx tsc` inside `server/` with **0 errors**.
- [ ] **Vite Production Build (Frontend):** Ran `npm run build` inside `client/` generating `dist/` with **0 errors**.
- [ ] **No Localhost References in Client:** Checked `client/src/` to confirm API calls resolve to dynamic `import.meta.env.VITE_API_BASE_URL` or relative `/api`.
- [ ] **SPA Fallback Verification:** Confirmed Express or Nginx serves `index.html` for client-side deep links (`/explore`, `/my-listings`, `/rentals`, `/admin`, `/messages`).
- [ ] **CORS Origins Configured:** Verified `CORS_ORIGIN` matches target domain(s) (`https://staging.borrowcircle.in` or specific origins).
- [ ] **Security Headers Enabled:** Verified `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` are dispatched by Express.
- [ ] **Reverse Proxy Trust:** Confirmed `app.set('trust proxy', 1)` is enabled in `server/src/index.ts`.

---

## Phase 2: Database & Storage Integrity

- [ ] **Persistent Volume Assigned:** Confirmed the SQLite database file (`dev.db` / `staging.db`) resides on a mounted persistent volume, or PostgreSQL managed instance is reachable.
- [ ] **Safe Schema Sync:** Executed `npx prisma db push` or `npx prisma migrate deploy` **without** resetting or deleting existing user data.
- [ ] **Backup Executed:** Took a full atomic backup snapshot before performing any deployment schema update.
- [ ] **Seed Catalog Verified:** Confirmed the 12 core equipment categories (`Tools and Hardware`, `Electronics`, `Cameras`, `Home Appliances`, etc.) are populated.
- [ ] **Historical Records Untouched:** Verified all past booking and payment records remain intact with zero deposit columns preserved.

---

## Phase 3: Security & Access Control

- [ ] **JWT Secret Provisioned:** Verified `JWT_SECRET` is set to a unique, cryptographically random string (not the default fallback key).
- [ ] **Public Registration Privilege Check:** Verified `POST /api/auth/register` cannot be used to create `ADMIN` accounts (server enforces `role: 'USER'`).
- [ ] **Admin Endpoint Protection:** Verified that unauthenticated or non-admin requests to `/api/admin/*` receive `401 Unauthorized` or `403 Forbidden`.
- [ ] **Default Admin Credentials Rotated:** Confirmed default weak password (`admin123`) has been replaced with a secure passphrase.
- [ ] **File Upload Sanitization:** Confirmed `/api/upload/image` restricts uploads to JPEG, PNG, WebP with a 5MB maximum file size.
- [ ] **Secret Hygiene in Git:** Confirmed `.gitignore` excludes `.env`, `*.db`, `node_modules/`, and build artifacts from Git commits.

---

## Phase 4: Payment Gateway & Webhook Staging Configuration

- [ ] **Sandbox Mode Selected:** Confirmed Razorpay credentials use test keys (`rzp_test_...`).
- [ ] **Webhook Endpoint Configured:** Configured webhook URL in Razorpay Dashboard:
  `https://<your-staging-domain>/api/bookings/payment/webhook`
- [ ] **Webhook Secret Matched:** Verified `RAZORPAY_WEBHOOK_SECRET` matches the secret configured in Razorpay Dashboard.
- [ ] **Supported Events Selected:** Subscribed to `payment.captured`, `order.paid`, and `payment.failed`.
- [ ] **Transparent Missing-Credential Error Verified:** Verified that when credentials are not configured, endpoint returns `BLOCKED (Payment Gateway Credentials Missing)` without fabricating fake successes.

---

## Phase 5: Post-Deployment Smoke Test (Zero-Deposit & Role Journeys)

Execute these live checks on the deployed staging URL:

- [ ] **1. Health Endpoint:** `GET /api/health` returns status `ONLINE`.
- [ ] **2. Borrower Registration:** Register a new borrower account; verify default mode is `BORROWER`.
- [ ] **3. Browse & Filter:** Search equipment by keyword and category; verify item cards display without security deposit fees.
- [ ] **4. Equipment Details Modal:** Open equipment detail modal; verify checkout summary lists only rental charges, platform fee (₹15), and delivery (if selected). Confirm deposit is **₹0**.
- [ ] **5. Create Equipment Listing (Lender):** Switch to `LENDER` mode, create listing, verify form does **not** prompt for a security deposit.
- [ ] **6. Admin Review:** Log in as Admin (`admin@borrowcircle.in`), navigate to Admin panel, and approve newly listed equipment.
- [ ] **7. Request Rental:** In borrower account, request a rental booking. Confirm quote excludes security deposits.
- [ ] **8. Lender Accept:** In lender account, accept the booking request.
- [ ] **9. Handover OTP:** Borrower clicks "Request Handover OTP"; lender verifies 6-digit OTP; booking transitions to `ACTIVE`.
- [ ] **10. Return OTP & Inspection:** Borrower generates return OTP; lender inputs OTP; rental enters `INSPECTION_PENDING` window.
- [ ] **11. Clean Inspection Completion:** Lender marks inspection clean; booking transitions to `COMPLETED`; borrower leaves 5-star review.

---

## Phase 6: Rollback Procedure

If unexpected errors occur during staging deployment:

1. **Revert Application Process:**
   ```bash
   pm2 restart borrowcircle-staging --update-env
   # Or roll back Git release tag:
   git checkout <previous-stable-tag>
   cd server && npm run build && cd ../client && npm run build
   pm2 restart borrowcircle-staging
   ```
2. **Restore Database Snapshot:**
   Follow instructions in `DATABASE_BACKUP_GUIDE.md` to restore the pre-deployment database snapshot.
3. **Notify Staging Users:**
   Post deployment incident notice and log details to development error tracker.
