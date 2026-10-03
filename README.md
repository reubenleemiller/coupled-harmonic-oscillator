# Coupled Harmonic Oscillator

Interactive visualization and exploration tool for a **coupled harmonic oscillator** system.

This project is a small browser-based app (HTML/CSS/JS) intended to help you build intuition for coupled oscillators by letting you tweak parameters and observe the resulting motion.

---

## Demo / Running the app

### Option A: Open directly (simplest)
1. Clone or download this repo
2. Open `index.html` in your browser

> Note: Some browsers apply stricter rules when opening files via `file://`. If anything doesn’t load as expected, use the local server option below.

### Option B: Run a local web server
From the repo root:

```bash
# Python 3
python -m http.server 8000
```

Then open:
- http://localhost:8000

---

## Project structure

- `index.html` — main UI (controls + canvas/visualization)
- `styles.css` — styling
- `app.js` — UI wiring + rendering/animation loop
- `physics.js` — oscillator physics / simulation logic
- `fractions.js` — helper utilities (fraction/math helpers)
- `tests.html` — in-browser test runner page (if applicable)
- `tests/` — test-related assets/files
- `package.json` — dev tooling (Jest + Babel) configuration

---

## Development

### Install (optional)
If you want to run JavaScript tests via Jest:

```bash
npm install
```

### Run tests
```bash
npm test
```

(Uses `jest` as defined in `package.json`.)

---

## Notes / Assumptions

- This is a **client-side** app: no backend required.
- Designed for interactive experimentation/visualization, not as a packaged npm library.

---

## Contributing

Issues and PRs are welcome—especially improvements to:
- numerical stability / integrators
- clearer parameter naming and units in the UI
- additional plots (energy, phase space, normal modes)
- documentation and examples

---

## License

No license file is currently included. If you want others to reuse or contribute comfortably, consider adding a license (e.g., MIT).
