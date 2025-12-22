# Database Schema Gap Analysis

**Date:** 2025-12-18
**Environment:** Docker (PostgreSQL)

## Executive Summary
The current database schema state is inconsistent with the project's codebase. There is no single source of truth: `init.sql` is outdated, migrations are split across multiple directories (`backend/migrations` vs `backend/src/migrations`), and the database itself lacks the `SequelizeMeta` table to track applied migrations.

## Critical Findings

### 1. Missing Migration Tracking
- **Issue:** The `SequelizeMeta` table is **MISSING** from the database.
- **Impact:** Automatic migration tools cannot determine which migrations have been applied. Attempting to run migrations may cause errors (e.g., trying to create existing tables/columns) or skip necessary updates.

### 2. Dual Migration Directories
- **Issue:** Migration files exist in two separate locations:
  1.  `backend/migrations/` (Contains ~32 files, mixed formats, mostly CommonJS)
  2.  `backend/src/migrations/` (Contains 4 files, ESM format)
- **Impact:** It is unclear which directory represents the definitive migration path. The database appears to have applied changes from *both* directories (e.g., `device_tokens` from `src/migrations` and `reactions` from `migrations`), but without tracking.

### 3. `init.sql` vs. Running Database
The `backend/docker/postgres/init.sql` file is significantly outdated compared to the running database schema.

| Feature | `init.sql` | Running Database | Source |
| :--- | :--- | :--- | :--- |
| `device_tokens` Table | ❌ Missing | ✅ Present | `backend/src/migrations/20251106000002...` |
| `messages.reactions` Column | ❌ Missing | ✅ Present | `backend/migrations/20251104...` |
| `users` 2FA Fields | ❌ Missing | ✅ Present | `backend/src/migrations/20251106000001...` |
| `users` Consent Fields | ❌ Missing | ✅ Present | `backend/src/migrations/20251106000000...` |
| `contacts.is_muted` | ❌ Missing | ✅ Present | `backend/src/migrations/20251103...` |

### 4. Unapplied Schema Changes
Despite the database containing recent changes like `reactions` and `device_tokens`, one specific migration appears to be missing:

- **Missing Value:** `'call'` in `message_type` enum.
- **Defined In:** `backend/migrations/20251031-add-call-message-type.cjs`
- **Current Enum:** `('text', 'image', 'file', 'system')`
- **Expected Enum:** `('text', 'image', 'file', 'system', 'call')`

## Recommendations

1.  **Consolidate Migrations:** Move all valid migrations to a single directory (e.g., `backend/migrations`) and standardize the format (CJS or ESM).
2.  **Baseline `init.sql`:** Update `init.sql` to reflect the *current* state of the running database (effectively a schema dump).
3.  **Restore Migration Tracking:**
    *   Initialize `SequelizeMeta` in the database.
    *   Mark all currently applied migrations (from both folders) as "executed" in `SequelizeMeta` to prevent re-execution issues.
4.  **Apply Missing Changes:** Manually apply the missing `'call'` value to the `message_type` enum or fix the migration system to handle it.
