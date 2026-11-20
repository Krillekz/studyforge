/* ==========================================================================
   StudyForge — (3) Math & Graphing Calculator Suite
   A real expression parser (no eval), plus AI step-by-step algebra.
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;
  SF.pages = SF.pages || {};

  /* ===================== expression engine ===================== */

  const CONSTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };
  const PALETTE = ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#22d3ee'];

  function tokenize(src) {
    const s = String(src)
      .replace(/[×·]/g, '*')
      .replace(/÷/g, '/')
      .replace(/[−–]/g, '-')
      .replace(/π/g, 'pi')
      .replace(/√/g, 'sqrt')
      .replace(/,/g, ',');
    const tokens = [];
    let i = 0;

    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }

      if (/[0-9.]/.test(c)) {
        let j = i;
        let dots = 0;
        while (j < s.length && /[0-9.]/.test(s[j])) {
          if (s[j] === '.') dots++;
          j++;
        }
        if (dots > 1) throw new Error('Malformed number in the expression.');
        if ((s[j] === 'e' || s[j] === 'E') && /[0-9]/.test(s[j + 1] || '')) {
          j++;
          while (j < s.length && /[0-9]/.test(s[j])) j++;
        } else if ((s[j] === 'e' || s[j] === 'E') && /[-+]/.test(s[j + 1] || '') && /[0-9]/.test(s[j + 2] || '')) {
          j += 2;
          while (j < s.length && /[0-9]/.test(s[j])) j++;
        }
        const value = Number(s.slice(i, j));
        if (!isFinite(value)) throw new Error('Malformed number "' + s.slice(i, j) + '".');
        tokens.push({ t: 'num', v: value });
        i = j;
        continue;
      }

      if (/[a-zA-Z_]/.test(c)) {
        let j = i;
        while (j < s.length && /[a-zA-Z_0-9]/.test(s[j])) j++;
        tokens.push({ t: 'id', v: s.slice(i, j).toLowerCase() });
        i = j;
        continue;
      }

      if ('+-*/^%!(),'.indexOf(c) !== -1) {
        tokens.push({ t: c });
        i++;
        continue;
      }
      throw new Error('Unexpected character "' + c + '".');
    }
    return tokens;
  }

  function parse(tokens) {
    let pos = 0;
    const peek = function () { return tokens[pos]; };
    const next = function () { return tokens[pos++]; };

    function expr() {
      let node = term();
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        const op = next().t;
        node = { type: 'bin', op: op, a: node, b: term() };
      }
      return node;
    }

    function term() {
      let node = unary();
      for (;;) {
        const p = peek();
        if (!p) break;
        if (p.t === '*' || p.t === '/' || p.t === '%') {
          const op = next().t;
          node = { type: 'bin', op: op, a: node, b: unary() };
          continue;
        }
        /* implicit multiplication: 2x, 3(x+1), (a)(b), x sin(x) */
        if (p.t === 'num' || p.t === 'id' || p.t === '(') {
          node = { type: 'bin', op: '*', a: node, b: unary() };
          continue;
        }
        break;
      }
      return node;
    }

    function unary() {
      const p = peek();
      if (p && p.t === '-') { next(); return { type: 'neg', a: unary() }; }
      if (p && p.t === '+') { next(); return unary(); }
      return power();
    }

    function power() {
      const base = postfix();
      if (peek() && peek().t === '^') {
        next();
        return { type: 'bin', op: '^', a: base, b: unary() };
      }
      return base;
    }

    function postfix() {
      let node = primary();
      while (peek() && peek().t === '!') {
        next();
        node = { type: 'fact', a: node };
      }
      return node;
    }

    function primary() {
      const p = peek();
      if (!p) throw new Error('The expression ended too early.');
      if (p.t === 'num') { next(); return { type: 'num', v: p.v }; }
      if (p.t === '(') {
        next();
        const node = expr();
        if (!peek() || peek().t !== ')') throw new Error('Missing a closing parenthesis.');
        next();
        return node;
      }
      if (p.t === 'id') {
        const name = p.v;
        next();
        if (peek() && peek().t === '(') {
          next();
          const args = [];
          if (peek() && peek().t !== ')') {
            args.push(expr());
            while (peek() && peek().t === ',') { next(); args.push(expr()); }
          }
          if (!peek() || peek().t !== ')') throw new Error('Missing ")" after ' + name + '.');
          next();
          return { type: 'call', name: name, args: args };
        }
        return { type: 'var', name: name };
      }
      throw new Error('Unexpected "' + (p.v || p.t) + '".');
    }

    const ast = expr();
    if (pos < tokens.length) throw new Error('Unexpected "' + (tokens[pos].v || tokens[pos].t) + '".');
    return ast;
  }

  function factorial(n) {
    if (n < 0 || Math.abs(n - Math.round(n)) > 1e-9) throw new Error('Factorial needs a whole number ≥ 0.');
    if (n > 170) return Infinity;
    let out = 1;
    for (let i = 2; i <= n; i++) out *= i;
    return out;
  }

  function evaluateNode(node, scope, opts) {
    const deg = !!(opts && opts.deg);
    const toRad = deg ? Math.PI / 180 : 1;
    const fromRad = deg ? 180 / Math.PI : 1;

    switch (node.type) {
      case 'num':
        return node.v;

      case 'var': {
        if (Object.prototype.hasOwnProperty.call(scope, node.name)) return scope[node.name];
        if (Object.prototype.hasOwnProperty.call(CONSTS, node.name)) return CONSTS[node.name];
        throw new Error('Unknown name "' + node.name + '". Use x, pi, e or a number.');
      }

      case 'neg':
        return -evaluateNode(node.a, scope, opts);

      case 'fact':
        return factorial(evaluateNode(node.a, scope, opts));

      case 'bin': {
        const a = evaluateNode(node.a, scope, opts);
        const b = evaluateNode(node.b, scope, opts);
        switch (node.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return a / b;
          case '%': return a % b;
          case '^': return Math.pow(a, b);
          default: throw new Error('Unknown operator ' + node.op + '.');
        }
      }

      case 'call': {
        const args = node.args.map(function (a) { return evaluateNode(a, scope, opts); });
        const one = function (v) { return args[0] === undefined ? v : args[0]; };
        switch (node.name) {
          case 'sin': return Math.sin(one(0) * toRad);
          case 'cos': return Math.cos(one(0) * toRad);
          case 'tan': return Math.tan(one(0) * toRad);
          case 'asin': return Math.asin(one(0)) * fromRad;
          case 'acos': return Math.acos(one(0)) * fromRad;
          case 'atan': return Math.atan(one(0)) * fromRad;
          case 'sinh': return Math.sinh(one(0));
          case 'cosh': return Math.cosh(one(0));
          case 'tanh': return Math.tanh(one(0));
          case 'ln': return Math.log(one(0));
          case 'log': return Math.log10(one(0));
          case 'log2': return Math.log2(one(0));
          case 'sqrt': return Math.sqrt(one(0));
          case 'cbrt': return Math.cbrt(one(0));
          case 'abs': return Math.abs(one(0));
          case 'exp': return Math.exp(one(0));
          case 'floor': return Math.floor(one(0));
          case 'ceil': return Math.ceil(one(0));
          case 'round': return Math.round(one(0));
          case 'sign': return Math.sign(one(0));
          case 'min': return Math.min.apply(null, args);
          case 'max': return Math.max.apply(null, args);
          case 'pow': return Math.pow(args[0], args[1]);
          default: throw new Error('Unknown function "' + node.name + '".');
        }
      }

      default:
        throw new Error('Cannot evaluate this expression.');
    }
  }

  const cache = new Map();

  function compile(source, opts) {
    const key = (opts && opts.deg ? 'd:' : 'r:') + source;
    if (cache.has(key)) return cache.get(key);
    const ast = parse(tokenize(source));
    const fn = function (scope) { return evaluateNode(ast, scope || {}, opts || {}); };
    cache.set(key, fn);
    return fn;
  }

  function evaluate(source, scope, opts) {
    return compile(source, opts)(scope);
  }

  function fmtNumber(n) {
    if (typeof n !== 'number' || Number.isNaN(n)) return 'undefined';
    if (!isFinite(n)) return n > 0 ? '∞' : '−∞';
    const rounded = Number(n.toPrecision(12));
    if (rounded === 0) return '0';
    if (Math.abs(rounded) >= 1e12 || Math.abs(rounded) < 1e-6) {
      return rounded.toExponential(6).replace('e', ' × 10^');
    }
    return String(rounded);
  }

  SF.expr = { compile: compile, evaluate: evaluate, format: fmtNumber };

  /* ===================== calculator ===================== */

  let mounted = false;
  let angleDeg = true;
  const els = {};

  function renderCalcHistory() {
    const list = SF.store.calcHistory();
    if (!list.length) {
      els.calcHistory.innerHTML = '<li class="none">Nothing yet.</li>';
      return;
    }
    els.calcHistory.innerHTML = list
      .map(function (item, i) {
        return '<li data-i="' + i + '">' + ui.esc(item.expr) + ' = <strong>' + ui.esc(item.result) + '</strong></li>';
      })
      .join('');
  }

  function compute(push) {
    const raw = els.expr.value.trim();
    if (!raw) return;
    try {
      const value = SF.expr.evaluate(raw, {}, { deg: angleDeg });
      const out = SF.expr.format(value);
      els.result.textContent = out;
      els.result.style.color = '';
      if (push !== false) {
        const list = SF.store.calcHistory();
        list.unshift({ expr: raw, result: out });
        SF.store.calcHistory(list);
        renderCalcHistory();
      }
    } catch (err) {
      els.result.textContent = err.message;
      els.result.style.color = 'var(--bad)';
    }
  }

  function insertKey(text) {
    const el = els.expr;
    const start = el.selectionStart === null ? el.value.length : el.selectionStart;
    const end = el.selectionEnd === null ? el.value.length : el.selectionEnd;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    const pos = start + text.length;
    el.focus();
    try { el.setSelectionRange(pos, pos); } catch (err) { /* ignore */ }
  }

  function bindCalculator() {
    els.expr = ui.$('#calc-expr');
    els.result = ui.$('#calc-result');
    els.calcHistory = ui.$('#calc-history');

    ui.$('#calc-keys').addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const ins = btn.getAttribute('data-ins');
      if (ins !== null) { insertKey(ins); return; }
      const action = btn.getAttribute('data-action');
      if (action === 'clear') {
        els.expr.value = '';
        els.result.textContent = '—';
        els.result.style.color = '';
        els.expr.focus();
      } else if (action === 'back') {
        const el = els.expr;
        const start = el.selectionStart;
        if (start > 0 && start === el.selectionEnd) {
          el.value = el.value.slice(0, start - 1) + el.value.slice(start);
          el.setSelectionRange(start - 1, start - 1);
        } else {
          insertKey('');
        }
        el.focus();
      } else if (action === 'equals') {
        compute();
      }
    });

    els.expr.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        compute();
      }
    });
    els.expr.addEventListener('input', function () {
      els.result.textContent = '—';
      els.result.style.color = '';
    });

    els.calcHistory.addEventListener('click', function (e) {
      const li = e.target.closest('li[data-i]');
      if (!li) return;
      const item = SF.store.calcHistory()[Number(li.getAttribute('data-i'))];
      if (!item) return;
      els.expr.value = item.expr;
      els.expr.focus();
    });

    ui.$('#calc-angle').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-angle]');
      if (!btn) return;
      angleDeg = btn.getAttribute('data-angle') === 'deg';
      ui.$$('#calc-angle button').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
    });

    renderCalcHistory();
  }

  /* ===================== algebra ===================== */

  function bindAlgebra() {
    const input = ui.$('#algebra-input');
    const button = ui.$('#algebra-solve');
    const output = ui.$('#algebra-output');

    button.addEventListener('click', async function () {
      const problem = input.value.trim();
      if (!problem) {
        ui.toast('Type an equation or expression first.', 'err');
        input.focus();
        return;
      }
      if (!SF.ai.isConfigured()) {
        ui.toast('Add an AI provider key for step-by-step solutions.', 'err');
        if (SF.openSettings) SF.openSettings();
        return;
      }
      try {
        const res = await ui.streaming({ button: button, output: output }, function (signal, onDelta) {
          return SF.ai.chat({
            system:
              'You are a meticulous math tutor. Solve the problem completely. ' +
              'Number every step, show the algebra that changes between steps, and name the rule used. ' +
              'Check the answer by substitution at the end. Use Markdown with a bold final answer. ' +
              'If the problem is ambiguous, state the interpretation you chose.' +
              SF.presets.directive('math'),
            prompt: 'Solve this step by step:\n\n' + problem,
            onDelta: onDelta,
            signal: signal
          });
        });
        output.innerHTML = ui.md(res.text);
        SF.store.addHistory({
          tool: 'algebra',
          title: ui.truncate(problem, 70),
          messages: [
            { role: 'user', text: problem },
            { role: 'assistant', text: res.text }
          ]
        });
      } catch (err) {
        if (!(err && err.stopped)) ui.toast(err.message || 'Could not solve that.', 'err');
      }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        button.click();
      }
    });
  }

  /* ===================== grapher ===================== */

  const graph = {
    fns: [{ expr: 'sin(x)', color: PALETTE[0] }],
    view: { xmin: -10, xmax: 10, ymin: -10, ymax: 10 },
    drag: null
  };

  function niceStep(range, target) {
    const raw = Math.abs(range) / target || 1;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    let mult = 1;
    if (norm >= 7.5) mult = 10;
    else if (norm >= 3.5) mult = 5;
    else if (norm >= 1.5) mult = 2;
    return mag * mult;
  }

  function syncViewInputs() {
    const v = graph.view;
    ui.$('#graph-xmin').value = Number(v.xmin.toFixed(2));
    ui.$('#graph-xmax').value = Number(v.xmax.toFixed(2));
    ui.$('#graph-ymin').value = Number(v.ymin.toFixed(2));
    ui.$('#graph-ymax').value = Number(v.ymax.toFixed(2));
  }

  function readViewInputs() {
    const num = function (sel, fallback) {
      const n = parseFloat(ui.$(sel).value);
      return isFinite(n) ? n : fallback;
    };
    let xmin = num('#graph-xmin', -10);
    let xmax = num('#graph-xmax', 10);
    let ymin = num('#graph-ymin', -10);
    let ymax = num('#graph-ymax', 10);
    if (xmax <= xmin) { const t = xmin; xmin = xmax; xmax = t + 1; }
    if (ymax <= ymin) { const t = ymin; ymin = ymax; ymax = t + 1; }
    graph.view = { xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };
  }

  function drawGraph() {
    const canvas = ui.$('#graph-canvas');
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cs = getComputedStyle(document.documentElement);
    const surface = cs.getPropertyValue('--bg-soft').trim() || '#0a0e17';
    const axisColor = cs.getPropertyValue('--muted').trim() || '#98a2b6';
    const faint = cs.getPropertyValue('--faint').trim() || '#6d788c';

    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, w, h);

    const v = graph.view;
    const sx = w / (v.xmax - v.xmin);
    const sy = h / (v.ymax - v.ymin);
    const toX = function (x) { return (x - v.xmin) * sx; };
    const toY = function (y) { return h - (y - v.ymin) * sy; };

    /* grid */
    const stepX = niceStep(v.xmax - v.xmin, 8);
    const stepY = niceStep(v.ymax - v.ymin, 8);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.fillStyle = faint;
    ctx.font = '10px "JetBrains Mono", Consolas, monospace';

    for (let x = Math.ceil(v.xmin / stepX) * stepX; x <= v.xmax; x += stepX) {
      const px = toX(x);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
      if (Math.abs(x) > stepX / 2) {
        ctx.fillText(String(Number(x.toFixed(2))), px + 3, Math.min(Math.max(toY(0) + 12, 12), h - 3));
      }
    }
    for (let y = Math.ceil(v.ymin / stepY) * stepY; y <= v.ymax; y += stepY) {
      const py = toY(y);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
      if (Math.abs(y) > stepY / 2) {
        ctx.fillText(String(Number(y.toFixed(2))), Math.min(Math.max(toX(0) + 5, 4), w - 34), py - 4);
      }
    }

    /* axes */
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.4;
    if (v.ymin <= 0 && v.ymax >= 0) {
      const y0 = toY(0);
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(w, y0);
      ctx.stroke();
    }
    if (v.xmin <= 0 && v.xmax >= 0) {
      const x0 = toX(0);
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0, h);
      ctx.stroke();
    }

    /* functions */
    graph.fns.forEach(function (f) {
      if (!f.expr.trim()) return;
      let fn;
      try {
        fn = SF.expr.compile(f.expr, { deg: false });
      } catch (err) {
        return;
      }
      ctx.beginPath();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = f.color;
      ctx.lineJoin = 'round';
      let prevY = null;
      let penDown = false;
      const steps = Math.max(320, Math.min(1600, Math.round(w * 2)));
      for (let i = 0; i <= steps; i++) {
        const x = v.xmin + (i / steps) * (v.xmax - v.xmin);
        let y;
        try {
          y = fn({ x: x });
        } catch (err) {
          y = NaN;
        }
        if (typeof y !== 'number' || !isFinite(y)) {
          penDown = false;
          prevY = null;
          continue;
        }
        const py = toY(y);
        if (!penDown || (prevY !== null && Math.abs(py - prevY) > h * 1.6)) {
          ctx.moveTo((i / steps) * w, py);
          penDown = true;
        } else {
          ctx.lineTo((i / steps) * w, py);
        }
        prevY = py;
      }
      ctx.stroke();
    });
  }

  let drawTimer = null;
  function queueDraw() {
    window.clearTimeout(drawTimer);
    drawTimer = window.setTimeout(drawGraph, 120);
  }

  function renderFnRows() {
    const host = ui.$('#graph-fns');
    host.innerHTML = '';
    graph.fns.forEach(function (f, index) {
      const row = document.createElement('div');
      row.className = 'graph-fn';

      const dot = document.createElement('span');
      dot.className = 'fn-dot';
      dot.style.background = f.color;

      const input = document.createElement('input');
      input.value = f.expr;
      input.spellcheck = false;
      input.placeholder = 'f(x) = …';
      input.setAttribute('aria-label', 'Function ' + (index + 1));
      input.addEventListener('input', function () {
        f.expr = input.value;
        queueDraw();
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.title = 'Remove function';
      remove.innerHTML = ui.icon('x');
      remove.addEventListener('click', function () {
        graph.fns.splice(index, 1);
        if (!graph.fns.length) {
          graph.fns.push({ expr: '', color: PALETTE[0] });
        }
        renderFnRows();
        drawGraph();
      });

      row.appendChild(dot);
      row.appendChild(input);
      row.appendChild(remove);
      host.appendChild(row);
    });
  }

  function bindGrapher() {
    renderFnRows();
    syncViewInputs();
    bindCanvasEvents();

    ui.$('#graph-add').addEventListener('click', function () {
      if (graph.fns.length >= 5) {
        ui.toast('Five functions is plenty at once.', 'err');
        return;
      }
      graph.fns.push({ expr: '', color: PALETTE[graph.fns.length % PALETTE.length] });
      renderFnRows();
      const inputs = ui.$$('#graph-fns input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    ui.$('#graph-apply').addEventListener('click', function () {
      readViewInputs();
      drawGraph();
    });

    ui.$('#graph-reset').addEventListener('click', function () {
      graph.view = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
      syncViewInputs();
      drawGraph();
    });

    ['#graph-xmin', '#graph-xmax', '#graph-ymin', '#graph-ymax'].forEach(function (sel) {
      ui.$(sel).addEventListener('change', function () {
        readViewInputs();
        syncViewInputs();
        drawGraph();
      });
    });
  }

  function bindCanvasEvents() {
    const canvas = ui.$('#graph-canvas');

    canvas.addEventListener('pointerdown', function (e) {
      graph.drag = { x: e.clientX, y: e.clientY, view: Object.assign({}, graph.view) };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!graph.drag) return;
      const rect = canvas.getBoundingClientRect();
      const dx = e.clientX - graph.drag.x;
      const dy = e.clientY - graph.drag.y;
      const v = graph.drag.view;
      const shiftX = dx * ((v.xmax - v.xmin) / rect.width);
      const shiftY = dy * ((v.ymax - v.ymin) / rect.height);
      graph.view = {
        xmin: v.xmin - shiftX,
        xmax: v.xmax - shiftX,
        ymin: v.ymin + shiftY,
        ymax: v.ymax + shiftY
      };
      syncViewInputs();
      drawGraph();
    });

    canvas.addEventListener('pointerup', function () { graph.drag = null; });
    canvas.addEventListener('pointercancel', function () { graph.drag = null; });

    canvas.addEventListener(
      'wheel',
      function (e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const factor = e.deltaY > 0 ? 1.16 : 1 / 1.16;
        const v = graph.view;
        const mx = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        const my = Math.min(Math.max(1 - (e.clientY - rect.top) / rect.height, 0), 1);
        const cx = v.xmin + mx * (v.xmax - v.xmin);
        const cy = v.ymin + my * (v.ymax - v.ymin);
        graph.view = {
          xmin: cx + (v.xmin - cx) * factor,
          xmax: cx + (v.xmax - cx) * factor,
          ymin: cy + (v.ymin - cy) * factor,
          ymax: cy + (v.ymax - cy) * factor
        };
        syncViewInputs();
        drawGraph();
      },
      { passive: false }
    );

    window.addEventListener('resize', function () {
      if (!document.getElementById('view-math').hidden) drawGraph();
    });
  }

  /* ===================== page ===================== */

  SF.pages.math = {
    init: function () {
      if (mounted) return;
      mounted = true;
      bindCalculator();
      bindAlgebra();
      bindGrapher();
    },
    onShow: function () {
      drawGraph();
    }
  };
})();
