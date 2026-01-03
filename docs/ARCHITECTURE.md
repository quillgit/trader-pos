# System Architecture: Offline-First Sync (SQLite/IndexedDB <-> MariaDB)

## Overview

This document outlines the architecture for synchronizing the Commodity Trader PWA (Offline-First) with a central MariaDB backend.

The system is designed to allow the PWA to operate fully offline using local storage (IndexedDB via LocalForage, or optionally SQLite WASM) and synchronize with a central server when an internet connection is available.

## Components

1.  **Client (PWA)**
    *   **UI Layer**: React + Vite.
    *   **Local Database**:
        *   Current: `localforage` (IndexedDB) with separate stores mimicking tables.
        *   Future/Option: `sqlite-wasm` (SQLite 3) for relational queries in browser.
    *   **Sync Engine**: A background service that manages the sync queue and pull/push operations.

2.  **Server (Backend)**
    *   **Database**: MariaDB (Schema defined in `backend/schema.sql`).
    *   **API**: RESTful API (Node.js, PHP, or Python) exposing sync endpoints.

## Database Schema (MariaDB)

The backend uses a normalized relational schema. Key tables include:
*   `products`, `partners`, `employees` (Master Data)
*   `transactions`, `transaction_items` (Transactional Data)
*   `cash_sessions`, `expenses` (Cash Management)
*   `attendance` (HRIS)

All tables use `CHAR(36)` UUIDs for primary keys to ensure collision-free ID generation on offline clients.
All tables include `updated_at` (for sync tracking) and `deleted_at` (for soft deletes).

## Synchronization Protocol

The sync process follows a **"Last-Write-Wins" (LWW)** strategy based on timestamps.

### 1. Data States
Each record in the local database has:
*   `id`: UUID.
*   `updated_at`: ISO Timestamp of last modification.
*   `sync_status`: `PENDING` (needs push) or `SYNCED`.

### 2. Push (Client -> Server)
1.  Client identifies all records where `sync_status = 'PENDING'`.
2.  Client groups these records by table/type.
3.  Client sends a `POST /api/sync/push` request with the payload:
    ```json
    {
      "transactions": [ ... ],
      "partners": [ ... ],
      "last_sync_timestamp": "2023-10-01T12:00:00Z"
    }
    ```
4.  Server processes the batch:
    *   For each record, check if `server.updated_at > client.updated_at`.
    *   If Server is newer, ignore Client change (Conflict: Server Wins).
    *   If Client is newer, update Server record.
5.  Server responds with success/failure.
6.  Client marks sent records as `SYNCED`.

### 3. Pull (Server -> Client)
1.  Client requests changes since last successful sync:
    `GET /api/sync/pull?since=2023-10-01T12:00:00Z`
2.  Server queries all tables for records where `updated_at > since`.
3.  Server returns the changed records.
4.  Client updates local database:
    *   Overwrite local record with server record.
    *   Update `last_sync_timestamp` to the Server's current time.

## SQLite Integration (Future Proofing)

While the current implementation uses `localforage`, the architecture is ready for `sqlite-wasm`.

*   **Migration Path**:
    1.  Install `@sqlite.org/sqlite-wasm`.
    2.  Create a `SqliteAdapter` implementing the same interface as the current `StorageService`.
    3.  Replace `localforage` calls with SQL queries (e.g., `INSERT OR REPLACE INTO...`).

The Sync Protocol remains identical regardless of the local storage engine, as long as UUIDs and Timestamps are used.

## Implementation Steps

1.  **Backend**: Deploy MariaDB and `backend/schema.sql`. Implement API endpoints.
2.  **Frontend**: Update `SyncEngine` to use the Batch Push/Pull protocol instead of the current single-item Queue.
3.  **Config**: Set `VITE_API_URL` to the new backend.
