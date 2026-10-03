/* app.js – main application logic */
(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────────────────────
  var currentSolveResult = null;
  var currentToggle      = 'position';

  // ─── Spinner utilities ───────────────────────────────────────────────────────
  function minDelay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function showSpinner(btn) {
    var sp = btn.querySelector('.spinner');
    if (sp) sp.classList.remove('spinner--hidden');
    btn.disabled = true;
  }

  function hideSpinner(btn) {
    var sp = btn.querySelector('.spinner');
    if (sp) sp.classList.add('spinner--hidden');
    btn.disabled = false;
  }

  // ─── Parameter collection ────────────────────────────────────────────────────
  function num(id, fallback) {
    var v = parseFloat(document.getElementById(id).value);
    return isNaN(v) ? fallback : v;
  }

  function getParams() {
    return {
      config:  document.getElementById('config').value,
      m1:      num('m1',      1),
      m2:      num('m2',      1),
      k1:      num('k1',      1),
      k2:      num('k2',      1),
      k3:      num('k3',      1),
      x10:     num('x10',     1),
      x20:     num('x20',     0),
      v10:     num('v10',     0),
      v20:     num('v20',     0),
      tMax:    num('tMax',   20),
      samples: Math.max(2, Math.round(num('samples', 500))),
      maxDen:  Math.max(1,  Math.round(num('maxDen',  100)))
    };
  }

  // ─── Config dropdown ─────────────────────────────────────────────────────────
  function onConfigChange() {
    var cfg    = document.getElementById('config').value;
    var k3row  = document.getElementById('k3-field');
    if (k3row) {
      k3row.style.display = (cfg === 'three-spring') ? '' : 'none';
    }
  }

  // ─── LaTeX rendering ─────────────────────────────────────────────────────────
  function renderLatex(solveResult, maxDen) {
    var L      = Physics.generateLatex(solveResult, maxDen);
    var output = document.getElementById('latex-output');

    var rows = [
      { label: 'Angular frequencies', latex: L.omegas },
      { label: 'Mass 1 – position',   latex: L.x1     },
      { label: 'Mass 2 – position',   latex: L.x2     },
      { label: 'Mass 1 – velocity',   latex: L.v1     },
      { label: 'Mass 2 – velocity',   latex: L.v2     },
      { label: 'Mass 1 – acceleration', latex: L.a1   },
      { label: 'Mass 2 – acceleration', latex: L.a2   }
    ];

    output.innerHTML = rows.map(function (r) {
      var rendered = katex.renderToString(r.latex, {
        displayMode:  true,
        throwOnError: false
      });
      return '<div class="latex-row">' +
               '<div class="latex-label">' + r.label + '</div>' +
               '<div class="latex-eq">' + rendered + '</div>' +
             '</div>';
    }).join('');
  }

  // ─── Plot rendering ───────────────────────────────────────────────────────────
  function renderPlot(solveResult, toggle) {
    var params  = getParams();
    var tMax    = params.tMax;
    var samples = params.samples;

    var t = [];
    for (var i = 0; i < samples; i++) {
      t.push(i * tMax / (samples - 1));
    }

    var BLUE = '#1a73e8';
    var RED  = '#ea4335';

    if (toggle === 'all') {
      var x1arr = t.map(function (ti) { return solveResult.x1(ti); });
      var x2arr = t.map(function (ti) { return solveResult.x2(ti); });
      var v1arr = t.map(function (ti) { return solveResult.v1(ti); });
      var v2arr = t.map(function (ti) { return solveResult.v2(ti); });
      var a1arr = t.map(function (ti) { return solveResult.a1(ti); });
      var a2arr = t.map(function (ti) { return solveResult.a2(ti); });

      var traces = [
        { x: t, y: x1arr, name: 'm₁ position',     line: { color: BLUE }, xaxis: 'x',  yaxis: 'y'  },
        { x: t, y: x2arr, name: 'm₂ position',     line: { color: RED  }, xaxis: 'x',  yaxis: 'y'  },
        { x: t, y: v1arr, name: 'm₁ velocity',     line: { color: BLUE }, xaxis: 'x2', yaxis: 'y2' },
        { x: t, y: v2arr, name: 'm₂ velocity',     line: { color: RED  }, xaxis: 'x2', yaxis: 'y2' },
        { x: t, y: a1arr, name: 'm₁ acceleration', line: { color: BLUE }, xaxis: 'x3', yaxis: 'y3' },
        { x: t, y: a2arr, name: 'm₂ acceleration', line: { color: RED  }, xaxis: 'x3', yaxis: 'y3' }
      ];

      var layout = {
        grid: { rows: 3, cols: 1, pattern: 'independent' },
        xaxis:  { title: 'Time' },
        yaxis:  { title: 'Position' },
        xaxis2: { title: 'Time' },
        yaxis2: { title: 'Velocity' },
        xaxis3: { title: 'Time' },
        yaxis3: { title: 'Acceleration' },
        height:     700,
        showlegend: true,
        margin:     { t: 30, b: 50, l: 60, r: 20 }
      };

      Plotly.react('plot', traces, layout);
    } else {
      var y1, y2, yTitle, title;

      if (toggle === 'position') {
        y1     = t.map(function (ti) { return solveResult.x1(ti); });
        y2     = t.map(function (ti) { return solveResult.x2(ti); });
        yTitle = 'Position (x)';
        title  = 'Position vs Time';
      } else if (toggle === 'velocity') {
        y1     = t.map(function (ti) { return solveResult.v1(ti); });
        y2     = t.map(function (ti) { return solveResult.v2(ti); });
        yTitle = 'Velocity (v)';
        title  = 'Velocity vs Time';
      } else {
        y1     = t.map(function (ti) { return solveResult.a1(ti); });
        y2     = t.map(function (ti) { return solveResult.a2(ti); });
        yTitle = 'Acceleration (a)';
        title  = 'Acceleration vs Time';
      }

      Plotly.react('plot', [
        { x: t, y: y1, name: 'Mass 1', mode: 'lines', line: { color: BLUE } },
        { x: t, y: y2, name: 'Mass 2', mode: 'lines', line: { color: RED  } }
      ], {
        title:      title,
        xaxis:      { title: 'Time' },
        yaxis:      { title: yTitle },
        showlegend: true,
        margin:     { t: 50, b: 50, l: 60, r: 20 }
      });
    }
  }

  // ─── Solve button ─────────────────────────────────────────────────────────────
  function onSolve() {
    var btn     = document.getElementById('btn-solve');
    var overlay = document.getElementById('plot-overlay');
    var params  = getParams();

    showSpinner(btn);
    overlay.style.display = 'flex';

    Promise.all([
      new Promise(function (resolve, reject) {
        try {
          resolve(Physics.solve(params));
        } catch (e) {
          reject(e);
        }
      }),
      minDelay(2000)
    ]).then(function (results) {
      var result = results[0];
      currentSolveResult = result;

      renderPlot(result, currentToggle);
      renderLatex(result, params.maxDen);
    }).catch(function (err) {
      console.error('Solve error:', err);
      var output = document.getElementById('latex-output');
      output.innerHTML = '<p style="color:#c5221f">Error: ' + err.message + '</p>';
    }).finally(function () {
      hideSpinner(btn);
      overlay.style.display = 'none';
    });
  }

  // ─── Toggle buttons ───────────────────────────────────────────────────────────
  function onToggle(toggle) {
    if (!currentSolveResult) return;

    currentToggle = toggle;

    document.querySelectorAll('.toggle-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.toggle === toggle);
    });

    var overlay = document.getElementById('plot-overlay');
    overlay.style.display = 'flex';

    Promise.all([
      new Promise(function (resolve) {
        renderPlot(currentSolveResult, toggle);
        resolve();
      }),
      minDelay(2000)
    ]).finally(function () {
      overlay.style.display = 'none';
    });
  }

  // ─── Values at time utility ───────────────────────────────────────────────────
  function onValuesAtTime() {
    if (!currentSolveResult) {
      document.getElementById('values-output').textContent = 'Please solve first.';
      return;
    }

    var btn = document.getElementById('btn-values');
    var t   = parseFloat(document.getElementById('util-time').value);
    if (isNaN(t)) { document.getElementById('values-output').textContent = 'Invalid time.'; return; }

    showSpinner(btn);

    Promise.all([
      new Promise(function (resolve) {
        resolve(Physics.valuesAtTime(currentSolveResult, t));
      }),
      minDelay(2000)
    ]).then(function (res) {
      var v = res[0];
      document.getElementById('values-output').textContent =
        'At t = ' + t.toFixed(6) + ':\n' +
        '  x₁ = ' + v.x1.toFixed(8) + '\n' +
        '  x₂ = ' + v.x2.toFixed(8) + '\n' +
        '  v₁ = ' + v.v1.toFixed(8) + '\n' +
        '  v₂ = ' + v.v2.toFixed(8) + '\n' +
        '  a₁ = ' + v.a1.toFixed(8) + '\n' +
        '  a₂ = ' + v.a2.toFixed(8);
    }).finally(function () {
      hideSpinner(btn);
    });
  }

  // ─── Find first time utility ──────────────────────────────────────────────────
  function onFindFirstTime() {
    if (!currentSolveResult) {
      document.getElementById('find-time-output').textContent = 'Please solve first.';
      return;
    }

    var btn        = document.getElementById('btn-find-time');
    var mass       = parseInt(document.getElementById('util-mass').value,   10);
    var qty        = document.getElementById('util-qty').value;
    var target     = parseFloat(document.getElementById('util-target').value);
    var tMaxSearch = parseFloat(document.getElementById('util-tmax-search').value);
    var tol        = parseFloat(document.getElementById('util-tol').value);

    if (isNaN(target))     { document.getElementById('find-time-output').textContent = 'Invalid target.';   return; }
    if (isNaN(tMaxSearch)) tMaxSearch = 100;
    if (isNaN(tol))        tol        = 1e-8;

    showSpinner(btn);

    var outputEl = document.getElementById('find-time-output');

    Promise.all([
      new Promise(function (resolve) {
        resolve(Physics.findFirstTime(
          currentSolveResult, mass, qty, target, tMaxSearch, tol
        ));
      }),
      minDelay(2000)
    ]).then(function (res) {
      var r    = res[0];
      var qMap = { x: 'position', v: 'velocity', a: 'acceleration' };
      var desc = 'm' + mass + ' ' + (qMap[qty] || qty);

      if (r.found) {
        outputEl.innerHTML =
          '<span class="result-found">Found:</span> ' +
          desc + ' = ' + target + ' first at t ≈ ' + r.t.toExponential(10);
      } else {
        outputEl.innerHTML =
          '<span class="result-not-found">Not found</span> within t ∈ [0, ' +
          tMaxSearch + '].';
      }
    }).finally(function () {
      hideSpinner(btn);
    });
  }

  // ─── Wire up events ───────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Config dropdown
    var configSel = document.getElementById('config');
    if (configSel) {
      configSel.addEventListener('change', onConfigChange);
      onConfigChange(); // set initial visibility
    }

    // Solve button
    var btnSolve = document.getElementById('btn-solve');
    if (btnSolve) btnSolve.addEventListener('click', onSolve);

    // Toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        onToggle(this.dataset.toggle);
      });
    });

    // Values at time
    var btnValues = document.getElementById('btn-values');
    if (btnValues) btnValues.addEventListener('click', onValuesAtTime);

    // Find first time
    var btnFind = document.getElementById('btn-find-time');
    if (btnFind) btnFind.addEventListener('click', onFindFirstTime);
  });
})();
