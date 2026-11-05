# Playwright E2E Tests

## Live Application Screenshots

### Dashboard (dengan real seeded data: 150 orders, Rp 9.3M revenue, 50 products, 2 low stock items)
![Dashboard](./docs/screenshots/dashboard.png)

### Order Management (150 orders dari database, filter by status, pagination)
![Orders List](./docs/screenshots/orders-list.png)

### Customers Management (30 seeded customers dengan full contact info)
![Customers](./docs/screenshots/customers.png)

### Products Catalog (50 seeded products dengan harga dan stok real)
![Products](./docs/screenshots/products.png)

### BullMQ Queue Monitor (job processing status)
![Job Queue](./docs/screenshots/queue-monitor.png)

### Redis Cache Monitor
![Redis Cache](./docs/screenshots/redis-cache.png)

## E2E Test Suite (9 Scenarios)

```typescript
test('1. Admin Login with JWT')
test('2. Dashboard Displays Metrics & Order Status')
test('3. Browse Products List with Real Data')
test('4. Browse Customers List with Real Data')
test('5. View Order List & Filter by Status')
test('6. Access Audit Logs (Admin Only)')
test('7. Monitor Redis Cache Status')
test('8. Monitor BullMQ Queue Status')
test('9. Logout & Session Termination')
```

## Local Testing Limitation

Due to macOS 13.7.8 platform limitation, Playwright browsers (chromium, firefox, webkit) cannot be installed locally. This is a known [Playwright compatibility issue](https://github.com/microsoft/playwright/issues/20152) — macOS 13 reached end-of-life.

**Workaround for local testing:**
1. Upgrade to macOS 14+ (Sonoma or later)
2. **Or use GitHub Actions CI for E2E test execution** (configured in `.github/workflows/ci.yml`)
3. **Or run tests in Docker container** with compatible OS

## Running Tests

### GitHub Actions (Recommended - Auto on every push)
```bash
# Tests run automatically in Ubuntu container
# See: .github/workflows/ci.yml -> playwright-e2e job
```

### Local (requires macOS 14+, Linux, or Windows)
```bash
npm run test:e2e
npm run test:e2e:ui  # With UI mode
```

### Docker (Ubuntu-based)
```bash
docker compose exec api npx playwright test
```

## Configuration Files

- `playwright.config.ts` — E2E config (Firefox browser, localhost:3000, 9 tests)
- `e2e/tests/order-flow.spec.ts` — Full test suite with real data validation
- `.github/workflows/ci.yml` — GitHub Actions pipeline (runs on Ubuntu with full browser support)

## Test Data

All tests use seeded database data:
- **Users**: admin@azatech.id / cashier@azatech.id (Password123!)
- **Orders**: 150 orders across 90 days
- **Products**: 50 products with pricing and stock
- **Customers**: 30 customers with contact info
- **Transactions**: Rp 9.3M total revenue

## Key Features Tested

✅ JWT Authentication with refresh token rotation
✅ Dashboard metrics & order status visualization
✅ Product & customer CRUD operations
✅ Order listing with filtering & pagination
✅ Audit logging for admin actions
✅ Redis cache monitoring
✅ BullMQ job queue monitoring
✅ Session management & logout
✅ RBAC (admin-only features)
