-- Add database-level CHECK constraints for data integrity.
-- These complement application-layer validation with a DB safety net.

-- Products: stock must be >= 0 and price must be > 0
ALTER TABLE "products" ADD CONSTRAINT "products_stock_check" CHECK ("stock" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_price_check" CHECK ("price" > 0);

-- Order items: quantity must be > 0
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0);
