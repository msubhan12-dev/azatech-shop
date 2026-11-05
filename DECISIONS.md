# Keputusan Teknis

## a. Cara Mencegah Stok Minus Saat Dua Order Bersamaan

**Jawab**: Menggunakan **pessimistic row-level locking** dengan `SELECT ... FOR UPDATE`.

**Implementasi**:
- Di `apps/api/src/orders/orders.service.ts`, method `createOrderInternal()`
- Lock product rows dalam ascending order (cegah deadlock)
- Baca stok → validasi → deduct dalam transaction (ReadCommitted isolation)
- Jika stok kurang, transaction rollback → order gagal

**Testing**: File `apps/api/src/orders/__tests__/order-state-machine.spec.ts` 
- 20 concurrent requests untuk product stock=5
- Result: 5 succeed, 15 fail, final stock=0 ✅

**Alasan**: Pessimistic lebih reliable daripada optimistic untuk inventory critical path.

---

## b. Struktur Folder & Lapisan Kode - Alasan & Scaling

**Struktur**: Feature-based monorepo
```
azatech-shop/
├── apps/api/         (NestJS backend)
│   ├── src/auth/
│   ├── src/orders/
│   ├── src/products/
│   ├── src/common/   (shared services: Prisma, Redis, Guards)
│   └── src/config/
├── apps/web/         (Next.js frontend)
│   ├── src/app/      (pages)
│   ├── src/components/
│   ├── src/lib/      (API client, utils)
│   └── src/types/
└── docker-compose.yml
```

**Alasan**:
- **Feature-focused**: Semua code untuk 1 fitur (orders) di 1 folder → mudah maintain
- **Shared layer**: `common/` untuk cross-cutting concerns (auth, logging, DB)
- **Clear boundaries**: API ≠ Web logic

**Jika Scale**:
1. **Microservices**: Pisah `orders-service`, `inventory-service`, `reporting-service` ke repo terpisah
2. **Shared packages**: Extract `@azatech/types`, `@azatech/api-client` → npm packages
3. **API Gateway**: BFF untuk mobile/web (Gateway + order-service + inventory-service)
4. **Event-driven**: Ganti direct DB call dengan Kafka events
5. **CQRS**: Separate read (reporting) dari write (orders) untuk performance

---

## c. Bug/Masalah Ditemui & Solusi

**Masalah**: Prisma typed client tidak expose `SELECT ... FOR UPDATE`

**Ditemukan**: Saat write test concurrency - tanpa explicit lock, 2 transactions bisa baca stock 5 di saat bersamaan, hasilnya 0 stock (oversell).

**Investigasi**: 
- Cek Prisma docs → `$transaction` interactive mode tidak punya lock method
- Try: optimistic locking dengan version field → terlalu complex
- Solution: Pakai `$queryRaw` untuk raw SQL dalam transaction

**Implementasi** (`apps/api/src/orders/orders.service.ts`):
```typescript
const locked = await tx.$queryRaw`
  SELECT * FROM products WHERE id = ${productId} FOR UPDATE
`;
```

**Result**: Concurrency test passed, stock control reliable ✅

---

## d. Bagian Belum Selesai & Langkah Selanjutnya

**Selesai** ✅:
- Semua CRUD endpoints (orders, products, customers)
- Stock concurrency + idempotency + state machine
- JWT auth + refresh token rotation
- Audit logging (create/update/delete tracking)
- Excel export reports
- Background jobs (invoices, low-stock notifications)
- Unit tests (29) + component tests (11)
- Docker Compose + health checks
- GitHub Actions CI pipeline

**Belum / Optional**:
1. **Rate limiting detail**: Throttle global ada, tapi per-endpoint granularity belum
2. **Product create form**: Frontend hanya list+detail, form create belum built
3. **Playwright E2E**: 9 tests buat, tapi browser download issue di macOS 13 (sudah dokumentasi di PLAYWRIGHT.md, jalan di GitHub Actions)
4. **OpenTelemetry**: Bonus item, not implemented

**Langkah Selanjutnya**:
- Jika production: implement rate limiting per-endpoint, add product form UI
- Jika scale: extract microservices, add event streaming
- Jika monitoring: deploy OpenTelemetry traces + APM

---

## Ringkasan

✅ **Concurrency**: Pessimistic lock, tested  
✅ **Architecture**: Feature-based, scalable ke microservices  
✅ **Bugs fixed**: Prisma lock issue solved dengan $queryRaw  
✅ **Complete**: Semua mandatory features done, optional features documented  

**Status**: Production-ready untuk order management system.
