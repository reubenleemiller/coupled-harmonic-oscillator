/**
 * Tests for fraction utilities in src/fraction.js
 */

import {
  gcd,
  reduceFraction,
  decimalToFraction,
  fracToLatex,
  decimalToLatex,
} from '../src/fraction.js';

// ── gcd ──────────────────────────────────────────────────────────────────
describe('gcd', () => {
  test('gcd(12, 8) = 4',  () => expect(gcd(12, 8)).toBe(4));
  test('gcd(7,  3) = 1',  () => expect(gcd(7,  3)).toBe(1));
  test('gcd(0,  5) = 5',  () => expect(gcd(0,  5)).toBe(5));
  test('gcd(5,  0) = 5',  () => expect(gcd(5,  0)).toBe(5));
  test('gcd(10,10) = 10', () => expect(gcd(10,10)).toBe(10));
  test('handles negatives via abs', () => expect(gcd(-4, 6)).toBe(2));
});

// ── reduceFraction ────────────────────────────────────────────────────────
describe('reduceFraction', () => {
  test('2/4 → 1/2',    () => expect(reduceFraction(2, 4)).toEqual({ num: 1, den: 2 }));
  test('6/9 → 2/3',    () => expect(reduceFraction(6, 9)).toEqual({ num: 2, den: 3 }));
  test('5/5 → 1/1',    () => expect(reduceFraction(5, 5)).toEqual({ num: 1, den: 1 }));
  test('0/7 → 0/1',    () => expect(reduceFraction(0, 7)).toEqual({ num: 0, den: 1 }));
  test('-3/6 → -1/2',  () => expect(reduceFraction(-3, 6)).toEqual({ num: -1, den: 2 }));
  test('3/-6 → -1/2',  () => expect(reduceFraction(3, -6)).toEqual({ num: -1, den: 2 }));
  test('-3/-6 → 1/2',  () => expect(reduceFraction(-3, -6)).toEqual({ num: 1, den: 2 }));
  test('already reduced 7/13 unchanged', () =>
    expect(reduceFraction(7, 13)).toEqual({ num: 7, den: 13 }));
});

// ── decimalToFraction ─────────────────────────────────────────────────────
describe('decimalToFraction', () => {
  test('0 → 0/1',    () => expect(decimalToFraction(0)).toEqual({ num: 0, den: 1 }));
  test('0.5 → 1/2',  () => expect(decimalToFraction(0.5)).toEqual({ num: 1, den: 2 }));
  test('0.25 → 1/4', () => expect(decimalToFraction(0.25)).toEqual({ num: 1, den: 4 }));
  test('0.75 → 3/4', () => expect(decimalToFraction(0.75)).toEqual({ num: 3, den: 4 }));
  test('1/3 ≈ 0.333…', () => {
    const f = decimalToFraction(1 / 3);
    expect(f.num / f.den).toBeCloseTo(1 / 3, 9);
    expect(f).toEqual({ num: 1, den: 3 });
  });
  test('2/3 ≈ 0.666…', () => {
    const f = decimalToFraction(2 / 3);
    expect(f).toEqual({ num: 2, den: 3 });
  });
  test('negative -0.5 → -1/2', () =>
    expect(decimalToFraction(-0.5)).toEqual({ num: -1, den: 2 }));
  test('1.5 → 3/2', () =>
    expect(decimalToFraction(1.5)).toEqual({ num: 3, den: 2 }));
  test('integer 3 → 3/1', () =>
    expect(decimalToFraction(3)).toEqual({ num: 3, den: 1 }));
  test('result is always reduced', () => {
    const f = decimalToFraction(4 / 6); // 0.666…
    const g = gcd(Math.abs(f.num), f.den);
    expect(g).toBe(1);
  });
});

// ── fracToLatex ───────────────────────────────────────────────────────────
describe('fracToLatex', () => {
  test('1/2 → \\frac{1}{2}',     () => expect(fracToLatex(1,  2)).toBe('\\frac{1}{2}'));
  test('3/4 → \\frac{3}{4}',     () => expect(fracToLatex(3,  4)).toBe('\\frac{3}{4}'));
  test('-1/2 → -\\frac{1}{2}',   () => expect(fracToLatex(-1, 2)).toBe('-\\frac{1}{2}'));
  test('5/1 → 5',                () => expect(fracToLatex(5,  1)).toBe('5'));
  test('-3/1 → -3',              () => expect(fracToLatex(-3, 1)).toBe('-3'));
  test('showPlus adds + for pos',() => expect(fracToLatex(1,  2, { showPlus: true })).toBe('+\\frac{1}{2}'));
  test('showPlus keeps - for neg',() => expect(fracToLatex(-1, 2, { showPlus: true })).toBe('-\\frac{1}{2}'));
  test('skipOne omits 1 for 1/1',() => expect(fracToLatex(1,  1, { skipOne: true })).toBe(''));
  test('skipOne keeps num for 2/1',() => expect(fracToLatex(2, 1, { skipOne: true })).toBe('2'));
  test('zero → 0',               () => expect(fracToLatex(0,  5)).toBe('0'));
});

// ── decimalToLatex ────────────────────────────────────────────────────────
describe('decimalToLatex', () => {
  test('0.5 → \\frac{1}{2}',   () => expect(decimalToLatex(0.5)).toBe('\\frac{1}{2}'));
  test('-0.25 → -\\frac{1}{4}',() => expect(decimalToLatex(-0.25)).toBe('-\\frac{1}{4}'));
  test('1 → 1',                () => expect(decimalToLatex(1)).toBe('1'));
  test('0 → 0',                () => expect(decimalToLatex(0)).toBe('0'));
});
