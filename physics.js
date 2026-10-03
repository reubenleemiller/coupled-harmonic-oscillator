window.Physics = (function () {
  'use strict';

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Return an eigenvector of the 2×2 matrix A for the given eigenvalue. */
  function eigenvector(a11, a12, a21, a22, lambda) {
    if (Math.abs(a12) > 1e-12) {
      return [a12, lambda - a11];
    }
    if (Math.abs(a21) > 1e-12) {
      return [lambda - a22, a21];
    }
    // Diagonal matrix: pick canonical basis vector for this eigenvalue.
    if (Math.abs(lambda - a11) <= Math.abs(lambda - a22)) {
      return [1, 0];
    }
    return [0, 1];
  }

  /** Are two 2-vectors parallel (cross-product ≈ 0)? */
  function parallel(u, v) {
    var cross = u[0] * v[1] - u[1] * v[0];
    var scale = (Math.abs(u[0]) + Math.abs(u[1])) *
                (Math.abs(v[0]) + Math.abs(v[1]));
    return scale < 1e-24 || Math.abs(cross) < 1e-10 * scale;
  }

  // ─── solve ───────────────────────────────────────────────────────────────────

  /**
   * Solve the coupled harmonic oscillator given params:
   *   {config, m1, m2, k1, k2, k3, x10, x20, v10, v20}
   *
   * Returns:
   *   {omega1, omega2, phi1, phi2, A1, B1, A2, B2,
   *    x1, x2, v1, v2, a1, a2,   ← functions of t
   *    coeffs}                    ← raw numeric coefficients
   */
  function solve(params) {
    var config = params.config;
    var m1  = params.m1,  m2  = params.m2;
    var k1  = params.k1,  k2  = params.k2,  k3  = params.k3;
    var x10 = params.x10, x20 = params.x20;
    var v10 = params.v10, v20 = params.v20;

    // Build stiffness matrix K
    var K00, K01, K10, K11;
    if (config === 'three-spring') {
      K00 = k1 + k2;  K01 = -k2;
      K10 = -k2;       K11 = k2 + k3;
    } else {
      // two-spring: wall–k1–m1–k2–m2 (free right end)
      K00 = k1 + k2;  K01 = -k2;
      K10 = -k2;       K11 = k2;
    }

    // A = M⁻¹ K
    var a11 = K00 / m1,  a12 = K01 / m1;
    var a21 = K10 / m2,  a22 = K11 / m2;

    // Characteristic polynomial: λ² − tr·λ + det = 0
    var tr   = a11 + a22;
    var det  = a11 * a22 - a12 * a21;
    var disc = tr * tr - 4 * det;
    var sqD  = Math.sqrt(Math.max(0, disc));

    var lam1 = Math.max(0, (tr - sqD) / 2);
    var lam2 = Math.max(0, (tr + sqD) / 2);

    var omega1 = Math.sqrt(lam1);
    var omega2 = Math.sqrt(lam2);

    // Eigenvectors
    var phi1 = eigenvector(a11, a12, a21, a22, lam1);
    var phi2 = eigenvector(a11, a12, a21, a22, lam2);

    // Ensure non-zero
    if (phi1[0] === 0 && phi1[1] === 0) phi1 = [1, 0];
    if (phi2[0] === 0 && phi2[1] === 0) phi2 = [0, 1];

    // If parallel (degenerate), use perpendicular to phi1
    if (parallel(phi1, phi2)) {
      phi2 = [-phi1[1], phi1[0]];
      if (phi2[0] === 0 && phi2[1] === 0) phi2 = [0, 1];
    }

    // M-orthogonal projection coefficients
    var norm1 = phi1[0] * phi1[0] * m1 + phi1[1] * phi1[1] * m2;
    var norm2 = phi2[0] * phi2[0] * m1 + phi2[1] * phi2[1] * m2;

    var A1 = (phi1[0] * m1 * x10 + phi1[1] * m2 * x20) / norm1;
    var B1 = omega1 > 1e-12
      ? (phi1[0] * m1 * v10 + phi1[1] * m2 * v20) / (omega1 * norm1)
      : 0;

    var A2 = (phi2[0] * m1 * x10 + phi2[1] * m2 * x20) / norm2;
    var B2 = omega2 > 1e-12
      ? (phi2[0] * m1 * v10 + phi2[1] * m2 * v20) / (omega2 * norm2)
      : 0;

    // ── Position coefficients ───────────────────────────────────────────────
    // x_i(t) = xc1·cos(ω1 t) + xs1·sin(ω1 t) + xc2·cos(ω2 t) + xs2·sin(ω2 t)
    var x1c1 = A1 * phi1[0],  x1s1 = B1 * phi1[0];
    var x1c2 = A2 * phi2[0],  x1s2 = B2 * phi2[0];

    var x2c1 = A1 * phi1[1],  x2s1 = B1 * phi1[1];
    var x2c2 = A2 * phi2[1],  x2s2 = B2 * phi2[1];

    // ── Velocity coefficients ───────────────────────────────────────────────
    // v = dx/dt  →  cos term gets ω·B·phi, sin term gets -ω·A·phi
    var v1c1 =  B1 * phi1[0] * omega1,  v1s1 = -A1 * phi1[0] * omega1;
    var v1c2 =  B2 * phi2[0] * omega2,  v1s2 = -A2 * phi2[0] * omega2;

    var v2c1 =  B1 * phi1[1] * omega1,  v2s1 = -A1 * phi1[1] * omega1;
    var v2c2 =  B2 * phi2[1] * omega2,  v2s2 = -A2 * phi2[1] * omega2;

    // ── Acceleration coefficients ───────────────────────────────────────────
    // a = d²x/dt²  →  -ω² times the position coefficients
    var w1sq = omega1 * omega1,  w2sq = omega2 * omega2;

    var a1c1 = -A1 * phi1[0] * w1sq,  a1s1 = -B1 * phi1[0] * w1sq;
    var a1c2 = -A2 * phi2[0] * w2sq,  a1s2 = -B2 * phi2[0] * w2sq;

    var a2c1 = -A1 * phi1[1] * w1sq,  a2s1 = -B1 * phi1[1] * w1sq;
    var a2c2 = -A2 * phi2[1] * w2sq,  a2s2 = -B2 * phi2[1] * w2sq;

    // ── Build solution functions ────────────────────────────────────────────
    var w1 = omega1, w2 = omega2;

    function make(cc1, cs1, cc2, cs2) {
      return function (t) {
        return cc1 * Math.cos(w1 * t) + cs1 * Math.sin(w1 * t) +
               cc2 * Math.cos(w2 * t) + cs2 * Math.sin(w2 * t);
      };
    }

    var x1 = make(x1c1, x1s1, x1c2, x1s2);
    var x2 = make(x2c1, x2s1, x2c2, x2s2);
    var v1 = make(v1c1, v1s1, v1c2, v1s2);
    var v2 = make(v2c1, v2s1, v2c2, v2s2);
    var a1 = make(a1c1, a1s1, a1c2, a1s2);
    var a2 = make(a2c1, a2s1, a2c2, a2s2);

    return {
      omega1: omega1, omega2: omega2,
      phi1:   phi1,   phi2:   phi2,
      A1: A1, B1: B1, A2: A2, B2: B2,
      x1: x1, x2: x2,
      v1: v1, v2: v2,
      a1: a1, a2: a2,
      coeffs: {
        x1: { c1: x1c1, s1: x1s1, c2: x1c2, s2: x1s2 },
        x2: { c1: x2c1, s1: x2s1, c2: x2c2, s2: x2s2 },
        v1: { c1: v1c1, s1: v1s1, c2: v1c2, s2: v1s2 },
        v2: { c1: v2c1, s1: v2s1, c2: v2c2, s2: v2s2 },
        a1: { c1: a1c1, s1: a1s1, c2: a1c2, s2: a1s2 },
        a2: { c1: a2c1, s1: a2s1, c2: a2c2, s2: a2s2 }
      }
    };
  }

  // ─── generateLatex ────────────────────────────────────────────────────────

  /**
   * Build LaTeX strings for the analytic solution.
   * Returns { omegas, x1, x2, v1, v2, a1, a2 }.
   */
  function generateLatex(solveResult, maxDen) {
    var F = window.Fractions;
    var omega1 = solveResult.omega1;
    var omega2 = solveResult.omega2;
    var coeffs = solveResult.coeffs;

    var trigs = [
      '\\cos(\\omega_1 t)',
      '\\sin(\\omega_1 t)',
      '\\cos(\\omega_2 t)',
      '\\sin(\\omega_2 t)'
    ];

    function buildExpr(varName, c) {
      var vals = [c.c1, c.s1, c.c2, c.s2];
      var expr = '';
      var first = true;

      for (var i = 0; i < 4; i++) {
        var coeff = vals[i];
        if (Math.abs(coeff) < 1e-12) continue;

        var frac   = F.toFraction(Math.abs(coeff), maxDen);
        var isNeg  = coeff < 0;
        var isUnit = frac && frac.n === 1 && frac.d === 1;

        var sign;
        if (first) {
          sign = isNeg ? '-' : '';
        } else {
          sign = isNeg ? ' - ' : ' + ';
        }

        var coeffStr;
        if (isUnit) {
          coeffStr = '';
        } else if (frac) {
          var n = frac.n, d = frac.d;
          coeffStr = d === 1 ? ('' + n) : ('\\frac{' + n + '}{' + d + '}');
        } else {
          coeffStr = Math.abs(coeff).toFixed(4);
        }

        expr += sign + coeffStr + trigs[i];
        first = false;
      }

      if (first) expr = '0';
      return varName + '(t) = ' + expr;
    }

    var omegaLine =
      '\\omega_1 \\approx ' + omega1.toFixed(4) +
      ', \\quad \\omega_2 \\approx ' + omega2.toFixed(4);

    return {
      omegas: omegaLine,
      x1: buildExpr('x_1', coeffs.x1),
      x2: buildExpr('x_2', coeffs.x2),
      v1: buildExpr('v_1', coeffs.v1),
      v2: buildExpr('v_2', coeffs.v2),
      a1: buildExpr('a_1', coeffs.a1),
      a2: buildExpr('a_2', coeffs.a2)
    };
  }

  // ─── findFirstTime ────────────────────────────────────────────────────────

  /**
   * Find the first time t ∈ [0, tMaxSearch] at which
   * solveResult[quantity + mass](t) ≈ target.
   *
   * mass:     1 or 2
   * quantity: 'x' | 'v' | 'a'
   * Returns:  { found: bool, t: number|null }
   */
  function findFirstTime(solveResult, mass, quantity, target, tMaxSearch, tolerance) {
    if (tMaxSearch === undefined || tMaxSearch === null) tMaxSearch = 100;
    if (tolerance  === undefined || tolerance  === null) tolerance  = 1e-8;

    var fn = solveResult[quantity + mass];
    if (typeof fn !== 'function') return { found: false, t: null };

    var N  = 2000;
    var dt = tMaxSearch / N;

    var t_a = 0;
    var f_a = fn(0) - target;

    if (Math.abs(f_a) <= tolerance) return { found: true, t: 0 };

    for (var i = 1; i <= N; i++) {
      var t_b = i * dt;
      var f_b = fn(t_b) - target;

      if (Math.abs(f_b) <= tolerance) return { found: true, t: t_b };

      if (f_a * f_b < 0) {
        // Bisection
        var lo = t_a, flo = f_a;
        var hi = t_b, fhi = f_b;

        for (var j = 0; j < 60; j++) {
          var mid  = (lo + hi) / 2;
          var fmid = fn(mid) - target;

          if (Math.abs(fmid) <= tolerance || (hi - lo) < tolerance * 0.5) {
            return { found: true, t: mid };
          }

          if (flo * fmid < 0) { hi = mid; fhi = fmid; }
          else                 { lo = mid; flo = fmid; }
        }

        return { found: true, t: (lo + hi) / 2 };
      }

      t_a = t_b;
      f_a = f_b;
    }

    return { found: false, t: null };
  }

  // ─── valuesAtTime ─────────────────────────────────────────────────────────

  /**
   * Return { x1, x2, v1, v2, a1, a2 } evaluated at time t.
   */
  function valuesAtTime(solveResult, t) {
    return {
      x1: solveResult.x1(t),
      x2: solveResult.x2(t),
      v1: solveResult.v1(t),
      v2: solveResult.v2(t),
      a1: solveResult.a1(t),
      a2: solveResult.a2(t)
    };
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  return {
    solve:         solve,
    generateLatex: generateLatex,
    findFirstTime: findFirstTime,
    valuesAtTime:  valuesAtTime
  };
})();
