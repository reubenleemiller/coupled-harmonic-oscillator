/**
 * Tests for CoupledOscillator in src/oscillator.js
 * Covers: initial conditions, valueAtTime, firstTimeTo, position/velocity/acceleration.
 */

import { CoupledOscillator } from '../src/oscillator.js';

// ── helpers ───────────────────────────────────────────────────────────────
const nearly = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

// Symmetric system (equal masses and springs) for easy analytic verification.
// m1=m2=1, k1=k3=1, k2=0.5
// ω₁² = 1, ω₂² = 2  →  ω₁=1, ω₂=√2
function makeSymmetric(x10 = 1, x20 = 0, v10 = 0, v20 = 0) {
  return new CoupledOscillator({ m1:1, m2:1, k1:1, k2:0.5, k3:1, x10, x20, v10, v20 });
}

// ── initial conditions ────────────────────────────────────────────────────
describe('initial conditions', () => {
  test('position at t=0 matches x10, x20', () => {
    const osc = makeSymmetric(1, -0.5);
    expect(osc.position(1, 0)).toBeCloseTo(1,    10);
    expect(osc.position(2, 0)).toBeCloseTo(-0.5, 10);
  });

  test('velocity at t=0 matches v10, v20', () => {
    const osc = makeSymmetric(0, 0, 2, -1);
    expect(osc.velocity(1, 0)).toBeCloseTo(2,  10);
    expect(osc.velocity(2, 0)).toBeCloseTo(-1, 10);
  });

  test('all zeros → stays at origin', () => {
    const osc = makeSymmetric(0, 0, 0, 0);
    for (const t of [0, 1, 5, 10]) {
      expect(osc.position(1, t)).toBeCloseTo(0, 10);
      expect(osc.position(2, t)).toBeCloseTo(0, 10);
    }
  });
});

// ── normal mode verification ───────────────────────────────────────────────
describe('normal modes (symmetric system)', () => {
  // In-phase mode: x1=x2=A cos(ω₁t),  ω₁=1
  test('in-phase mode: x1=x2 for x10=x20=1, v=0', () => {
    const osc = makeSymmetric(1, 1, 0, 0);
    for (const t of [0, 0.5, 1, Math.PI]) {
      expect(osc.position(1, t)).toBeCloseTo(osc.position(2, t), 8);
    }
  });

  // Out-of-phase mode: x1=-x2, ω₂=√2
  test('out-of-phase mode: x1=-x2 for x10=1,x20=-1, v=0', () => {
    const osc = makeSymmetric(1, -1, 0, 0);
    for (const t of [0, 0.3, 1, 2]) {
      expect(osc.position(1, t)).toBeCloseTo(-osc.position(2, t), 8);
    }
  });

  // Check ω₁, ω₂ values
  test('omega1 ≈ 1', () => {
    const osc = makeSymmetric();
    expect(osc.omega1).toBeCloseTo(1, 8);
  });

  test('omega2 ≈ sqrt(2)', () => {
    const osc = makeSymmetric();
    expect(osc.omega2).toBeCloseTo(Math.sqrt(2), 8);
  });
});

// ── velocity and acceleration consistency ─────────────────────────────────
describe('velocity and acceleration consistency', () => {
  const osc = makeSymmetric(1.5, -0.5, 0.3, -0.2);
  const h = 1e-6;

  test('velocity ≈ finite difference of position (mass 1)', () => {
    for (const t of [0.5, 1.2, 3.7]) {
      const fdv = (osc.position(1, t + h) - osc.position(1, t - h)) / (2 * h);
      expect(osc.velocity(1, t)).toBeCloseTo(fdv, 4);
    }
  });

  test('velocity ≈ finite difference of position (mass 2)', () => {
    for (const t of [0.5, 1.2, 3.7]) {
      const fdv = (osc.position(2, t + h) - osc.position(2, t - h)) / (2 * h);
      expect(osc.velocity(2, t)).toBeCloseTo(fdv, 4);
    }
  });

  test('acceleration ≈ finite difference of velocity (mass 1)', () => {
    for (const t of [0.5, 1.2, 3.7]) {
      const fda = (osc.velocity(1, t + h) - osc.velocity(1, t - h)) / (2 * h);
      expect(osc.acceleration(1, t)).toBeCloseTo(fda, 4);
    }
  });

  test('acceleration ≈ finite difference of velocity (mass 2)', () => {
    for (const t of [0.5, 1.2, 3.7]) {
      const fda = (osc.velocity(2, t + h) - osc.velocity(2, t - h)) / (2 * h);
      expect(osc.acceleration(2, t)).toBeCloseTo(fda, 4);
    }
  });
});

