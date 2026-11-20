/* ==========================================================================
   StudyForge — application shell
   Routing, theme, settings modal, scratchpad, history and global paste.
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;

  const ROUTES = {
    home: 'view-home',
    solver: 'view-solver',
    essay: 'view-essay',
    math: 'view-math',
    summarize: 'view-summarize',
    flashcards: 'view-flashcards',
    code: 'view-code',
    translate: 'view-translate',
    citations: 'view-citations',
    planner: 'view-planner',
    cheatsheet: 'view-cheatsheet',
    history: 'view-history'
  };

  const TITLES = {
    home: 'Home',
    solver: 'AI Homework Omni-Solver',
    essay: 'Essay & Paper Writer',
    math: 'Math & Graphing Suite',
    summarize: 'Smart Summarizer',
    flashcards: 'Flashcards & Practice Quiz',
    code: 'Code Debugger & Explainer',
    translate: 'Translate & Grammar Check',
    citations: 'Citation Generator',
    planner: 'Assignment & Study Planner',
    cheatsheet: 'Cheat Sheet Hub',
    history: 'History'
  };

  const PROVIDERS = ['openai', 'gemini', 'anthropic', 'openrouter', 'ollama'];
  const inited = {};
  const els = {};
  let settings = null;
  let activeTab = 'openai';
  let detailEntry = null;
  let scratchTimer = null;

  function $(sel) { return document.querySelector(sel); }

  /* ---------------- theme ---------------- */

  function applyTheme(theme) {
    const value = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', value);
    const btn = $('#theme-btn');
    if (btn) {
      btn.innerHTML = ui.icon(value === 'light' ? 'sun' : 'moon');
      btn.title = value === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', value === 'light' ? '#f5f6fb' : '#0b0d13');
  }

  /* ---------------- routing ---------------- */

  function route() {
    const raw = String(location.hash || '').replace(/^#\/?/, '').split('?')[0];
    const id = ROUTES[raw] ? raw : 'home';

    ui.$$('.view').forEach(function (view) { view.hidden = true; });
    const section = document.getElementById(ROUTES[id]);
    if (section) section.hidden = false;

    ui.$$('.nav-item').forEach(function (item) {
      item.classList.toggle('active', item.getAttribute('data-page') === id);
    });

    const label = $('#topbar-label');
    if (label) label.textContent = TITLES[id];
    document.title = id === 'home'
      ? 'StudyForge — Every subject. Every question. Solved.'
      : TITLES[id] + ' · StudyForge';

    const app = document.querySelector('.app');
    if (app) app.classList.remove('nav-open');

    if (id === 'history') renderHistoryPage();

    if (SF.pages[id] && !inited[id]) {
      SF.pages[id].init();
      inited[id] = true;
    }
    if (SF.pages[id] && SF.pages[id].onShow) SF.pages[id].onShow();

    window.scrollTo(0, 0);
  }

  function goNow(id) {
    if (location.hash !== '#/' + id) location.hash = '#/' + id;
    route();
  }

  /* ---------------- chrome ---------------- */

  function setupChrome() {
    ui.$$('.download-link').forEach(function (link) {
      link.href = SF.config.downloadUrl;
      link.title = 'Download the Windows desktop app from GitHub Releases';
    });

    if (SF.isElectron) {
      ui.$$('.download-link').forEach(function (link) { link.hidden = true; });
      ui.$$('.home-strip').forEach(function (strip) { strip.hidden = true; });
    }

    const badge = $('#mode-badge');
    if (badge) badge.textContent = SF.mode === 'private' ? 'Private · Ollama' : 'Public · BYOK';

    const foot = $('#foot-mode');
    if (foot) {
      foot.textContent = SF.mode === 'private'
        ? 'Private build · local Ollama default'
        : 'Public build · bring your own key';
    }

    const version = document.querySelector('.version');
    if (version) version.textContent = 'v' + SF.config.version;

    applyTheme(settings.theme);
  }

  /* ---------------- settings modal ---------------- */

  function selectProvTab(id) {
    activeTab = id;
    ui.$$('#prov-tabs button').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-prov') === id);
    });
    ui.$$('.prov-panel').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-panel') !== id;
    });
  }

  function fillSettingsForm() {
    settings = SF.store.settings();
    const select = $('#set-provider');
    if (select) select.value = settings.provider;

    PROVIDERS.forEach(function (id) {
      const key = document.querySelector('[data-key="' + id + '"]');
      const model = document.querySelector('[data-model="' + id + '"]');
      const vision = document.querySelector('[data-vision="' + id + '"]');
      const p = settings.providers[id] || {};
      if (key) key.value = p.key || '';
      if (model) model.value = p.model || '';
      if (vision) vision.value = p.visionModel || '';
    });

    const base = $('#ollama-base');
    if (base) base.value = (settings.providers.ollama && settings.providers.ollama.baseUrl) || '';

    if (els.testResult) {
      els.testResult.textContent = '';
      els.testResult.style.color = '';
    }
    selectProvTab(settings.provider);
  }

  function collectSettings() {
    const providers = {};
    PROVIDERS.forEach(function (id) {
      const key = document.querySelector('[data-key="' + id + '"]');
      const model = document.querySelector('[data-model="' + id + '"]');
      const vision = document.querySelector('[data-vision="' + id + '"]');
      providers[id] = {
        key: key ? key.value.trim() : '',
        model: model ? model.value.trim() : '',
        visionModel: vision ? vision.value.trim() : '',
        baseUrl: id === 'ollama' && $('#ollama-base') ? $('#ollama-base').value.trim() : ''
      };
    });
    return { provider: $('#set-provider').value, providers: providers };
  }

  function openSettings() {
    fillSettingsForm();
    els.settingsModal.hidden = false;
  }

  function closeSettings() {
    els.settingsModal.hidden = true;
  }

  function bindSettings() {
    els.settingsModal = $('#settings-modal');
    els.testResult = $('#set-test-result');

    ui.$$('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-close');
        const target = document.getElementById(id);
        if (target) target.hidden = true;
      });
    });

    els.settingsModal.addEventListener('click', function (e) {
      if (e.target === els.settingsModal) closeSettings();
    });

    ui.$$('#prov-tabs button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectProvTab(btn.getAttribute('data-prov'));
        if (els.testResult) {
          els.testResult.textContent = '';
          els.testResult.style.color = '';
        }
      });
    });

    $('#set-save').addEventListener('click', function () {
      const draft = collectSettings();
      settings = SF.store.saveSettings(draft);
      applyTheme(settings.theme);
      closeSettings();
      ui.toast('Settings saved. Using ' + SF.ai.describe().label + '.', 'ok');
      if (SF.pages.solver && SF.pages.solver.refresh) SF.pages.solver.refresh();
    });

    $('#set-test').addEventListener('click', async function () {
      const draft = collectSettings();
      const id = activeTab;
      const label = SF.config.providers[id].label;
      els.testResult.style.color = '';
      els.testResult.textContent = 'Testing ' + label + '…';
      try {
        const res = await ui.busy($('#set-test'), function () {
          return SF.ai.test(id, { provider: id, providers: draft.providers });
        });
        els.testResult.style.color = 'var(--ok)';
        els.testResult.textContent = label + ' responded: ' + ui.truncate(res.text, 48);
      } catch (err) {
        els.testResult.style.color = 'var(--bad)';
        els.testResult.textContent = err.message;
      }
    });

    $('#set-provider').addEventListener('change', function (e) {
      selectProvTab(e.target.value);
    });
  }

  /* ---------------- scratchpad ---------------- */

  function openScratch() {
    els.drawer.hidden = false;
    els.scrim.hidden = false;
    els.scratch.value = SF.store.scratch() || '';
    els.scratch.focus();
  }

  function closeScratch() {
    els.drawer.hidden = true;
    els.scrim.hidden = true;
  }

  function bindScratch() {
    els.drawer = $('#scratch-drawer');
    els.scrim = $('#scrim');
    els.scratch = $('#scratch-text');

    ['#scratch-btn', '#scratch-btn-2'].forEach(function (sel) {
      const btn = $(sel);
      if (btn) btn.addEventListener('click', openScratch);
    });
    $('#scratch-close').addEventListener('click', closeScratch);
    els.scrim.addEventListener('click', closeScratch);

    els.scratch.addEventListener('input', function () {
      window.clearTimeout(scratchTimer);
      scratchTimer = window.setTimeout(function () {
        SF.store.scratch(els.scratch.value);
      }, 300);
    });

    $('#scratch-clear').addEventListener('click', function () {
      if (!els.scratch.value || !window.confirm('Clear the scratchpad?')) return;
      els.scratch.value = '';
      SF.store.scratch('');
    });
  }

  /* ---------------- history page ---------------- */

  function renderHistoryPage() {
    if (!els.histList) return;
    detailEntry = null;
    els.histDetail.hidden = true;
    els.histList.hidden = false;

    const list = SF.store.history();
    if (!list.length) {
      els.histList.innerHTML =
        '<div class="card"><p class="placeholder">No sessions yet. Solve something and it will appear here.</p></div>';
      return;
    }

    els.histList.innerHTML = list.map(function (entry) {
      const last = entry.messages && entry.messages.length
        ? entry.messages[entry.messages.length - 1].text
        : '';
      const count = entry.messages ? entry.messages.length : 0;
      return (
        '<article class="hist-item" data-id="' + entry.id + '">' +
          '<div class="hist-main" role="button" tabindex="0">' +
            '<h3>' + ui.esc(entry.title || 'Untitled session') + '</h3>' +
            '<p>' + ui.esc(ui.truncate(last, 150)) + '</p>' +
            '<div class="hist-meta">' +
              '<span class="tag">' + ui.esc(SF.config.toolLabels[entry.tool] || entry.tool || 'Session') + '</span>' +
              '<span>' + ui.esc(ui.fmtDateTime(entry.date)) + '</span>' +
              '<span>' + count + ' messages</span>' +
            '</div>' +
          '</div>' +
          '<div class="hist-actions">' +
            '<button type="button" data-del="' + entry.id + '" title="Delete session">' + ui.icon('trash') + '</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function openHistory(entry) {
    detailEntry = entry;
    els.histList.hidden = true;
    els.histDetail.hidden = false;

    const body = (entry.messages || []).map(function (m) {
      const isUser = m.role === 'user';
      return (
        '<div class="msg ' + (isUser ? 'msg-user' : 'msg-assistant') + '">' +
          '<div class="msg-avatar">' + (isUser ? 'Y' : ui.icon('bolt')) + '</div>' +
          '<div class="msg-body">' +
            '<div class="msg-meta"><strong>' + (isUser ? 'You' : 'StudyForge') + '</strong>' +
              (m.imageCount ? '<span>' + m.imageCount + ' image(s) attached</span>' : '') +
            '</div>' +
            '<div class="msg-bubble">' +
              (isUser
                ? '<div style="white-space:pre-wrap">' + ui.esc(m.text || '') + '</div>'
                : '<div class="markdown">' + ui.md(m.text || '') + '</div>') +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    els.histDetail.innerHTML =
      '<div class="hist-detail-head">' +
        '<div><h2>' + ui.esc(entry.title || 'Untitled session') + '</h2>' +
          '<p class="hint">' + ui.esc(SF.config.toolLabels[entry.tool] || entry.tool || 'Session') +
          ' · ' + ui.esc(ui.fmtDateTime(entry.date)) + '</p></div>' +
        '<div class="btn-row">' +
          '<button class="btn ghost sm" type="button" data-act="back">Back</button>' +
          '<button class="btn ghost sm" type="button" data-act="txt">.txt</button>' +
          '<button class="btn ghost sm" type="button" data-act="md">.md</button>' +
          '<button class="btn ghost sm" type="button" data-act="pdf">.pdf</button>' +
        '</div>' +
      '</div>' +
      '<div class="stack hist-detail">' + body + '</div>';

    els.histDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bindHistory() {
    els.histList = $('#hist-list');
    els.histDetail = $('#hist-detail');

    function activate(target) {
      const item = target.closest('.hist-item');
      if (!item) return;
      const entry = SF.store.history().find(function (e) { return e.id === item.getAttribute('data-id'); });
      if (entry) openHistory(entry);
    }

    els.histList.addEventListener('click', function (e) {
      const del = e.target.closest('[data-del]');
      if (del) {
        const id = del.getAttribute('data-del');
        if (!window.confirm('Delete this session permanently?')) return;
        SF.store.deleteHistory(id);
        renderHistoryPage();
        ui.toast('Session deleted.', 'ok');
        return;
      }
      activate(e.target);
    });

    els.histList.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.closest('.hist-main')) {
          e.preventDefault();
          activate(e.target);
        }
      }
    });

    els.histDetail.addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      if (act === 'back') {
        renderHistoryPage();
        return;
      }
      if (!detailEntry) return;
      if (act === 'txt') SF.export.sessionText(detailEntry);
      if (act === 'md') SF.export.sessionMarkdown(detailEntry);
      if (act === 'pdf') SF.export.sessionPdf(detailEntry);
    });

    $('#hist-clear').addEventListener('click', function () {
      if (!SF.store.history().length) {
        ui.toast('History is already empty.', 'err');
        return;
      }
      if (!window.confirm('Delete every saved session? This cannot be undone.')) return;
      SF.store.clearHistory();
      renderHistoryPage();
      ui.toast('History cleared.', 'ok');
    });
  }

  /* ---------------- global interactions ---------------- */

  function bindChrome() {
    $('#theme-btn').addEventListener('click', function () {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      settings = SF.store.saveSettings({ theme: next });
      applyTheme(next);
    });

    $('#menu-btn').addEventListener('click', function () {
      document.querySelector('.app').classList.toggle('nav-open');
    });

    $('#settings-btn').addEventListener('click', openSettings);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeSettings();
        closeScratch();
        document.querySelector('.app').classList.remove('nav-open');
      }
    });

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-copy-target]');
      if (!btn) return;
      const target = document.getElementById(btn.getAttribute('data-copy-target'));
      if (!target) return;
      ui.copy(target.innerText.trim());
    });

    document.addEventListener('paste', function (e) {
      const data = e.clipboardData;
      if (!data) return;
      const files = [];
      if (data.items) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          if (item.kind === 'file' && /^image\//.test(item.type)) {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
      }
      if (!files.length) return;
      e.preventDefault();
      goNow('solver');
      if (SF.pages.solver && SF.pages.solver.addImages) {
        SF.pages.solver.addImages(files).then(function () {
          ui.toast('Screenshot attached to the Omni-Solver.', 'ok');
        });
      }
    });
  }

  /* ---------------- boot ---------------- */

  function init() {
    settings = SF.store.settings();
    setupChrome();
    bindChrome();
    bindSettings();
    bindScratch();
    bindHistory();
    route();
    window.addEventListener('hashchange', route);

    SF.openSettings = openSettings;
    SF.go = goNow;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
