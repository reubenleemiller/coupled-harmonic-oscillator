/**
 * CoupledOscillator – analytic solver for an undamped two-mass spring system.
 *
 * Physical model (displacements x₁, x₂ from equilibrium):
 *
 *   Wall ──[k₁]── m₁ ──[k₂]── m₂ ──[k₃]── Wall
 *
 * Equations of motion:
 *   m₁ ẍ₁ = -(k₁+k₂) x₁ + k₂ x₂
 *   m₂ ẍ₂ =  k₂ x₁  - (k₂+k₃) x₂
 *
 * Normal-mode decomposition yields two angular frequencies ω₁ ≤ ω₂ and
 * eigenvector ratios r₁, r₂.  The general solution is:
 *
 *   x₁(t) = A₁ cos(ω₁t) + B₁ sin(ω₁t) + A₂ cos(ω₂t) + B₂ sin(ω₂t)
 *   x₂(t) = r₁[A₁ cos(ω₁t) + B₁ sin(ω₁t)] + r₂[A₂ cos(ω₂t) + B₂ sin(ω₂t)]
 */
export class CoupledOscillator {
  /**
   * @param {{
   *   m1: number, m2: number,
   *   k1: number, k2: number, k3: number,
   *   x10: number, x20: number,
   *   v10: number, v20: number
   * }} params
   */
  constructor(params) {
    const { m1, m2, k1, k2, k3, x10, x20, v10, v20 } = params;
    this.m1 = m1; this.m2 = m2;
    this.k1 = k1; this.k2 = k2; this.k3 = k3;
    this.x10 = x10; this.x20 = x20;
    this.v10 = v10; this.v20 = v20;
    this._compute();
  }

  _compute() {
    const { m1, m2, k1, k2, k3, x10, x20, v10, v20 } = this;

    // ── eigenfrequencies ──────────────────────────────────────────────────
    const a = (k1 + k2) / m1;   // (k₁+k₂)/m₁
    const b = (k2 + k3) / m2;   // (k₂+k₃)/m₂
    const c2 = (k2 * k2) / (m1 * m2); // k₂²/(m₁m₂)

    const disc = Math.sqrt((a - b) ** 2 + 4 * c2);
    const lam1 = ((a + b) - disc) / 2; // ω₁²
    const lam2 = ((a + b) + disc) / 2; // ω₂²

    this.omega1 = Math.sqrt(Math.max(0, lam1));
    this.omega2 = Math.sqrt(Math.max(0, lam2));

    // ── uncoupled special case (k₂ = 0) ──────────────────────────────────
    // When k₂=0 the two masses oscillate independently at their natural
    // frequencies ω₁=√(k₁/m₁) and ω₂=√(k₃/m₂).  The general normal-mode
    // machinery produces 0/0 for the eigenvector ratios, so we solve
    // each mass directly and return early.
    if (Math.abs(k2) < 1e-14) {
      const w1u = Math.sqrt(Math.max(0, k1 / m1));
      const w2u = Math.sqrt(Math.max(0, k3 / m2));
      this.omega1 = w1u;
      this.omega2 = w2u;
      this.r1 = 0;
      this.r2 = 0;
      this.A1 = x10; this.A2 = 0;
      this.B1 = w1u > 1e-14 ? v10 / w1u : 0;
      this.B2 = 0;
      // Place mass-2 motion entirely in the ω₂ (cw2/sw2) slot so that
      // the common position/velocity/acceleration evaluators work correctly.
      this.coeffs1 = { cw1: x10, sw1: this.B1, cw2: 0, sw2: 0 };
      this.coeffs2 = {
        cw1: 0,
        sw1: 0,
        cw2: x20,
        sw2: w2u > 1e-14 ? v20 / w2u : 0,
      };
      return;
    }

    // ── eigenvector ratios  r_i = (k₁+k₂ − ωᵢ²·m₁) / k₂ ────────────────
    // Eigenvector for mode i: [1, rᵢ]ᵀ
    this.r1 = (k1 + k2 - lam1 * m1) / k2;
    this.r2 = (k1 + k2 - lam2 * m1) / k2;

    const { r1, r2, omega1: w1, omega2: w2 } = this;
    const denom = r1 - r2;

    // ── solve for A₁, A₂ from x₁(0), x₂(0) ─────────────────────────────
    if (Math.abs(denom) < 1e-14) {
      // Degenerate case (equal eigenfrequencies)
      this.A1 = x10;
      this.A2 = 0;
    } else {
      this.A1 = (x20 - r2 * x10) / denom;
      this.A2 = x10 - this.A1;
    }

    // ── solve for B₁, B₂ from v₁(0), v₂(0) ─────────────────────────────
    if (Math.abs(denom) < 1e-14 || Math.abs(w1) < 1e-14) {
      this.B1 = w1 > 1e-14 ? v10 / w1 : 0;
      this.B2 = 0;
    } else {
      this.B1 = (v20 - r2 * v10) / (w1 * denom);
      this.B2 = w2 > 1e-14 ? (v10 - w1 * this.B1) / w2 : 0;
    }

    // ── store named coefficient groups ───────────────────────────────────
    // x₁(t) = cw1·cos(ω₁t) + sw1·sin(ω₁t) + cw2·cos(ω₂t) + sw2·sin(ω₂t)
    // x₂(t) = r₁·cw1·cos(ω₁t) + … (same pattern)
    this.coeffs1 = {
      cw1: this.A1,
      sw1: this.B1,
      cw2: this.A2,
      sw2: this.B2,
    };
    this.coeffs2 = {
      cw1: r1 * this.A1,
      sw1: r1 * this.B1,
      cw2: r2 * this.A2,
      sw2: r2 * this.B2,
    };
  }

