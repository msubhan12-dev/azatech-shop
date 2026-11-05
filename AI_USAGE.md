# Penggunaan AI

## Tools dan Model
- **AI Assistant**: Kiro (Claude-based)
- **Tools**: Semua fitur Kiro IDE untuk code generation, debugging, refactoring

## Bagian Dikerjakan dengan AI

**Persentase**: ~85% struktur & scaffold, 15% manual review & adjustment

1. **Infrastruktur**: Monorepo setup, NestJS API base, Next.js frontend structure
2. **Database**: Prisma schema design, migrations, seeder dengan 150 orders
3. **Backend**: Auth (JWT + refresh), CRUD endpoints, state machine order, concurrency control
4. **Frontend**: Login page, dashboard, semua halaman admin dengan TanStack Query
5. **Testing**: Unit tests (29), component tests (11), E2E tests (9)
6. **DevOps**: Docker Compose, Dockerfiles, GitHub Actions CI

## 3-5 Prompt Utama (Disalin Apa Adanya)

### Prompt 1 (Awal Project)
```
"buatkan project fullstack order management system sesuai requirements berikut:
- NestJS API dengan PostgreSQL + Redis
- Next.js web app dengan modern UI
- Fitur: auth JWT, order CRUD, stock concurrency dengan SELECT FOR UPDATE, 
  idempotency keys, RBAC (admin/cashier), background jobs dengan BullMQ,
  audit logging, Excel export, testing comprehensive
- Gunakan Prisma ORM, TanStack Query, TypeScript strict mode
- Struktur folder: apps/api, apps/web
"
```

### Prompt 2 (Fitur Concurrency)
```
"implementasikan stock concurrency control di order creation:
- Gunakan pessimistic locking SELECT ... FOR UPDATE
- Implementasikan dengan Prisma $queryRaw di dalam transaction
- Tambahkan test dengan 20 concurrent requests untuk product dengan stock=5
- Harus fail 15, succeed 5, final stock = 0
"
```

### Prompt 3 (Frontend Testing)
```
"buat component tests untuk order form:
- 11 test cases: submit valid order, validation errors, duplicate detection,
  total calculation, empty state, API error handling, loading states
- Gunakan Vitest + React Testing Library
- Mock TanStack Query dan API responses
"
```

### Prompt 4 (Deployment & Docs)
```
"buat Docker Compose dengan 6 services:
- API (NestJS port 3001) + Web (Next.js port 3000) + Worker + DB + Redis + Mailpit
- Setup health checks untuk semua services
- Buat dokumentasi README + ARCHITECTURE + DECISIONS dalam bahasa Indonesia
"
```

### Prompt 5 (Playwright E2E)
```
"buat 9 Playwright E2E tests untuk:
- Login flow dengan JWT
- Dashboard metrics verification
- Browse products (50 seeded), customers (30 seeded), orders (150 seeded)
- Audit logs access (admin only)
- Redis + Queue monitoring pages
- Logout flow
- Graceful error handling untuk service disconnections
"
```

## Bagian Manual oleh Developer

1. **Architectural decisions**:
   - Pilih pessimistic locking vs optimistic → pessimistic lebih safe untuk stock
   - Database-backed idempotency vs Redis → durability lebih penting
   - Track A (NestJS) vs Track B (Laravel) → user preference

2. **Bug fixes & debugging**:
   - TypeScript type errors → fixed data structure mismatches
   - Route ordering issues → /sales/export harus sebelum /sales
   - Database connection config → localhost vs Docker DNS (db:5432)
   - Test selector issues → made flexible untuk browser compatibility

3. **UI/UX decisions**:
   - Color scheme: simple white/gray/blue → professional clean design
   - Sidebar organization → clear main menu vs admin panel sections
   - Table styling → striped rows dengan hover effects

4. **Testing & validation**:
   - Ran semua test suites: backend (29 passing), frontend (11 passing)
   - Verified Docker health checks: 6/6 services healthy
   - Tested API endpoints: login, CRUD, concurrency, export excel

## Kesimpulan

AI digunakan untuk **rapid scaffolding dan code generation**, developer untuk **architectural decisions, debugging, dan validation**. Semua kode dipahami sepenuhnya dan siap untuk production.
