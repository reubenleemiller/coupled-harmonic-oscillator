/**
 * ForcedOscillatorRK4 – numerical (RK4) solver for a driven two-mass spring system.
 *
 * Equations of motion with external forcing:
 *   m₁ ẍ₁ = -(k₁+k₂) x₁ + k₂ x₂ + F₁(t)
 *   m₂ ẍ₂ =  k₂ x₁  - (k₂+k₃) x₂ + F₂(t)
 *
 * Supported force shapes (forceType):
 *   'cos'  →  F(t) = A · cos(ωt − φ)
 *   'sin'  →  F(t) = A · sin(ωt − φ)
 *
 * forceTarget controls which mass receives the force:
 *   'mass1' | 'mass2' | 'both'
 *
 * The public interface is intentionally identical to CoupledOscillator so
 * the rest of the application can treat both classes uniformly.
 */
export class ForcedOscillatorRK4 {
  /**
   * @param {{
   *   m1: number, m2: number,
   *   k1: number, k2: number, k3: number,
   *   x10?: number, x20?: number,
   *   v10?: number, v20?: number,
   *   tMax?: number, steps?: number,
   *   forceType?: 'cos'|'sin',
   *   forceTarget?: 'mass1'|'mass2'|'both',
   *   forceA?: number,
   *   forceOmega?: number,
   *   forcePhi?: number
   * }} params
   */
  constructor(params) {
    const {
      m1, m2, k1, k2, k3,
      x10 = 0, x20 = 0, v10 = 0, v20 = 0,
      tMax = 30, steps = 600,
      forceType = 'cos',
      forceTarget = 'mass1',
      forceA = 1, forceOmega = 1, forcePhi = 0,
    } = params;

    this.m1 = m1; this.m2 = m2;
    this.k1 = k1; this.k2 = k2; this.k3 = k3;

    // Build per-mass force functions
    const trigFn = forceType === 'sin'
      ? (t) => forceA * Math.sin(forceOmega * t - forcePhi)
      : (t) => forceA * Math.cos(forceOmega * t - forcePhi);

    this._F1 = (forceTarget === 'mass1' || forceTarget === 'both') ? trigFn : () => 0;
    this._F2 = (forceTarget === 'mass2' || forceTarget === 'both') ? trigFn : () => 0;

    // RK4 integration
    const h = tMax / steps;
    const ts  = new Float64Array(steps + 1);
    const x1s = new Float64Array(steps + 1);
    const v1s = new Float64Array(steps + 1);
    const x2s = new Float64Array(steps + 1);
    const v2s = new Float64Array(steps + 1);

    ts[0]  = 0;
    x1s[0] = x10; v1s[0] = v10;
    x2s[0] = x20; v2s[0] = v20;

    const deriv = (t, x1, v1, x2, v2) => {
      const acc1 = (-(k1 + k2) * x1 + k2 * x2 + this._F1(t)) / m1;
      const acc2 = (k2 * x1 - (k2 + k3) * x2 + this._F2(t)) / m2;
      return [v1, acc1, v2, acc2];
    };

    let cx1 = x10, cv1 = v10, cx2 = x20, cv2 = v20;
    for (let i = 0; i < steps; i++) {
      const t = i * h;
      const [dv1k1, da1k1, dv2k1, da2k1] = deriv(t,       cx1,                 cv1,                 cx2,                 cv2);
      const [dv1k2, da1k2, dv2k2, da2k2] = deriv(t + h/2, cx1 + h/2 * dv1k1,  cv1 + h/2 * da1k1,  cx2 + h/2 * dv2k1,  cv2 + h/2 * da2k1);
      const [dv1k3, da1k3, dv2k3, da2k3] = deriv(t + h/2, cx1 + h/2 * dv1k2,  cv1 + h/2 * da1k2,  cx2 + h/2 * dv2k2,  cv2 + h/2 * da2k2);
      const [dv1k4, da1k4, dv2k4, da2k4] = deriv(t + h,   cx1 + h   * dv1k3,  cv1 + h   * da1k3,  cx2 + h   * dv2k3,  cv2 + h   * da2k3);

      cx1 += h / 6 * (dv1k1 + 2 * dv1k2 + 2 * dv1k3 + dv1k4);
      cv1 += h / 6 * (da1k1 + 2 * da1k2 + 2 * da1k3 + da1k4);
      cx2 += h / 6 * (dv2k1 + 2 * dv2k2 + 2 * dv2k3 + dv2k4);
      cv2 += h / 6 * (da2k1 + 2 * da2k2 + 2 * da2k3 + da2k4);

      ts[i + 1]  = (i + 1) * h;
      x1s[i + 1] = cx1; v1s[i + 1] = cv1;
      x2s[i + 1] = cx2; v2s[i + 1] = cv2;
    }

    this._ts  = ts;
    this._x1s = x1s; this._v1s = v1s;
    this._x2s = x2s; this._v2s = v2s;
    this._h     = h;
    this._steps = steps;
    this._tMax  = tMax;

    // omega1 / omega2 are not meaningful for the forced system but
    // are kept to maintain interface compatibility.
    this.omega1 = 0;
    this.omega2 = 0;
  }

