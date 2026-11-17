# BorrowCircle (Hyperlocal Equipment & Resource Rental Marketplace)
> **"Borrow Anything. Share Everything."**

BorrowCircle is a production-grade, full-stack peer-to-peer equipment and resource-sharing platform built for the Indian market. It connects equipment owners with nearby borrowers at transparent hourly rates, powered by Ola/Uber-style dual-OTP verification, a mandatory 15-minute post-return inspection window, tamper-resistant digital equipment passports, and instant simulated UPI escrow payments.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm

### 1-Click Launch (Windows)
Double-click `run.bat` in the root folder, or run:
```cmd
run.bat
```
This boots the unified full-stack server on **`http://localhost:5000`** with pre-seeded database and pre-compiled client assets.

### Manual Launch
```cmd
# 1. Start Server (Express + SQLite + Socket.IO + Static Client)
cd server
npm start
# Server listens at http://localhost:5000

# 2. (Optional) Run Vite Dev Server for Frontend Hot-Reloading
cd client
npm run dev
# Vite runs at http://localhost:3000 (proxies /api -> localhost:5000)
```

---

## 🔑 Pre-Seeded Demo Accounts

Every account can seamlessly **borrow** and **lend** without switching profiles.

| Role | Email / Phone | Password | Features / Role |
|---|---|---|---|
| **Platform Admin** | `admin@borrowcircle.in` | `admin123` | Moderate pending listings, resolve disputes, configure commissions |
| **Verified Lender** | `priya.patel@example.com` (`+919876543211`) | `password123` | Listed Sony A7 IV Camera, Bosch Hammer Drill, Canon Lens |
| **Active Borrower** | `rahul.sharma@example.com` (`+919876543210`) | `password123` | Active live rental timer, booking history, Aadhaar verified |
| **New Neighbor** | `amit.verma@example.com` (`+919876543212`) | `password123` | Community wish-wall contributor, camping enthusiast |

*Phone OTP (Dev Mode):* Printed in API response body (or use demo code `123456`).  
*Aadhaar Demo OTP:* `882200` (shows legally required *"Demo Verification – Not Government Verified"* banner).

---

## 🏗️ Architecture & Technology Stack

```
borrowcircle/
├── client/                     # Frontend (React 18, TypeScript, Tailwind CSS, Vite)
│   ├── src/
│   │   ├── components/        # Navbar, Navigation (desktop sidebar + mobile bottom bar)
│   │   ├── screens/           # Auth, Explore, MyRentals, MyListings, CreateListing,
│   │   │                      # Messages, TrustSafety, Community, AdminConsole, EquipmentDetailModal
│   │   ├── services/api.ts    # Comprehensive API client wrapper (40+ endpoints)
│   │   └── types.ts           # Unified TypeScript domain definitions
│   └── dist/                  # Production-optimized build (served directly by Express)
│
├── server/                     # Backend API (Express.js, TypeScript, Prisma ORM, Socket.IO)
│   ├── prisma/
│   │   ├── schema.prisma      # Relational schema (18 models: Items, Bookings, Payments, etc.)
│   │   └── seed.ts            # Indian hyperlocal seed data (12 categories, 10 items, live bookings)
│   ├── src/
│   │   ├── middleware/        # JWT auth, requireAdmin, RBAC
│   │   ├── services/          # PricingService (exact ₹15 formulas), OtpService, TrustService
│   │   ├── routes/            # auth, items, approvals, bookings, claims, chat, community, admin
│   │   └── index.ts           # Express app + Socket.IO server + static SPA hosting
│   └── dev.db                 # SQLite local database
└── run.bat                     # Windows quick-launch script
```

---

## 💰 Exact Hourly Pricing Formula (Section 9)

```
Rental Amount      = Hourly Rate × Billable Usage Duration (Hours)
Borrower Fee       = ₹15 (Fixed platform commission)
Security Deposit   = Set by owner (100% refundable upon clean inspection)
Delivery Fee       = ₹0 (Self-pickup) OR Owner Delivery Charge
----------------------------------------------------------------------
Total Payable      = Rental Amount + ₹15 + Security Deposit + Delivery Fee

Lender Earnings    = Rental Amount - ₹15 (Lender platform fee)
BorrowCircle Rev   = ₹15 (Borrower) + ₹15 (Lender) = ₹30 per completed booking
```

---

## 🔄 Dual-OTP Handover & 15-Minute Inspection Lifecycle

```
[ PENDING ] ──(Owner Accepts)──> [ PAYMENT_PENDING ] ──(UPI Pay)──> [ READY_FOR_PICKUP ]
                                                                           │
                                                    (Borrower gives Handover OTP)
                                                                           ▼
[ RETURN_REQUESTED ] <──(Borrower Requests Return)─── [ ACTIVE (Live Timer) ]
        │
 (Owner enters Return OTP)
        ▼
[ INSPECTION_PENDING (Strict 15-Min Window) ]
   ├── [ No Damage Reported ] ──> [ COMPLETED ] ──> Full Deposit Released
   └── [ Damage Claim Filed ] ──> [ DISPUTED ]  ──> Admin Mediation Panel
```

---

## 🛡️ Trust & Safety Modules
- **Algorithmic Trust Score (0–100):** Weighted by phone verification (+15), Aadhaar verification (+25), completed lends (+10 each), borrower ratings, and dispute-free history.
- **Digital Equipment Passport:** Every item receives a unique serial (`BC-IN-...`) tracking its complete rental count, cumulative usage hours, and tamper-resistant maintenance logs.
- **Section 7 Admin Moderation:** New listings start in `PENDING_APPROVAL` status and only become discoverable after administrator review.