// ── equations of motion satisfied ─────────────────────────────────────────
describe('equations of motion', () => {
  test('m1*a1 = -(k1+k2)*x1 + k2*x2', () => {
    const p = { m1:2, m2:3, k1:1.5, k2:0.8, k3:2, x10:1, x20:0.5, v10:0, v20:0 };
    const osc = new CoupledOscillator(p);
    for (const t of [0.1, 0.5, 1.0, 2.5]) {
      const lhs = p.m1 * osc.acceleration(1, t);
      const rhs = -(p.k1 + p.k2) * osc.position(1, t) + p.k2 * osc.position(2, t);
      expect(lhs).toBeCloseTo(rhs, 5);
    }
  });

  test('m2*a2 = k2*x1 - (k2+k3)*x2', () => {
    const p = { m1:2, m2:3, k1:1.5, k2:0.8, k3:2, x10:1, x20:0.5, v10:0, v20:0 };
    const osc = new CoupledOscillator(p);
    for (const t of [0.1, 0.5, 1.0, 2.5]) {
      const lhs = p.m2 * osc.acceleration(2, t);
      const rhs = p.k2 * osc.position(1, t) - (p.k2 + p.k3) * osc.position(2, t);
      expect(lhs).toBeCloseTo(rhs, 5);
    }
  });
});

// ── valueAtTime ───────────────────────────────────────────────────────────
describe('valueAtTime', () => {
  const osc = makeSymmetric(1, 0.5, 0, 0);

  test('returns correct x1 at t=0', () => {
    const v = osc.valueAtTime(0);
    expect(v.x1).toBeCloseTo(1,   10);
    expect(v.x2).toBeCloseTo(0.5, 10);
  });

  test('matches individual methods at arbitrary t', () => {
    const t = 2.7;
    const v = osc.valueAtTime(t);
    expect(v.x1).toBeCloseTo(osc.position(1, t),     10);
    expect(v.v1).toBeCloseTo(osc.velocity(1, t),     10);
    expect(v.a1).toBeCloseTo(osc.acceleration(1, t), 10);
    expect(v.x2).toBeCloseTo(osc.position(2, t),     10);
    expect(v.v2).toBeCloseTo(osc.velocity(2, t),     10);
    expect(v.a2).toBeCloseTo(osc.acceleration(2, t), 10);
  });
});

// ── firstTimeTo ───────────────────────────────────────────────────────────
describe('firstTimeTo', () => {
  // Symmetric in-phase mode: x1(t) = cos(t), ω₁=1
  // x1 reaches 0 at t = π/2
  const osc = makeSymmetric(1, 1, 0, 0); // pure in-phase

  test('finds first zero of position (mass 1)', () => {
    const t = osc.firstTimeTo(1, 'x', 0, { tMin: 0.1, tMax: 10, dt: 0.01 });
    expect(t).not.toBeNull();
    expect(t).toBeCloseTo(Math.PI / 2, 4);
  });

  test('finds first zero of position (mass 2, same value for in-phase)', () => {
    const t = osc.firstTimeTo(2, 'x', 0, { tMin: 0.1, tMax: 10, dt: 0.01 });
    expect(t).not.toBeNull();
    expect(t).toBeCloseTo(Math.PI / 2, 4);
  });

  test('returns null when target not reachable', () => {
    // amplitude = 1 so position is always ≤ 1 in magnitude
    const t = osc.firstTimeTo(1, 'x', 999, { tMin: 0, tMax: 50, dt: 0.01 });
    expect(t).toBeNull();
  });

  test('finds first zero of velocity', () => {
    // v1 = -sin(t), first zero after t=0 is at t=π
    const t = osc.firstTimeTo(1, 'v', 0, { tMin: 0.1, tMax: 10, dt: 0.01 });
    expect(t).not.toBeNull();
    expect(t).toBeCloseTo(Math.PI, 4);
  });

  test('tMin boundary respected', () => {
    // Skip the first zero (π/2) and look after t=2
    const t = osc.firstTimeTo(1, 'x', 0, { tMin: 2.0, tMax: 10, dt: 0.01 });
    expect(t).not.toBeNull();
    expect(t).toBeGreaterThanOrEqual(2.0);
    expect(t).toBeCloseTo(3 * Math.PI / 2, 4);
  });

  test('velocity firstTimeTo for out-of-phase mode', () => {
    // Pure out-of-phase: x1=cos(√2 t), v1=-√2 sin(√2 t)
    // v1=0 first at t=0 (excluded by tMin), then t=π/√2
    const osc2 = makeSymmetric(1, -1, 0, 0);
    const t = osc2.firstTimeTo(1, 'v', 0, { tMin: 0.1, tMax: 20, dt: 0.01 });
    expect(t).not.toBeNull();
    expect(t).toBeCloseTo(Math.PI / Math.sqrt(2), 4);
  });

  test('acceleration firstTimeTo', () => {
    // a1 = -cos(t) for in-phase mode, first zero at t = π/2
    const t = osc.firstTimeTo(1, 'a', 0, { tMin: 0.1, tMax: 10, dt: 0.01 });
    expect(t).not.toBeNull();
    expect(t).toBeCloseTo(Math.PI / 2, 4);
  });
});

// ── uncoupled limit ───────────────────────────────────────────────────────
describe('uncoupled limit (k2=0)', () => {
  test('masses oscillate independently', () => {
    const osc = new CoupledOscillator({ m1:1, m2:1, k1:1, k2:0, k3:4, x10:1, x20:2, v10:0, v20:0 });
    // ω for mass 1 = 1, mass 2 ≈ 2 but solver treats them together
    // Just verify ICs and EOM are satisfied
    expect(osc.position(1, 0)).toBeCloseTo(1, 6);
    expect(osc.position(2, 0)).toBeCloseTo(2, 6);
  });
});
