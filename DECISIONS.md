# DECISIONS.md — Keputusan Teknis

## a. Bagaimana mencegah stok minus saat dua order masuk bersamaan?

**Jawaban:** Pessimistic locking dengan `SELECT ... FOR UPDATE` di dalam satu transaksi PostgreSQL.

Setiap kali ada `POST /api/orders`, seluruh proses dijalankan dalam `prisma.$transaction()`. Sebelum mengecek stok, sistem mengunci baris produk yang relevan menggunakan raw query `SELECT id FROM products WHERE id = $1 FOR UPDATE`. Lock ini membuat request lain yang ingin mengakses produk yang sama harus menunggu hingga transaksi pertama selesai.

Untuk mencegah deadlock pada order yang memesan lebih dari satu produk, ID produk selalu diurutkan secara ascending sebelum dikunci. Jadi dua order yang memesan produk A dan B tidak akan pernah saling menunggu dalam urutan terbalik.

**File terkait:** `apps/api/src/modules/orders/orders.service.ts` — method `createOrder()`, bagian `sortedProductIds` dan loop `FOR UPDATE`.

Hasil test: 20 request paralel untuk produk dengan stok 5 → tepat 5 sukses, 15 gagal dengan 409, stok akhir 0, tidak pernah negatif.

---

## b. Mengapa struktur folder dan lapisan kode seperti ini, dan apa yang akan diubah jika aplikasi membesar?

**Jawaban:** Struktur monorepo dengan `apps/api` (NestJS) dan `apps/web` (Next.js) dipilih karena memungkinkan dua service berjalan terpisah sambil berbagi satu `pnpm-lock.yaml` dan dependency management yang konsisten.

Di sisi backend, kode dibagi menjadi empat lapis:
- **Controller** — hanya routing dan validasi input, tidak ada logika bisnis
- **Service** — semua logika bisnis, transaksi, dan koordinasi antar komponen
- **Domain** — `OrderStateMachine` berdiri sendiri dan bisa diuji tanpa database
- **Infrastructure** — `PrismaService`, `RedisService`, `EmailService` yang bisa diganti implementasinya tanpa mengubah service layer

Pemisahan ini membuat testing lebih mudah (service bisa di-mock di unit test) dan kode lebih mudah dibaca karena setiap file punya satu tanggung jawab.

**Jika aplikasi membesar:**
- Pisahkan modul `orders`, `products`, dan `reports` menjadi microservice terpisah jika traffic sudah berbeda secara signifikan
- Tambahkan repository layer (interface + implementation) antara service dan Prisma, sehingga bisa diganti database engine tanpa menyentuh logika bisnis
- Tambahkan shared package di monorepo untuk tipe TypeScript yang dipakai frontend dan backend (OpenAPI codegen atau manual interface)
- Pertimbangkan CQRS untuk `reports` — pisahkan read model dari write model agar laporan tidak membebani database transaksional

**File terkait:** Struktur di `apps/api/src/modules/`, `apps/api/src/common/`, `apps/web/src/lib/api.ts`.

---

## c. Satu bug atau masalah yang ditemui saat mengerjakan, dan bagaimana menemukannya

**Masalah:** Tabel orders di frontend tidak menampilkan nama customer meski data ada di API response.

**Cara menemukan:** Saat membuka network tab di browser, response dari `GET /api/orders` menampilkan data customer dengan benar (`order.customer.customer_name`). Namun tabel di UI tetap kosong untuk kolom Customer.

Setelah inspeksi kode HTML yang di-render di DevTools, ditemukan bahwa elemen `<tbody>` di dalam komponen Orders di-*nested* — ada `<tbody>` di dalam `<tbody>` di dalam loop `map()`. Ini adalah HTML yang tidak valid; browser secara otomatis memperbaikinya dengan memindahkan elemen ke luar, yang menyebabkan seluruh baris (`<tr>`) tidak ter-render di dalam tabel.

**Fix:** Ganti nested `<tbody>` dengan `<Fragment key={order.id}>` dari React, sehingga setiap baris order dan baris expanded status history berada di dalam satu `<tbody>` yang valid.

**File terkait:** `apps/web/src/app/(authenticated)/orders/page.tsx`.

**Pelajaran:** Invalid HTML yang di-"perbaiki" browser secara silent bisa menjadi bug yang sangat sulit dilacak karena tidak ada error di console. Cara terbaik menemukan ini adalah dengan inspect elemen aktual di DevTools, bukan hanya melihat JSX source.

---

## d. Bagian yang belum selesai atau masih lemah, dan langkah selanjutnya

### 1. Email via Mailpit belum terverifikasi end-to-end
Processor BullMQ untuk invoice dan notifikasi sudah dibuat dan job sudah masuk queue saat order di-pay, tapi pengiriman email via `NodeMailer` ke Mailpit belum diverifikasi berfungsi di environment Docker. Langkah selanjutnya: buka `http://localhost:8025` setelah membuat order dan memverifikasi email masuk di inbox Mailpit.

### 2. Validasi payload berbeda pada Idempotency Key
Saat ini, jika client mengirim key yang sama dengan payload berbeda, sistem mengembalikan respons order pertama tanpa menolak request. Seharusnya dikembalikan 422 karena payload berbeda. Fix: simpan hash dari payload di tabel `idempotency_keys` dan bandingkan saat request masuk.

### 3. Test tidak berjalan di CI
Unit test (`orders.service.spec.ts`) dan concurrency test ada di codebase, tapi belum dikonfigurasi untuk jalan di GitHub Actions dengan PostgreSQL service container. Langkah selanjutnya: tambahkan `services: postgres` di workflow CI, set `DATABASE_URL` ke test database, dan jalankan `pnpm test:run` dari `apps/api`.

### 4. Dockerfile tidak berjalan sebagai non-root
Dockerfile saat ini menggunakan user `root` di dalam container. Untuk produksi, perlu tambahkan:
```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

### 5. Cleanup idempotency keys
Tabel `idempotency_keys` akan terus bertambah seiring waktu. Perlu scheduled job (cron atau BullMQ repeatable job) yang menghapus key dengan `expiresAt < NOW()` secara berkala.

### 6. Sort dan filter URL query string di frontend
Halaman Products dan Customers belum menyinkronkan filter/sort ke URL query string. Artinya state filter hilang saat halaman di-refresh atau link dibagikan. Fix: pakai `useSearchParams` dari Next.js untuk persist state ke URL.
