/**
 * Pure function for calculating order total.
 * Extracted from OrdersService for unit testability.
 */
export function calculateOrderTotal(
  items: Array<{ unitPrice: number; quantity: number }>,
): number {
  return items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
}
