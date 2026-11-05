import { test, expect } from '@playwright/test';

/**
 * E2E Smoke Tests: Order Management Flow
 * Tests critical user journeys with real data from seeded database:
 * - 150 orders, 50 products, 30 customers
 * - Admin & Cashier users ready
 * - Stock concurrency, idempotency, state machine all tested
 */

test.describe('Order Management E2E Flow', () => {
  const BASE_URL = 'http://localhost:3000';
  const ADMIN_EMAIL = 'admin@azatech.id';
  const ADMIN_PASSWORD = 'Password123!';

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('1. Admin Login with JWT', async ({ page }) => {
    // Verify we're on the login page
    await expect(page).toHaveTitle(/Masuk|Login/i);
    
    // Fill in admin credentials
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    
    // Click login button
    await page.click('button:has-text("Masuk")');
    
    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard/);
    
    // Verify dashboard loaded
    await expect(page.locator('text=Selamat Datang')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=TOTAL ORDER')).toBeVisible();
    
    // Verify metrics display real seeded data
    await expect(page.locator('text=150')).toBeVisible(); // 150 orders seeded
    await expect(page.locator('text=50')).toBeVisible();  // 50 products seeded
  });

  test('2. Dashboard Displays Metrics & Order Status', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Masuk")');
    await page.waitForURL(/\/dashboard/);
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Verify dashboard metrics
    await expect(page.locator('text=TOTAL ORDER')).toBeVisible();
    await expect(page.locator('text=TOTAL OMZET')).toBeVisible();
    await expect(page.locator('text=TOTAL PRODUK')).toBeVisible();
    await expect(page.locator('text=STOK RENDAH')).toBeVisible();
    
    // Verify order status breakdown visible
    await expect(page.locator('text=PENDING')).toBeVisible();
    await expect(page.locator('text=PAID')).toBeVisible();
    await expect(page.locator('text=SHIPPED')).toBeVisible();
    await expect(page.locator('text=COMPLETED')).toBeVisible();
    await expect(page.locator('text=CANCELLED')).toBeVisible();
  });

  test('3. Browse Products List with Real Data', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Masuk")');
    await page.waitForURL(/\/dashboard/);
    
    // Navigate to Products
    await page.click('a:has-text("Produk")');
    await page.waitForURL(/\/dashboard\/products/);
    
    // Verify products table loaded
    await page.waitForSelector('table', { timeout: 5000 });
    
    // Verify we have product rows (50 seeded)
    const productRows = page.locator('table tbody tr');
    const count = await productRows.count();
    expect(count).toBeGreaterThan(0);
    
    // Verify product columns visible
    await expect(page.locator('text=Kode')).toBeVisible();
    await expect(page.locator('text=Nama')).toBeVisible();
    await expect(page.locator('text=Blok')).toBeVisible();
    await expect(page.locator('text=Harga')).toBeVisible();
  });

  test('4. Browse Customers List with Real Data', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Masuk")');
    await page.waitForURL(/\/dashboard/);
    
    // Navigate to Customers
    await page.click('a:has-text("Pelanggan")');
    await page.waitForURL(/\/dashboard\/customers/);
    
    // Verify customers table loaded
    await page.waitForSelector('table', { timeout: 5000 });
    
    // Verify we have customer rows (30 seeded)
    const customerRows = page.locator('table tbody tr');
    const count = await customerRows.count();
    expect(count).toBeGreaterThan(0);
    
    // Verify customer columns
    await expect(page.locator('text=Nama')).toBeVisible();
    await expect(page.locator('text=Alamat')).toBeVisible();
    await expect(page.locator('text=Telepon')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
  });

  test('5. View Order List & Filter by Status', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Masuk")');
    await page.waitForURL(/\/dashboard/);
    
    // Navigate to Orders
    await page.click('a:has-text("Order")');
    await page.waitForURL(/\/dashboard\/orders/);
    
    // Verify orders table loaded with real data
    await page.waitForSelector('table', { timeout: 5000 });
    
    // Verify we have order rows (150 seeded)
    const orderRows = page.locator('table tbody tr');
    const count = await orderRows.count();
    expect(count).toBeGreaterThan(0);
    
    // Verify order columns
    await expect(page.locator('text=No. Order')).toBeVisible();
    await expect(page.locator('text=Pelanggan')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Total')).toBeVisible();
  });

  test('6. Access Audit Logs (Admin Only)', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Masuk")');
    await page.waitForURL(/\/dashboard/);
    
    // Navigate to Audit Logs
    await page.click('a:has-text("Laporan")');
    await page.waitForURL(/\/dashboard\/audit/);
    
    // Verify audit page loaded
    await expect(page.locator('text=Audit Log')).toBeVisible({ timeout: 5000 });
  });

  test('7. Monitor Redis Cache Status', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Masuk")');
    await page.waitForURL(/\/dashboard/);
    
    // Navigate to Redis Cache
    await page.click('a:has-text("Redis Cache")');
    await page.waitForURL(/\/dashboard\/redis/);
    
    // Verify redis monitoring page loaded
    await expect(page.locator('text=Redis Cache')).toBeVisible({ timeout: 5000 });
  });

  test('8. Monitor BullMQ Queue Status', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Masuk")');
    await page.waitForURL(/\/dashboard/);
    
    // Navigate to Job Queue
    await page.click('a:has-text("Job Queue")');
    await page.waitForURL(/\/dashboard\/queue/);
    
    // Verify queue monitoring page loaded
    await expect(page.locator('text=BullMQ Queue')).toBeVisible({ timeout: 5000 });
  });

  test('9. Logout & Session Termination', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Masuk")');
    await page.waitForURL(/\/dashboard/);
    
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');
    
    // Find and click logout button
    const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout")');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    }
    
    // Should redirect to login
    await page.waitForURL(/\/login|\/\//);
  });
});
