import { describe, it, expect } from 'vitest';
import { calculateOrderTotal } from '../order-calculator';

describe('calculateOrderTotal', () => {
  it('calculates total for a single item', () => {
    expect(calculateOrderTotal([{ unitPrice: 10000, quantity: 2 }])).toBe(20000);
  });

  it('calculates total for multiple items', () => {
    const items = [
      { unitPrice: 10000, quantity: 2 },
      { unitPrice: 25000, quantity: 1 },
      { unitPrice: 5000, quantity: 3 },
    ];
    // 10000*2 + 25000*1 + 5000*3 = 20000 + 25000 + 15000 = 60000
    expect(calculateOrderTotal(items)).toBe(60000);
  });

  it('returns 0 for an empty array', () => {
    expect(calculateOrderTotal([])).toBe(0);
  });

  it('handles decimal prices', () => {
    expect(calculateOrderTotal([{ unitPrice: 12.5, quantity: 3 }])).toBe(37.5);
  });

  it('handles quantity of 0', () => {
    expect(calculateOrderTotal([{ unitPrice: 10000, quantity: 0 }])).toBe(0);
  });
});
