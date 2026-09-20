import { discountedPrice, lineTotal } from './pricing';

describe('discountedPrice', () => {
  it('returns the list price at 0%', () => {
    expect(discountedPrice(28_000, 0)).toBe(28_000);
  });

  it('applies a whole-percent discount', () => {
    expect(discountedPrice(52_000, 20)).toBe(41_600);
  });

  it('rounds to the nearest rupiah', () => {
    // 10_001 * 0.67 = 6700.67
    expect(discountedPrice(10_001, 33)).toBe(6_701);
  });

  it('is free at 100%', () => {
    expect(discountedPrice(52_000, 100)).toBe(0);
  });
});

describe('lineTotal', () => {
  it('multiplies price by quantity', () => {
    expect(lineTotal(41_600, 3)).toBe(124_800);
  });
});
