/**
 * Fraction arithmetic utilities.
 *
 * All public functions return plain {num, den} objects where den > 0.
 */

/**
 * Greatest common divisor (non-negative integers).
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

/**
 * Reduce a fraction to lowest terms.
 * The sign is always carried by num; den is always positive.
 * @param {number} num
 * @param {number} den
 * @returns {{num: number, den: number}}
 */
export function reduceFraction(num, den) {
  if (den === 0) return { num: num >= 0 ? Infinity : -Infinity, den: 1 };
  if (num === 0) return { num: 0, den: 1 };
  const sign = (num < 0) !== (den < 0) ? -1 : 1;
  const absNum = Math.abs(Math.round(num));
  const absDen = Math.abs(Math.round(den));
  const g = gcd(absNum, absDen);
  return { num: sign * (absNum / g), den: absDen / g };
}

/**
 * Convert a decimal to the nearest reduced fraction with denominator ≤ maxDen.
 * Uses the continued-fraction (Stern–Brocot) algorithm.
 * @param {number} x
 * @param {number} [maxDen=10000]
 * @param {number} [tol=1e-9]
 * @returns {{num: number, den: number}}
 */
export function decimalToFraction(x, maxDen = 10000, tol = 1e-9) {
  if (!Number.isFinite(x)) return { num: x > 0 ? Infinity : -Infinity, den: 1 };
  if (Math.abs(x) < tol) return { num: 0, den: 1 };

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  // Continued-fraction expansion
  let lo_n = 0, lo_d = 1;
  let hi_n = 1, hi_d = 0;
  let best_n = Math.round(x), best_d = 1;
  let bestErr = Math.abs(x - best_n);

  for (let iter = 0; iter < 200; iter++) {
    const med_n = lo_n + hi_n;
    const med_d = lo_d + hi_d;
    if (med_d > maxDen) break;

    const medVal = med_n / med_d;
    const err = Math.abs(x - medVal);
    if (err < bestErr) {
      bestErr = err;
      best_n = med_n;
      best_d = med_d;
    }
    if (err < tol) break;

    if (medVal < x) {
      lo_n = med_n;
      lo_d = med_d;
    } else {
      hi_n = med_n;
      hi_d = med_d;
    }
  }

  return reduceFraction(sign * best_n, best_d);
}

/**
 * Format a reduced fraction as a LaTeX string.
 *
 * Options:
 *   showPlus {boolean} – prepend '+' for positive values (default false)
 *   skipOne  {boolean} – omit the '1' when num/den === ±1 (for coefficients)
 *
 * @param {number} num
 * @param {number} den
 * @param {{ showPlus?: boolean, skipOne?: boolean }} [opts]
 * @returns {string}
 */
export function fracToLatex(num, den, opts = {}) {
  const { showPlus = false, skipOne = false } = opts;

  if (den === 0 || !Number.isFinite(num / den)) return '\\infty';
  if (num === 0) return '0';

  const sign = num < 0 ? '-' : showPlus ? '+' : '';
  const absNum = Math.abs(num);
  const absDen = Math.abs(den);

  let magnitude;
  if (absDen === 1) {
    if (absNum === 1 && skipOne) {
      magnitude = '';
    } else {
      magnitude = `${absNum}`;
    }
  } else {
    magnitude = `\\frac{${absNum}}{${absDen}}`;
  }

  return sign + magnitude;
}

/**
 * Convert a decimal to a fully-reduced LaTeX fraction string.
 * @param {number} x
 * @param {{ showPlus?: boolean, skipOne?: boolean, maxDen?: number }} [opts]
 * @returns {string}
 */
export function decimalToLatex(x, opts = {}) {
  const { maxDen = 10000, ...fmtOpts } = opts;
  const { num, den } = decimalToFraction(x, maxDen);
  return fracToLatex(num, den, fmtOpts);
}