  // ── evaluation helpers ──────────────────────────────────────────────────

  /**
   * Position of mass `mass` (1 or 2) at time `t`.
   */
  position(mass, t) {
    const c = mass === 1 ? this.coeffs1 : this.coeffs2;
    const { omega1: w1, omega2: w2 } = this;
    return (
      c.cw1 * Math.cos(w1 * t) +
      c.sw1 * Math.sin(w1 * t) +
      c.cw2 * Math.cos(w2 * t) +
      c.sw2 * Math.sin(w2 * t)
    );
  }

  /**
   * Velocity of mass `mass` at time `t`.
   */
  velocity(mass, t) {
    const c = mass === 1 ? this.coeffs1 : this.coeffs2;
    const { omega1: w1, omega2: w2 } = this;
    return (
      -c.cw1 * w1 * Math.sin(w1 * t) +
       c.sw1 * w1 * Math.cos(w1 * t) +
      -c.cw2 * w2 * Math.sin(w2 * t) +
       c.sw2 * w2 * Math.cos(w2 * t)
    );
  }

  /**
   * Acceleration of mass `mass` at time `t`.
   */
  acceleration(mass, t) {
    const c = mass === 1 ? this.coeffs1 : this.coeffs2;
    const { omega1: w1, omega2: w2 } = this;
    return (
      -c.cw1 * w1 * w1 * Math.cos(w1 * t) -
       c.sw1 * w1 * w1 * Math.sin(w1 * t) +
      -c.cw2 * w2 * w2 * Math.cos(w2 * t) -
       c.sw2 * w2 * w2 * Math.sin(w2 * t)
    );
  }

  /**
   * Position, velocity, and acceleration of both masses at time `t`.
   * @param {number} t
   * @returns {{ x1, v1, a1, x2, v2, a2 }}
   */
  valueAtTime(t) {
    return {
      x1: this.position(1, t),
      v1: this.velocity(1, t),
      a1: this.acceleration(1, t),
      x2: this.position(2, t),
      v2: this.velocity(2, t),
      a2: this.acceleration(2, t),
    };
  }

  /**
   * Find the first time t ∈ [tMin, tMax] where the specified quantity of
   * the specified mass equals `target` (within `tolerance`).
   *
   * Uses a coarse scan followed by bisection refinement.
   *
   * @param {1|2} mass
   * @param {'x'|'v'|'a'} quantity  – position, velocity, or acceleration
   * @param {number} target
   * @param {{ tMin?: number, tMax?: number, dt?: number, tolerance?: number }} [opts]
   * @returns {number|null}  The first time, or null if not found.
   */
  firstTimeTo(mass, quantity, target, opts = {}) {
    const {
      tMin = 0,
      tMax = 100,
      dt = 0.01,
      tolerance = 1e-9,
    } = opts;

    const fn =
      quantity === 'x'
        ? (t) => this.position(mass, t)
        : quantity === 'v'
        ? (t) => this.velocity(mass, t)
        : (t) => this.acceleration(mass, t);

    let prevT = tMin;
    let prevF = fn(tMin) - target;

    // Quick exact-hit check
    if (Math.abs(prevF) < tolerance) return tMin;

    for (let t = tMin + dt; t <= tMax + dt * 0.5; t += dt) {
      const curT = Math.min(t, tMax);
      const curF = fn(curT) - target;

      if (Math.abs(curF) < tolerance) return curT;

      if (prevF * curF < 0) {
        // Sign change – refine with bisection
        let lo = prevT, hi = curT;
        for (let i = 0; i < 60; i++) {
          const mid = (lo + hi) / 2;
          const mf = fn(mid) - target;
          if (Math.abs(mf) < tolerance) return mid;
          if (prevF * mf <= 0) hi = mid;
          else { lo = mid; prevF = mf; }
        }
        return (lo + hi) / 2;
      }

      prevT = curT;
      prevF = curF;
      if (curT >= tMax) break;
    }

    return null;
  }
}
