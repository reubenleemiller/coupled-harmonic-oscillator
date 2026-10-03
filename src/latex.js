/**
 * latex.js – Generate KaTeX-ready LaTeX strings for the analytic solution
 * of the coupled harmonic oscillator.
 *
 * The general solution is:
 *
 *   x₁(t) = C₁ cos(ω₁t) + C₂ sin(ω₁t) + C₃ cos(ω₂t) + C₄ sin(ω₂t)
 *   x₂(t) = D₁ cos(ω₁t) + D₂ sin(ω₁t) + D₃ cos(ω₂t) + D₄ sin(ω₂t)
 *
 * Velocity and acceleration are obtained by differentiating.
 * All numeric coefficients are displayed as fully-reduced fractions.
 */

import { decimalToFraction, fracToLatex } from './fraction.js';

// ── internal helpers ────────────────────────────────────────────────────────

/**
 * Multiply two fractions and reduce.
 * @param {{num:number,den:number}} a
 * @param {{num:number,den:number}} b
 */
function mulFrac(a, b) {
  const { reduceFraction } = _fracUtils;
  return reduceFraction(a.num * b.num, a.den * b.den);
}

/**
 * We re-import reduceFraction lazily to avoid circular references in tests.
 */
const _fracUtils = (() => {
  // Will be populated after module load
  let _reduce = null;
  return {
    get reduceFraction() {
      if (!_reduce) {
        // Dynamic import not available in sync context; inline a minimal copy
        _reduce = (num, den) => {
          if (den === 0) return { num: Infinity, den: 1 };
          if (num === 0) return { num: 0, den: 1 };
          const sign = (num < 0) !== (den < 0) ? -1 : 1;
          const a = Math.abs(Math.round(num));
          const b = Math.abs(Math.round(den));
          let x = a, y = b;
          while (y) { const t = y; y = x % y; x = t; }
          return { num: sign * (a / x), den: b / x };
        };
      }
      return _reduce;
    },
  };
})();

/**
 * Format a numeric coefficient as a LaTeX string using a reduced fraction.
 *
 * @param {number} value       – the decimal coefficient
 * @param {boolean} isFirst    – true for the first (leading) term
 * @param {boolean} skipOne    – omit magnitude '1' when |value|=1 (for trig terms)
 * @returns {{ latex: string, isZero: boolean }}
 */
function coeffLatex(value, isFirst, skipOne = true) {
  const { num, den } = decimalToFraction(value);
  if (num === 0) return { latex: '', isZero: true };

  const latex = fracToLatex(num, den, {
    showPlus: !isFirst,
    skipOne,
  });
  return { latex, isZero: false };
}

/**
 * Format ω as a LaTeX string: e.g. "1.0000" or an exact fraction if rational.
 */
function omegaLatex(omega) {
  const { num, den } = decimalToFraction(omega, 1000, 1e-6);
  if (den === 1) return `${num}`;
  if (den <= 100) return fracToLatex(num, den);
  // Irrational – show 4 significant figures
  return omega.toPrecision(5).replace(/\.?0+$/, '');
}

/**
 * Build one analytic expression of the form:
 *   C₁ cos(ω₁ t) + C₂ sin(ω₁ t) + C₃ cos(ω₂ t) + C₄ sin(ω₂ t)
 *
 * `terms` is an array of { coeff, trigFn, omega, omegaLabel } objects.
 */
function buildExpression(terms) {
  const parts = [];
  let firstWritten = false;

  for (const { coeff, trigFn, omegaLabel } of terms) {
    const { latex: cLat, isZero } = coeffLatex(coeff, !firstWritten);
    if (isZero) continue;

    const trig = `${trigFn}\\!\\left(${omegaLabel}\\, t\\right)`;

    // If the coefficient magnitude is 1, we only wrote sign (or nothing).
    const { num: cn, den: cd } = decimalToFraction(coeff);
    const magIsOne = Math.abs(cn) === Math.abs(cd);

    if (magIsOne && cn !== 0) {
      // cLat is '' (first, positive one) or '+' or '-'
      // We need to emit sign then trig
      const sign =
        coeff < 0 ? '-' : !firstWritten ? '' : '+';
      parts.push(`${sign}${trig}`);
    } else {
      parts.push(`${cLat}${trig}`);
    }

    firstWritten = true;
  }

  return parts.length > 0 ? parts.join(' ') : '0';
}

// ── public API ──────────────────────────────────────────────────────────────

/**
 * Generate all six analytic LaTeX expression strings from an oscillator.
 *
 * @param {import('./oscillator.js').CoupledOscillator} osc
 * @returns {{
 *   omega1: string, omega2: string,
 *   x1: string, v1: string, a1: string,
 *   x2: string, v2: string, a2: string
 * }}
 */
export function generateLatex(osc) {
  const { omega1: w1, omega2: w2, coeffs1: c1, coeffs2: c2 } = osc;

  const wl1 = `\\omega_1`; // label used inside trig
  const wl2 = `\\omega_2`;

  /** Build terms for position, velocity, acceleration for one mass. */
  function massSolution(c) {
    // Position terms
    const posParts = [
      { coeff: c.cw1, trigFn: '\\cos', omegaLabel: wl1 },
      { coeff: c.sw1, trigFn: '\\sin', omegaLabel: wl1 },
      { coeff: c.cw2, trigFn: '\\cos', omegaLabel: wl2 },
      { coeff: c.sw2, trigFn: '\\sin', omegaLabel: wl2 },
    ];

    // Velocity terms  (derivative: cos → -ω sin,  sin → ω cos)
    const velParts = [
      { coeff: -c.cw1 * w1, trigFn: '\\sin', omegaLabel: wl1 },
      { coeff:  c.sw1 * w1, trigFn: '\\cos', omegaLabel: wl1 },
      { coeff: -c.cw2 * w2, trigFn: '\\sin', omegaLabel: wl2 },
      { coeff:  c.sw2 * w2, trigFn: '\\cos', omegaLabel: wl2 },
    ];

    // Acceleration terms  (2nd derivative: cos → -ω² cos,  sin → -ω² sin)
    const accParts = [
      { coeff: -c.cw1 * w1 * w1, trigFn: '\\cos', omegaLabel: wl1 },
      { coeff: -c.sw1 * w1 * w1, trigFn: '\\sin', omegaLabel: wl1 },
      { coeff: -c.cw2 * w2 * w2, trigFn: '\\cos', omegaLabel: wl2 },
      { coeff: -c.sw2 * w2 * w2, trigFn: '\\sin', omegaLabel: wl2 },
    ];

    return {
      x: buildExpression(posParts),
      v: buildExpression(velParts),
      a: buildExpression(accParts),
    };
  }

  const sol1 = massSolution(c1);
  const sol2 = massSolution(c2);

  return {
    omega1: omegaLatex(w1),
    omega2: omegaLatex(w2),
    x1: sol1.x,
    v1: sol1.v,
    a1: sol1.a,
    x2: sol2.x,
    v2: sol2.v,
    a2: sol2.a,
  };
}
