# AI_USAGE.md — Penggunaan AI dalam Pengerjaan

## Tools & Model yang Digunakan

| Tool | Model | Kegunaan |
|------|-------|----------|
| Kiro IDE | Claude Sonnet 4.5 (Anthropic) | Coding assistant utama |
| GitHub Copilot | — | Autocomplete inline |

---

## Bagian yang Dikerjakan dengan Bantuan AI

### 1. Scaffolding Awal Proyek
AI membantu membuat struktur monorepo (pnpm workspaces), konfigurasi `tsconfig.json`, `nest-cli.json`, dan boilerplate module NestJS (controller, service, module, DTO).

### 2. Prisma Schema & Migrasi
AI membantu menulis schema Prisma lengkap termasuk relasi, enum, dan index. Keputusan tipe data (BigInt untuk ID order, UUID untuk customer) dan alasan normalisasi tetap diputuskan secara manual.

### 3. Implementasi Pessimistic Locking
AI membantu menulis pola `SELECT FOR UPDATE` di dalam `prisma.$transaction()` dan logika sort product ID untuk menghindari deadlock. Strategi pemilihan pessimistic vs optimistic locking diputuskan secara manual berdasarkan pertimbangan domain.

### 4. Order State Machine
AI membantu menulis class `OrderStateMachine` dengan tabel transisi yang valid dan mekanisme `validateTransition()`. Review logika role dan edge case dilakukan secara manual.

### 5. Idempotency Key
AI membantu menulis pola status 202/201/409 pada tabel `idempotency_keys` di PostgreSQL. Keputusan menggunakan tabel DB (bukan Redis) diputuskan secara manual karena durabilitas.

### 6. BullMQ Job Processors
AI membantu membuat `InvoiceProcessor` dan `NotificationProcessor` beserta konfigurasi retry dan idempotency per-job.

### 7. Redis Cache Layer
AI membantu menulis fungsi `invalidateDashboardCache()`, `invalidateSalesReportCache()`, dan `invalidateTopProductsCache()` di `ReportsService`, serta pola integrasi di `OrdersService`.

### 8. Seed Data
AI membantu menulis generator seed (`prisma/seed.ts`) untuk 50 produk, 30 customer, dan 108 order yang tersebar dalam 90 hari dengan distribusi status yang realistis.

### 9. Frontend Pages
AI membantu membuat halaman-halaman Next.js (orders, products, reports, monitoring) termasuk tabel, pagination, dan integrasi TanStack Query.

### 10. Konfigurasi Docker & CI
AI membantu menulis `Dockerfile` multi-stage berbasis pnpm, `.dockerignore`, dan workflow GitHub Actions. Debugging masalah npm vs pnpm dan path standalone Next.js dilakukan secara iteratif bersama AI.

### 11. Dokumentasi
AI membantu menyusun struktur dan isi `README.md`, `ARCHITECTURE.md`, dan `DECISIONS.md`.

---

## Bagian yang Ditulis / Diubah Sendiri

- Keputusan arsitektur utama: pemilihan pessimistic locking, strategi idempotency berbasis DB, TTL Redis
- Review dan koreksi semua kode yang dihasilkan AI (type errors, method name Redis, path Docker)
- Debugging runtime: fix nested `<tbody>` di orders table, fix path `server.js` standalone Next.js, fix 304 ETag, fix data path `response.data.data`
- Integrasi antar modul: `JobsModule` ke `AppModule`, inject `ReportsService` ke `OrdersService`
- Menjalankan seed, test, dan verifikasi output secara manual

---

## 3–5 Prompt Utama (Disalin Apa Adanya)

### Prompt 1
```
Perform a comprehensive codebase audit of the order management system project.
I need to understand: 1. Project Structure, 2. Database Layer, 3. Backend Architecture,
4. Frontend Architecture, 5. Testing, 6. Docker & CI/CD, 7. Documentation.
Focus on ACTUAL implementation, not what should be there.
Identify what's working, what's missing, and what's broken.
```

### Prompt 2
```
Upgrade apps/api/prisma/seed.ts to create: 50 products with realistic pricing,
30 customers with diverse data, 150+ orders across 90 days with proper status distribution
(50% PAID, 25% SHIPPED, 25% COMPLETED) for reports testing.
```

### Prompt 3
```
Create comprehensive concurrency test: 20 parallel orders for same product (stock 5).
Expected: 5 success, 15 fail, final stock = 0, no negative stock, no partial orders.
Use real PostgreSQL via Prisma transactions.
```

### Prompt 4
```
Implement BullMQ job processors for: 1. Invoice generation on order PAID
(prevent duplicates), 2. Low-stock alerts (1-hour cooldown). Each job should
audit log, handle errors, support retries.
```

### Prompt 5
```
bagian orders tampilan tablenya samakan aja kaya di products ya biar seragam,
dan di table products itu di nama customernya ganampil,
di bgin reports datanya ganmpil jg
```

---

## Catatan

Seluruh kode dalam repository ini dipahami dan dapat dijelaskan. Penggunaan AI difokuskan pada implementasi pola yang sudah diputuskan secara arsitektur — bukan untuk mengambil keputusan desain. Setiap file yang dihasilkan AI di-review, diuji, dan dalam banyak kasus diperbaiki secara manual sebelum di-commit.