  // ── Interpolation helper ──────────────────────────────────────────────────

  _interpolate(arr, t) {
    if (t <= 0) return arr[0];
    if (t >= this._tMax) return arr[this._steps];
    const idx  = Math.floor(t / this._h);
    const frac = (t - idx * this._h) / this._h;
    return arr[idx] * (1 - frac) + arr[idx + 1] * frac;
  }

  // ── Public interface (mirrors CoupledOscillator) ──────────────────────────

  position(mass, t) {
    return this._interpolate(mass === 1 ? this._x1s : this._x2s, t);
  }

  velocity(mass, t) {
    return this._interpolate(mass === 1 ? this._v1s : this._v2s, t);
  }

  /**
   * Acceleration computed directly from the equations of motion
   * (avoids a second numerical differentiation step).
   */
  acceleration(mass, t) {
    const x1 = this.position(1, t);
    const x2 = this.position(2, t);
    const { k1, k2, k3, m1, m2 } = this;
    if (mass === 1) {
      return (-(k1 + k2) * x1 + k2 * x2 + this._F1(t)) / m1;
    }
    return (k2 * x1 - (k2 + k3) * x2 + this._F2(t)) / m2;
  }

  /** Position, velocity, and acceleration of both masses at time t. */
  valueAtTime(t) {
    return {
      x1: this.position(1, t), v1: this.velocity(1, t), a1: this.acceleration(1, t),
      x2: this.position(2, t), v2: this.velocity(2, t), a2: this.acceleration(2, t),
    };
  }

  /**
   * Find the first time t ∈ [tMin, tMax] where the specified quantity of
   * the specified mass equals `target` (within `tolerance`).
   * Search is capped at the integration range (_tMax).
   *
   * @param {1|2} mass
   * @param {'x'|'v'|'a'} quantity
   * @param {number} target
   * @param {{ tMin?: number, tMax?: number, dt?: number, tolerance?: number }} [opts]
   * @returns {number|null}
   */
  firstTimeTo(mass, quantity, target, opts = {}) {
    const {
      tMin = 0,
      tMax = this._tMax,
      dt = 0.01,
      tolerance = 1e-9,
    } = opts;

    const searchMax = Math.min(tMax, this._tMax);

    const fn =
      quantity === 'x' ? (t) => this.position(mass, t)
      : quantity === 'v' ? (t) => this.velocity(mass, t)
      : (t) => this.acceleration(mass, t);

    let prevT = tMin;
    let prevF = fn(tMin) - target;

    if (Math.abs(prevF) < tolerance) return tMin;

    for (let t = tMin + dt; t <= searchMax + dt * 0.5; t += dt) {
      const curT = Math.min(t, searchMax);
      const curF = fn(curT) - target;

      if (Math.abs(curF) < tolerance) return curT;

      if (prevF * curF < 0) {
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
      if (curT >= searchMax) break;
    }

    return null;
  }
}
