/* ==========================================================================
   StudyForge — per-tool answer presets
   One saved preset per tool, stored locally and appended to the system prompt.
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;
  const KEY = 'presets';

  const SETS = {
    solver: {
      label: 'Answer preset',
      options: [
        { id: 'steps', label: 'Every step', text: 'Show every algebraic or logical step, numbered, before you state the final answer.' },
        { id: 'eli12', label: 'Explain simply', text: 'Explain as if to a motivated 12-year-old: plain words, short sentences, one concrete analogy.' },
        { id: 'exam', label: 'Exam style', text: 'Answer the way a top-scoring exam response would: concise, structured, no filler, mark-scheme wording.' },
        { id: 'bare', label: 'No fluff', text: 'Skip the pleasantries and the closing summary. Give only the solution and the reasoning.' }
      ]
    },
    essay: {
      label: 'Writing preset',
      options: [
        { id: 'cliches', label: 'No AI clichés', text: 'Avoid stock AI phrasing such as "in today\'s world", "delve", "tapestry", "it is important to note" and "in conclusion" as a paragraph opener.' },
        { id: 'active', label: 'Active voice', text: 'Prefer active voice and concrete verbs. Cut nominalisations and unnecessary hedging.' },
        { id: 'plain', label: 'Plain words', text: 'Use plain vocabulary at roughly a tenth-grade reading level without losing precision.' },
        { id: 'rubric', label: 'Rubric-ready', text: 'Give every body paragraph a clear claim, evidence, and analysis, in that order.' }
      ]
    },
    summarize: {
      label: 'Summary preset',
      options: [
        { id: 'exam', label: 'Exam focus', text: 'Prioritise the facts most likely to be tested and mark each one in bold.' },
        { id: 'terms', label: 'Bold key terms', text: 'Bold every key term the first time it appears, and define it in six words or fewer.' },
        { id: 'plain', label: 'No jargon', text: 'Replace technical jargon with plain language, keeping the technical term in brackets.' }
      ]
    },
    code: {
      label: 'Explanation preset',
      options: [
        { id: 'beginner', label: 'Beginner-friendly', text: 'Explain as if the reader is new to this language; define each term the first time you use it.' },
        { id: 'perf', label: 'Performance', text: 'Call out time and space complexity, and flag performance traps even when the code works.' },
        { id: 'tests', label: 'Tests included', text: 'Always finish with a runnable test or a short manual check that proves the fix.' }
      ]
    },
    translate: {
      label: 'Translation preset',
      options: [
        { id: 'formal', label: 'Formal register', text: 'Use formal register suitable for academic writing unless the source is clearly informal.' },
        { id: 'format', label: 'Keep formatting', text: 'Preserve line breaks, lists and punctuation exactly as they appear in the source.' },
        { id: 'pronounce', label: 'Add pronunciation', text: 'After each key phrase, add a simple pronunciation guide in brackets.' }
      ]
    },
    math: {
      label: 'Solution preset',
      options: [
        { id: 'steps', label: 'Name each step', text: 'Name the operation or rule applied at every step.' },
        { id: 'plain', label: 'Plain-text math', text: 'Write all mathematics in plain text, never LaTeX, so it reads correctly in a chat window.' },
        { id: 'verify', label: 'Verify the answer', text: 'Finish by substituting the answer back into the original problem to verify it.' }
      ]
    }
  };

  function saved() {
    const map = SF.store.read(KEY, {});
    return map && typeof map === 'object' ? map : {};
  }

  function save(map) {
    SF.store.write(KEY, map);
  }

  function directive(tool) {
    const set = SETS[tool];
    if (!set) return '';
    const id = saved()[tool];
    if (!id) return '';
    const item = set.options.find(function (o) { return o.id === id; });
    return item ? '\n\nStudy preset — ' + item.text : '';
  }

  function mount(tool) {
    const host = document.querySelector('[data-presets="' + tool + '"]');
    const set = SETS[tool];
    if (!host || !set) return;

    function render() {
      const active = saved()[tool] || '';
      host.innerHTML =
        '<span class="preset-label">' + ui.esc(set.label) + '</span>' +
        set.options.map(function (o) {
          return '<button type="button" class="preset-chip' + (active === o.id ? ' active' : '') + '"' +
            ' data-preset="' + o.id + '" aria-pressed="' + (active === o.id) + '">' +
            ui.esc(o.label) + '</button>';
        }).join('');
    }

    host.addEventListener('click', function (e) {
      const chip = e.target.closest('[data-preset]');
      if (!chip) return;
      const id = chip.getAttribute('data-preset');
      const map = saved();
      map[tool] = map[tool] === id ? '' : id;
      save(map);
      render();
    });

    render();
  }

  function mountAll() {
    Object.keys(SETS).forEach(mount);
  }

  SF.presets = { directive: directive, mountAll: mountAll, sets: SETS };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }
})();
