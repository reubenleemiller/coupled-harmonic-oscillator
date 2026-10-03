/**
 * Tests for ForcedOscillatorRK4 in src/forced-oscillator.js
 *
 * Strategy: compare the RK4 numerical solution against the known analytic
 * solution of the unforced system (zero forcing = forcing with A=0), and
 * verify the forced equations of motion for a simple driven case.
 */

import { ForcedOscillatorRK4 } from '../src/forced-oscillator.js';
import { CoupledOscillator }    from '../src/oscillator.js';

// ── helpers ───────────────────────────────────────────────────────────────
const nearly = (a, b, eps = 1e-4) => Math.abs(a - b) < eps;

// Symmetric system: m1=m2=1, k1=k3=1, k2=0.5  →  ω₁=1, ω₂=√2
function makeForced(overrides = {}) {
  return new ForcedOscillatorRK4({
    m1: 1, m2: 1, k1: 1, k2: 0.5, k3: 1,
    x10: 1, x20: 0, v10: 0, v20: 0,
    tMax: 30, steps: 3000,
    forceType: 'cos', forceTarget: 'mass1',
    forceA: 0, forceOmega: 1, forcePhi: 0,
    ...overrides,
  });
}

// ── zero-force limit matches analytic solution ────────────────────────────
describe('zero forcing matches analytic solution', () => {
  const osc     = new CoupledOscillator({ m1:1, m2:1, k1:1, k2:0.5, k3:1, x10:1, x20:0, v10:0, v20:0 });
  const forced  = makeForced({ forceA: 0 });

  for (const t of [0, 1, 3, 7, 15, 25]) {
    test(`position mass 1 at t=${t}`, () => {
      expect(nearly(forced.position(1, t), osc.position(1, t), 1e-3)).toBe(true);
    });
    test(`position mass 2 at t=${t}`, () => {
      expect(nearly(forced.position(2, t), osc.position(2, t), 1e-3)).toBe(true);
    });
  }
});

// ── initial conditions reproduced ─────────────────────────────────────────
describe('initial conditions', () => {
  test('x1(0) matches x10', () => {
    const f = makeForced({ x10: 1.5, x20: -0.5 });
    expect(f.position(1, 0)).toBeCloseTo(1.5, 6);
    expect(f.position(2, 0)).toBeCloseTo(-0.5, 6);
  });

  test('v1(0) matches v10', () => {
    const f = makeForced({ v10: 2, v20: -1 });
    expect(f.velocity(1, 0)).toBeCloseTo(2, 6);
    expect(f.velocity(2, 0)).toBeCloseTo(-1, 6);
  });
});

// ── equations of motion satisfied (forced) ────────────────────────────────
describe('forced equations of motion', () => {
  // Apply A=1, cos forcing to mass 1.  Use very fine steps for accuracy.
  const A = 1.0, wd = 1.5, phi = 0.3;
  const params = { m1:1, m2:1, k1:1, k2:0.5, k3:1, x10:0, x20:0, v10:0, v20:0,
                   tMax:10, steps:10000,
                   forceType:'cos', forceTarget:'mass1',
                   forceA: A, forceOmega: wd, forcePhi: phi };
  const f = new ForcedOscillatorRK4(params);

  for (const t of [1, 3, 7]) {
    test(`m1*a1 = EOM at t=${t}`, () => {
      const x1 = f.position(1, t), x2 = f.position(2, t);
      const a1 = f.acceleration(1, t);
      const Ft = A * Math.cos(wd * t - phi);
      const rhs = (-(params.k1 + params.k2) * x1 + params.k2 * x2 + Ft) / params.m1;
      expect(a1).toBeCloseTo(rhs, 5);
    });
    test(`m2*a2 = EOM (no force on m2) at t=${t}`, () => {
      const x1 = f.position(1, t), x2 = f.position(2, t);
      const a2 = f.acceleration(2, t);
      const rhs = (params.k2 * x1 - (params.k2 + params.k3) * x2) / params.m2;
      expect(a2).toBeCloseTo(rhs, 5);
    });
  }
});

// ── sine forcing variant ──────────────────────────────────────────────────
describe('sin forcing satisfies EOM', () => {
  const A = 0.8, wd = 2.0, phi = Math.PI / 4;
  const params = { m1:2, m2:1.5, k1:1, k2:0.5, k3:0.5, x10:0.5, x20:0, v10:0, v20:0,
                   tMax:10, steps:10000,
                   forceType:'sin', forceTarget:'mass2',
                   forceA: A, forceOmega: wd, forcePhi: phi };
  const f = new ForcedOscillatorRK4(params);

  for (const t of [2, 5, 8]) {
    test(`m2*a2 = EOM (sin force on m2) at t=${t}`, () => {
      const x1 = f.position(1, t), x2 = f.position(2, t);
      const a2 = f.acceleration(2, t);
      const Ft = A * Math.sin(wd * t - phi);
      const rhs = (params.k2 * x1 - (params.k2 + params.k3) * x2 + Ft) / params.m2;
      expect(a2).toBeCloseTo(rhs, 5);
    });
  }
});

