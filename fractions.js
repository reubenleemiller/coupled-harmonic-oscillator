window.Fractions = (function () {
  'use strict';

  /**
   * Integer greatest common divisor (always non-negative).
   */
  function gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) {
      var t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  /**
   * Reduce fraction {n, d} to lowest terms; denominator is always positive.
   */
  function reduce(frac) {
    var n = frac.n, d = frac.d;
    if (d === 0) return { n: n, d: 0 };
    var g = gcd(Math.abs(n), Math.abs(d));
    var rn = n / g;
    var rd = d / g;
    if (rd < 0) { rn = -rn; rd = -rd; }
    return { n: rn, d: rd };
  }

  /**
   * Convert float x to the nearest fraction {n, d} with |d| <= maxDen,
   * using the Stern-Brocot / mediant algorithm.
   * Returns null for Infinity, NaN, or very large |x|.
   */
  function toFraction(x, maxDen) {
    if (maxDen === undefined) maxDen = 1000;
    if (x === 0) return { n: 0, d: 1 };
    if (!isFinite(x) || isNaN(x)) return null;
    if (Math.abs(x) > 1e10) return null;

    var negative = x < 0;
    var ax = Math.abs(x);

    // Integer shortcut
    if (ax === Math.floor(ax)) {
      return { n: negative ? -Math.round(ax) : Math.round(ax), d: 1 };
    }

    var intPart = Math.floor(ax);
    var lo_n = intPart,     lo_d = 1;
    var hi_n = intPart + 1, hi_d = 1;

    var best_n   = lo_n;
    var best_d   = 1;
    var best_err = Math.abs(ax - lo_n);

    if (Math.abs(ax - hi_n) < best_err) {
      best_err = Math.abs(ax - hi_n);
      best_n   = hi_n;
      best_d   = hi_d;
    }

    for (var iter = 0; iter < 10000; iter++) {
      var med_n = lo_n + hi_n;
      var med_d = lo_d + hi_d;

      if (med_d > maxDen) break;

      var val = med_n / med_d;
      var err = Math.abs(ax - val);

      if (err < best_err) {
        best_err = err;
        best_n   = med_n;
        best_d   = med_d;
      }

      if (val < ax) {
        lo_n = med_n; lo_d = med_d;
      } else if (val > ax) {
        hi_n = med_n; hi_d = med_d;
      } else {
        break; // exact hit
      }
    }

    return reduce({ n: negative ? -best_n : best_n, d: best_d });
  }

  /**
   * Return a LaTeX string for fraction {n, d}.
   * If d == 1 returns just the number; if n < 0 uses -\frac{|n|}{d}.
   */
  function fracToLatex(frac) {
    var n = frac.n, d = frac.d;
    if (d === 1) return '' + n;
    if (n < 0) return '-\\frac{' + (-n) + '}{' + d + '}';
    return '\\frac{' + n + '}{' + d + '}';
  }

  /**
   * Convert float coefficient x to a LaTeX fraction string.
   * forceSign=true prepends + for positive values (for subsequent terms).
   * Falls back to 4-decimal notation if toFraction returns null.
   */
  function coeffToLatex(x, maxDen, forceSign) {
    if (forceSign === undefined) forceSign = false;

    if (Math.abs(x) < 1e-12) return '0';

    var frac = toFraction(x, maxDen);

    if (!frac) {
      // Very large number: show as decimal
      var sign0 = x > 0 ? (forceSign ? '+' : '') : '-';
      return sign0 + Math.abs(x).toFixed(4);
    }

    var n = frac.n, d = frac.d;
    if (n === 0) return '0';

    var positive = n > 0;
    var sign     = positive ? (forceSign ? '+' : '') : '-';
    var absN     = Math.abs(n);

    if (d === 1) {
      return sign + absN;
    }
    return sign + '\\frac{' + absN + '}{' + d + '}';
  }

  return { gcd: gcd, reduce: reduce, toFraction: toFraction, fracToLatex: fracToLatex, coeffToLatex: coeffToLatex };
})();
