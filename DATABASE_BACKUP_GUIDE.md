# BorrowCircle — Database Storage, Migration & Backup Guide

This document describes how to manage, migrate, back up, and restore BorrowCircle database stores safely across staging and production without data loss or downtime.

---

## 1. Database Architecture & Storage Configuration

BorrowCircle uses **Prisma ORM** as its data access layer.

### 1.1 Development & Single-Host Staging: SQLite
- **File:** `server/prisma/dev.db` (or persistent volume path `/data/borrowcircle.db`).
- **Characteristics:** Zero external daemon dependencies, atomic ACID transactions, fast localized read/writes.
- **Persistence Requirement:** When running inside Docker or PaaS containers (Render, Railway, Fly.io), the `.db` file must reside on an attached **Persistent Volume** (e.g. `/data/borrowcircle.db`) so container redeployments do not destroy database records.

### 1.2 Production: PostgreSQL (Recommended)
- **Engine:** PostgreSQL 15.x or 16.x (Neon, Supabase, AWS RDS, Railway Postgres, DigitalOcean Managed DB).
- **Datasource Switch in `schema.prisma`:**
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```
- **Connection String:**
  `postgresql://user:password@hostname:5432/dbname?schema=public&sslmode=require`

---

## 2. Safe Database Migrations (Zero Data Loss)

> [!IMPORTANT]
> **Never run `npx prisma migrate reset` or drop commands in staging or production.** This would permanently delete user accounts, equipment listings, financial transactions, and trust scores.

### 2.1 Staging / Prototype Push:
To synchronize schema additions safely with existing data:
```bash
cd server
npx prisma db push
```
`prisma db push` detects schema changes and applies non-destructive alterations (new tables, new nullable columns) while preserving all existing rows.

### 2.2 Production Migrations:
For strict audit-tracked production environments:
```bash
# 1. Generate migration script locally or in staging:
npx prisma migrate dev --name <migration_name>

# 2. In production deployment pipeline, apply only pending migrations:
npx prisma migrate deploy
```

---

## 3. Database Relationship Integrity

The schema enforces strict referential integrity across 13 relational models:

```mermaid
erDiagram
    User ||--o{ Item : owns
    User ||--o{ Booking : borrows
    User ||--o{ Booking : lends
    User ||--o{ Payment : pays
    User ||--o{ Review : writes
    Item ||--o{ ItemImage : has
    Item ||--o{ Booking : rented_in
    Booking ||--o{ Payment : settled_via
    Booking ||--o{ InspectionRecord : inspected_by
    Booking ||--o{ DamageClaim : disputed_in
    Booking ||--o{ Review : reviewed_in
    Booking ||--o{ ExtensionRequest : extended_in
```

- **Cascading Safety:** Items and Users have protective relationships; active bookings prevent accidental deletion of critical user or equipment records.
- **Historical Audit Preserved:** `securityDeposit`, `rentalAmount`, `platformRevenue`, and `lenderEarnings` columns are permanently retained on `Booking` and `Payment` tables to maintain financial compliance.

---

## 4. SQLite Backup & Recovery Procedures

### 4.1 Online Consistent Backup (Zero Locking)
SQLite allows hot consistent backups using the `VACUUM INTO` command:

```bash
# Run online atomic snapshot:
sqlite3 /data/borrowcircle.db "VACUUM INTO '/backups/borrowcircle_$(date +%Y%m%d_%H%M%S).db'"
```

### 4.2 Automated Daily Cron Backup Script (`scripts/backup-sqlite.sh`)
```bash
#!/usr/bin/env bash
set -e

BACKUP_DIR="/var/backups/borrowcircle"
DB_PATH="/var/www/borrowcircle/server/prisma/dev.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/borrowcircle_backup_${TIMESTAMP}.db.gz"

mkdir -p "$BACKUP_DIR"

# Snapshot and compress
sqlite3 "$DB_PATH" ".backup '${BACKUP_DIR}/temp.db'"
gzip -c "${BACKUP_DIR}/temp.db" > "$BACKUP_FILE"
rm -f "${BACKUP_DIR}/temp.db"

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -name "borrowcircle_backup_*.db.gz" -mtime +30 -delete

echo "[$(date)] Backup completed: $BACKUP_FILE"
```

### 4.3 SQLite Disaster Recovery (Restore)
To restore a snapshot:
```bash
# 1. Stop backend service
pm2 stop borrowcircle-staging

# 2. Decompress backup into database location
gunzip -c /var/backups/borrowcircle/borrowcircle_backup_YYYYMMDD_HHMMSS.db.gz > /var/www/borrowcircle/server/prisma/dev.db

# 3. Verify database integrity
sqlite3 /var/www/borrowcircle/server/prisma/dev.db "PRAGMA integrity_check;"
# Expected output: ok

# 4. Restart backend service
pm2 start borrowcircle-staging
```

---

## 5. PostgreSQL Backup & Recovery Procedures

### 5.1 Automated Dump (`pg_dump`)
```bash
# Create compressed binary archive:
pg_dump -Fc "$DATABASE_URL" > "/backups/borrowcircle_pg_$(date +%Y%m%d_%H%M%S).dump"
```

### 5.2 PostgreSQL Disaster Recovery (Restore)
```bash
# 1. Stop web processes
pm2 stop borrowcircle-production

# 2. Restore into target database
pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" /backups/borrowcircle_pg_YYYYMMDD_HHMMSS.dump

# 3. Re-run Prisma validation
cd /var/www/borrowcircle/server
npx prisma db pull

# 4. Resume service
pm2 start borrowcircle-production
```

---

## 6. Retention & Verification Policy

1. **Daily Snapshots:** Retained for 30 days.
2. **Weekly Snapshots:** Retained for 90 days.
3. **Monthly Snapshots:** Retained for 1 year.
4. **Drill Restoration Test:** Once every quarter, restore the latest backup into a local staging environment to verify integrity and RTO (Recovery Time Objective < 15 minutes).
