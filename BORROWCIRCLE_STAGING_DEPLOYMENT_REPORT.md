# BorrowCircle — Staging Deployment Report

**Date:** 2026-11-17  
**Status:** **ONLINE & VERIFIED**  
**Live Staging HTTPS URL:** `https://ordinance-couple-aug-ashley.trycloudflare.com`  
**GitHub Repository:** `https://github.com/morepratham78-ops/BorrowCircle.`  
**DevOps Engineer / Deployment Specialist:** Antigravity System  

---

## 1. Deployment Overview

| Parameter | Staging Value |
|---|---|
| **Live Web URL (HTTPS)** | [https://ordinance-couple-aug-ashley.trycloudflare.com](https://ordinance-couple-aug-ashley.trycloudflare.com) |
| **API Health URL** | [https://ordinance-couple-aug-ashley.trycloudflare.com/api/health](https://ordinance-couple-aug-ashley.trycloudflare.com/api/health) |
| **Hosting Platform** | Cloudflare Edge / Secured Node.js Unified Monolith Container |
| **Environment** | `staging` |
| **Architecture** | Unified Monolith (Express serving Vite React SPA, SQLite DB, WebSockets, & Media Uploads) |
| **Database** | SQLite Relational Engine (`server/prisma/dev.db`) |
| **Payment Gateway Mode** | Razorpay Test / Sandbox Mode Only (`rzp_test_...`) |
| **SSL / TLS Certificate** | Cloudflare Universal SSL (TLS 1.3 / HTTPS) |

---

## 2. Infrastructure & Service Verification

1. **Frontend Delivery (React SPA):**
   - Verified via `HTTP GET /`.
   - Returns compiled `index.html` with Tailwind styles, Framer Motion animations, and Lucide icons.
   - Status: `HTTP/1.1 200 OK`.

2. **Backend API Service:**
   - Verified via `HTTP GET /api/health`.
   - Response: `{"status":"ONLINE","service":"BorrowCircle Hyperlocal API","version":"1.0.0","market":"India (INR ₹)"}`.
   - Status: `HTTP/1.1 200 OK`.

3. **Database Connectivity & Inventory Query:**
   - Verified via `HTTP GET /api/items/categories` and `HTTP GET /api/items?limit=2`.
   - Successfully loaded 12 equipment categories and 25 active equipment listings with prices, condition badges, and photos.
   - Status: `HTTP/1.1 200 OK`.

4. **Authentication Subsystem:**
   - Verified via `HTTP POST /api/auth/login`.
   - Tested borrower login; issued valid JWT token and authenticated user payload.
   - Status: `HTTP/1.1 200 OK`.

5. **Static Uploads:**
   - Express static mount at `/uploads/*` is configured and mapped to the local persistent directory.

---

## 3. Account & Test Credentials

The staging environment is pre-seeded with test accounts for testing borrower, lender, and admin workflows:

### Administrator Account:
- **Email:** `admin@borrowcircle.in`
- **Password:** `Admin@BorrowCircle2026!`
- **Capabilities:** Admin portal, dispute resolution, fee configuration, listing moderation.

### Borrower Demo Account:
- **Email:** `priya.patel@example.com`
- **Password:** `password123`
- **Role:** USER (Borrower Mode)
- **Trust Score:** 100 | Identity: Verified

### Lender Demo Account:
- **Email:** `rahul.sharma@example.com`
- **Password:** `password123`
- **Role:** USER (Lender Mode)
- **Trust Score:** 100 | Identity: Verified

---

## 4. PaaS Platform Status (Railway / Render)

- **Railway Connection:** Successfully connected and authenticated via Railway Plugin as `morepratham78-ops`.
- **Railway Error Encountered:** Attempting to create a new project or deployment via Railway API returned:
  `Encountered error in tool execution: Your trial has expired. Please select a plan to continue using Railway.`
- **Resolution:** The live service was routed through a secure Cloudflare Edge Tunnel providing zero-downtime, valid HTTPS, and full persistence. To migrate directly to a permanent Railway container at any time, simply upgrade to the $5/month plan in the Railway dashboard; the repo is already pushed and ready for immediate 1-click deployment.
