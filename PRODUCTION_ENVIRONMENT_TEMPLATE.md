# BorrowCircle — Production Environment Configuration Template

This document details every environment variable required by BorrowCircle, including type, descriptions, security recommendations, and generation commands.

> [!CAUTION]
> Never commit actual production or staging secrets to version control. Keep `.env` files strictly on the deployment server or managed via secure environment secret stores (AWS Secrets Manager, Doppler, Railway Secrets, Render Env).

---

## 1. Backend Environment Variables (`server/.env`)

| Variable Name | Required | Default / Example Value | Description & Security Guidelines |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` (or `staging`) | Sets Node environment. In `production`, internal stack traces are suppressed, debug logging disabled, and secure error messages returned. |
| `PORT` | **Yes** | `5000` | Port on which the HTTP & Socket.IO server listens. Commonly provided dynamically by PaaS providers. |
| `CORS_ORIGIN` | **Yes** | `https://borrowcircle.in` | Comma-separated list of allowed origins. Use `*` only if the frontend is hosted on arbitrary preview subdomains. In production, restrict to exact domain(s). |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@host:5432/borrowcircle` | Database connection string. For SQLite on persistent volume: `file:/data/borrowcircle.db`. For PostgreSQL: `postgresql://user:password@host:5432/dbname?sslmode=require`. |
| `JWT_SECRET` | **Yes** | *[Generate via openssl]* | Secret key used to sign and verify JSON Web Tokens. Must be a cryptographically secure random string with at least 256 bits of entropy. |
| `RAZORPAY_KEY_ID` | **Yes** | `rzp_test_xxxxxxxxxxxxxxxx` | Razorpay API Key ID from Dashboard. Use `rzp_test_...` for staging and sandbox testing; use `rzp_live_...` only after production authorization. |
| `RAZORPAY_KEY_SECRET` | **Yes** | *[From Razorpay Dashboard]* | Razorpay API Secret. Must never be exposed to frontend or client-side code. |
| `RAZORPAY_WEBHOOK_SECRET` | **Yes** | *[From Razorpay Webhook settings]* | Secret configured in Razorpay Webhooks (`/api/bookings/payment/webhook`). Used for server-side HMAC-SHA256 signature verification. |
| `ADMIN_EMAIL` | **Yes** | `admin@borrowcircle.in` | Primary administrator account email address initialized during seed or migration. |
| `ADMIN_PASSWORD` | **Yes** | *[Generate strong password]* | Passphrase used during database seeding or runtime provisioning of the administrator account. |
| `DEFAULT_LENDER_COMMISSION` | Optional | `15` | Default lender platform commission fee in ₹ (INR) deducted from lender earnings per rental. Configurable at runtime via Admin UI. |
| `DEFAULT_RECEIVER_COMMISSION`| Optional | `15` | Default borrower platform commission fee in ₹ (INR) added to quote per rental. Configurable at runtime via Admin UI. |
| `DEFAULT_INSPECTION_MINUTES` | Optional | `15` | Return inspection grace window in minutes during which lender inspects returned equipment before automatic settlement. |
| `STATIC_CLIENT_PATH` | Optional | `""` (Empty defaults to `../../client/dist`)| Absolute or relative path to compiled frontend assets if hosted outside default relative folder. |

---

## 2. Frontend Environment Variables (`client/.env.production`)

| Variable Name | Required | Example Value | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Optional | `/api` | Base URL for REST API calls. If frontend is served by the same reverse proxy / monolith server, leave as `/api`. If frontend is hosted separately on Vercel/Netlify, set to `https://api.borrowcircle.in/api`. |

---

## 3. Secret Generation Commands

### Generating High-Entropy JWT Secret
Run in terminal:
```bash
openssl rand -base64 48
```
*Example Output:*
`7VdK+9n3mN8kX3qF4pL2a1b9c8d7e6f5g4h3j2k1m0n9p8q7r6s5t4u3v2w1x0y9`

### Generating Administrator Password
```bash
openssl rand -base64 18
```

---

## 4. Production `.env` File Example Template

```env
# =====================================================
# BORROWCIRCLE PRODUCTION CONFIGURATION
# =====================================================

# Server & Runtime
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://borrowcircle.in,https://www.borrowcircle.in

# Database Connection (PostgreSQL Example)
DATABASE_URL="postgresql://borrowcircle_user:SECURE_DB_PASSWORD@postgres-host:5432/borrowcircle_prod?schema=public&sslmode=require"

# JWT Authentication
JWT_SECRET="GENERATE_USING_OPENSSL_AND_PASTE_HERE"

# Razorpay Sandbox / Staging Credentials
RAZORPAY_KEY_ID="rzp_test_REPLACE_WITH_YOUR_KEY"
RAZORPAY_KEY_SECRET="REPLACE_WITH_YOUR_SECRET"
RAZORPAY_WEBHOOK_SECRET="REPLACE_WITH_YOUR_WEBHOOK_SECRET"

# Platform Governance
ADMIN_EMAIL="admin@borrowcircle.in"
ADMIN_PASSWORD="REPLACE_WITH_STRONG_ADMIN_PASSWORD"
DEFAULT_LENDER_COMMISSION=15
DEFAULT_RECEIVER_COMMISSION=15
DEFAULT_INSPECTION_MINUTES=15
```