// ── both-masses forcing ───────────────────────────────────────────────────
describe('both-masses forcing', () => {
  const A = 0.5, wd = 1.0, phi = 0;
  const params = { m1:1, m2:1, k1:1, k2:0.5, k3:1, x10:0, x20:0, v10:0, v20:0,
                   tMax:10, steps:10000,
                   forceType:'cos', forceTarget:'both',
                   forceA: A, forceOmega: wd, forcePhi: phi };
  const f = new ForcedOscillatorRK4(params);

  test('both masses receive force at t=3', () => {
    const t = 3;
    const x1 = f.position(1, t), x2 = f.position(2, t);
    const Ft = A * Math.cos(wd * t);
    const rhs1 = (-(params.k1 + params.k2) * x1 + params.k2 * x2 + Ft) / params.m1;
    const rhs2 = (params.k2 * x1 - (params.k2 + params.k3) * x2 + Ft) / params.m2;
    expect(f.acceleration(1, t)).toBeCloseTo(rhs1, 5);
    expect(f.acceleration(2, t)).toBeCloseTo(rhs2, 5);
  });
});

// ── valueAtTime interface ─────────────────────────────────────────────────
describe('valueAtTime', () => {
  const f = makeForced({ x10: 1, x20: 0.5 });

  test('returns object with x1,v1,a1,x2,v2,a2', () => {
    const v = f.valueAtTime(2);
    expect(typeof v.x1).toBe('number');
    expect(typeof v.v1).toBe('number');
    expect(typeof v.a1).toBe('number');
    expect(typeof v.x2).toBe('number');
    expect(typeof v.v2).toBe('number');
    expect(typeof v.a2).toBe('number');
  });

  test('matches individual method calls', () => {
    const t = 5.5;
    const v = f.valueAtTime(t);
    expect(v.x1).toBeCloseTo(f.position(1, t),     10);
    expect(v.v1).toBeCloseTo(f.velocity(1, t),     10);
    expect(v.a1).toBeCloseTo(f.acceleration(1, t), 10);
    expect(v.x2).toBeCloseTo(f.position(2, t),     10);
    expect(v.v2).toBeCloseTo(f.velocity(2, t),     10);
    expect(v.a2).toBeCloseTo(f.acceleration(2, t), 10);
  });
});

// ── firstTimeTo ───────────────────────────────────────────────────────────
describe('firstTimeTo', () => {
  // Unforced, in-phase mode: x1(t) = cos(t), first zero at t=π/2
  const f = makeForced({ x10: 1, x20: 1, v10: 0, v20: 0, forceA: 0, tMax: 30, steps: 6000 });

  test('finds first zero of position (mass 1)', () => {
    const t = f.firstTimeTo(1, 'x', 0, { tMin: 0.1, tMax: 10, dt: 0.01 });
    expect(t).not.toBeNull();
    expect(t).toBeCloseTo(Math.PI / 2, 3);
  });

  test('returns null when target unreachable', () => {
    const t = f.firstTimeTo(1, 'x', 999, { tMin: 0, tMax: 20, dt: 0.01 });
    expect(t).toBeNull();
  });

  test('search is capped at integration tMax', () => {
    // Ask to search beyond tMax=30; should still return a valid answer or null, not throw
    const t = f.firstTimeTo(1, 'x', 0, { tMin: 0.1, tMax: 1000, dt: 0.01 });
    expect(t === null || typeof t === 'number').toBe(true);
    if (t !== null) expect(t).toBeLessThanOrEqual(30);
  });
});

// ── two-spring model (k3=0) ───────────────────────────────────────────────
describe('two-spring model (k3=0)', () => {
  test('equations of motion satisfied with k3=0', () => {
    const params = { m1:1, m2:1, k1:1, k2:0.5, k3:0, x10:1, x20:0, v10:0, v20:0,
                     tMax:10, steps:5000,
                     forceType:'cos', forceTarget:'mass1',
                     forceA:1, forceOmega:0.8, forcePhi:0 };
    const f = new ForcedOscillatorRK4(params);
    const t = 4;
    const x1 = f.position(1, t), x2 = f.position(2, t);
    const Ft = Math.cos(0.8 * t);
    const rhs1 = (-(params.k1 + params.k2) * x1 + params.k2 * x2 + Ft) / params.m1;
    const rhs2 = (params.k2 * x1 - params.k2 * x2) / params.m2;
    expect(f.acceleration(1, t)).toBeCloseTo(rhs1, 5);
    expect(f.acceleration(2, t)).toBeCloseTo(rhs2, 5);
  });
});
