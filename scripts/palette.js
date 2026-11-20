/* ==========================================================================
   StudyForge — command palette (Ctrl/Cmd + K)
   Jump to any tool or run a shell action without leaving the keyboard.
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;

  const PAGES = [
    ['home', 'Home', 'Dashboard and tool picker', 'dashboard start'],
    ['solver', 'AI Homework Omni-Solver', 'Text, photo and homework questions', 'solve question homework photo'],
    ['essay', 'Essay & Paper Writer', 'Outline, draft, polish', 'write essay paper draft'],
    ['math', 'Math & Graphing Suite', 'Calculator, algebra, grapher', 'calculator graph algebra'],
    ['summarize', 'Smart Summarizer', 'Notes into study guides', 'summary notes condense'],
    ['flashcards', 'Flashcards & Practice Quiz', 'Generate a deck and quiz', 'deck quiz recall'],
    ['code', 'Code Debugger', 'Fix and explain code', 'debug bug code'],
    ['translate', 'Translate & Grammar', 'Translation and corrections', 'translate grammar language'],
    ['citations', 'Citation Generator', 'APA, MLA, Chicago', 'apa mla chicago bibliography'],
    ['planner', 'Study Planner', 'Deadlines and Pomodoro', 'deadline pomodoro planner'],
    ['cheatsheet', 'Cheat Sheet Hub', 'Formulas, elements, timelines', 'formulas periodic table reference'],
    ['history', 'History', 'Saved sessions', 'saved sessions history']
  ];

  let built = false;
  let modal = null;
  let input = null;
  let list = null;
  let rows = [];
  let cursor = 0;

  function click(selector) {
    const el = document.querySelector(selector);
    if (el) el.click();
  }

  function commands() {
    const out = PAGES.map(function (page) {
      return {
        group: 'Go to',
        label: page[1],
        hint: page[2],
        keys: page[3],
        run: function () {
          if (SF.go) SF.go(page[0]);
          else location.hash = '#/' + page[0];
        }
      };
    });

    out.push({
      group: 'Actions',
      label: 'Ask a new question',
      hint: 'Open the Omni-Solver',
      keys: 'new question solve ask homework',
      run: function () {
        if (SF.go) SF.go('solver');
        window.setTimeout(function () {
          const box = document.querySelector('#solver-input');
          if (box) box.focus();
        }, 80);
      }
    });
    out.push({
      group: 'Actions',
      label: 'Open AI settings',
      hint: 'Keys, models, Ollama endpoint',
      keys: 'settings keys provider model ollama api',
      run: function () { click('#settings-btn'); }
    });
    out.push({
      group: 'Actions',
      label: 'Toggle light / dark theme',
      hint: 'Appearance',
      keys: 'theme dark light appearance',
      run: function () { click('#theme-btn'); }
    });
    out.push({
      group: 'Actions',
      label: 'Open the scratchpad',
      hint: 'Rough work, saved locally',
      keys: 'scratchpad notes rough work pad',
      run: function () { click('#scratch-btn'); }
    });

    if (!SF.isElectron) {
      out.push({
        group: 'Actions',
        label: 'Download the Windows app',
        hint: '.exe from GitHub Releases',
        keys: 'download desktop exe windows install',
        run: function () { window.open(SF.config.downloadUrl, '_blank', 'noopener'); }
      });
    }

    return out;
  }

  function matches(cmd, query) {
    if (!query) return true;
    const needle = query.toLowerCase();
    return (cmd.label + ' ' + cmd.hint + ' ' + cmd.keys).toLowerCase().indexOf(needle) !== -1;
  }

  function render() {
    const query = input.value.trim();
    const source = commands().filter(function (cmd) { return matches(cmd, query); });

    rows = [];
    let html = '';
    let group = '';

    source.forEach(function (cmd) {
      if (cmd.group !== group) {
        group = cmd.group;
        html += '<p class="palette-group">' + ui.esc(group) + '</p>';
      }
      const index = rows.length;
      rows.push(cmd);
      html +=
        '<button type="button" class="palette-item" data-index="' + index + '" role="option">' +
          '<span class="palette-item-label">' + ui.esc(cmd.label) + '</span>' +
          '<span class="palette-item-hint">' + ui.esc(cmd.hint) + '</span>' +
        '</button>';
    });

    if (!rows.length) {
      html = '<p class="palette-empty">Nothing matches “' + ui.esc(query) + '”.</p>';
    }

    list.innerHTML = html;
    cursor = 0;
    highlight();
  }

  function highlight() {
    ui.$$('.palette-item', list).forEach(function (el, i) {
      el.classList.toggle('active', i === cursor);
    });
    const active = list.querySelector('.palette-item.active');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }

  function run(index) {
    const cmd = rows[index];
    if (!cmd) return;
    close();
    cmd.run();
  }

  function ensure() {
    if (built) return;
    built = true;

    modal = document.createElement('div');
    modal.className = 'modal palette-modal';
    modal.id = 'palette-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="palette-card" role="dialog" aria-modal="true" aria-label="Command palette">' +
        '<div class="palette-search">' +
          ui.icon('search') +
          '<input id="palette-input" type="text" autocomplete="off" spellcheck="false" ' +
            'placeholder="Jump to a tool, open settings, toggle theme…" aria-label="Search commands">' +
          '<kbd>esc</kbd>' +
        '</div>' +
        '<div class="palette-list" id="palette-list" role="listbox"></div>' +
        '<div class="palette-foot"><span>↑ ↓ to move</span><span>↵ to run</span><span>esc to close</span></div>' +
      '</div>';

    document.body.appendChild(modal);
    input = modal.querySelector('#palette-input');
    list = modal.querySelector('#palette-list');

    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });
    list.addEventListener('click', function (e) {
      const item = e.target.closest('[data-index]');
      if (item) run(Number(item.getAttribute('data-index')));
    });
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        if (!rows.length) return;
        cursor = (cursor + 1) % rows.length;
        highlight();
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        if (!rows.length) return;
        cursor = (cursor - 1 + rows.length) % rows.length;
        highlight();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        run(cursor);
      }
    });
  }

  function open() {
    ensure();
    modal.hidden = false;
    input.value = '';
    render();
    input.focus();
  }

  function close() {
    if (modal) modal.hidden = true;
  }

  function toggle() {
    if (modal && !modal.hidden) close();
    else open();
  }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggle();
      return;
    }
    if (modal && !modal.hidden && e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  SF.palette = { open: open, close: close, toggle: toggle };
})();
