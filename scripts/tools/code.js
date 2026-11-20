/* ==========================================================================
   StudyForge — (6) Code Debugger & Explainer
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;
  SF.pages = SF.pages || {};

  let mounted = false;
  let lastOutput = '';
  const els = {};

  function systemFor(mode) {
    const base =
      'You are a senior software engineer tutoring a student. Be precise and concrete. ' +
      'Use fenced code blocks with language tags. Never invent APIs; if you are unsure, say so. ';
    if (mode.indexOf('Explain') === 0) {
      return base + 'Walk through the code top to bottom, explaining what each block does and why.';
    }
    if (mode === 'Optimize') {
      return base + 'Identify performance and clarity problems, then show the improved version. Keep behaviour identical.';
    }
    if (mode === 'Add comments') {
      return base + 'Return the same code with helpful comments and docstrings added. Change no logic.';
    }
    if (mode === 'Write tests') {
      return base + 'Write a focused test suite for the code, including edge cases. Use the standard test framework for the language.';
    }
    return base + 'Find the bug, explain the root cause, then give the corrected code. Mention how to verify the fix.';
  }

  async function run() {
    const code = els.input.value.trim();
    if (!code) {
      ui.toast('Paste some code first.', 'err');
      els.input.focus();
      return;
    }
    if (!SF.ai.isConfigured()) {
      ui.toast('Add an AI provider key first.', 'err');
      if (SF.openSettings) SF.openSettings();
      return;
    }

    const prompt =
      'Language: ' + els.lang.value +
      '\nTask: ' + els.mode.value +
      (els.error.value.trim() ? '\nReported error / symptom: ' + els.error.value.trim() : '') +
      '\n\nCode:\n```\n' + code.slice(0, 12000) + '\n```\n\n' +
      'Use these sections: **What is going on**, **The fix** (full corrected code), **Why it works**, ' +
      'and **Check it yourself**. If there is no bug, say so plainly.';

    try {
      const res = await ui.streaming({ button: els.runBtn, output: els.output }, function (signal, onDelta) {
        return SF.ai.chat({
          system: systemFor(els.mode.value) + SF.presets.directive('code'),
          prompt: prompt,
          onDelta: onDelta,
          signal: signal
        });
      });
      lastOutput = res.text;
      els.output.innerHTML = ui.md(lastOutput);
      SF.store.addHistory({
        tool: 'code',
        title: els.mode.value + ' · ' + els.lang.value,
        messages: [
          { role: 'user', text: els.mode.value + ' (' + els.lang.value + ')\n\n```\n' + ui.truncate(code, 600) + '\n```' },
          { role: 'assistant', text: lastOutput }
        ]
      });
      ui.toast('Saved to History.', 'ok');
    } catch (err) {
      if (!(err && err.stopped)) ui.toast(err.message || 'Could not analyse that code.', 'err');
    }
  }

  SF.pages.code = {
    init: function () {
      if (mounted) return;
      mounted = true;
      els.lang = ui.$('#code-lang');
      els.mode = ui.$('#code-mode');
      els.input = ui.$('#code-input');
      els.error = ui.$('#code-error');
      els.output = ui.$('#code-output');
      els.runBtn = ui.$('#code-run');

      els.runBtn.addEventListener('click', run);

      els.input.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          const el = els.input;
          const start = el.selectionStart;
          el.value = el.value.slice(0, start) + '  ' + el.value.slice(el.selectionEnd);
          el.setSelectionRange(start + 2, start + 2);
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          run();
        }
      });

      ui.$('#code-export').addEventListener('click', function () {
        if (!lastOutput) {
          ui.toast('Nothing to export yet.', 'err');
          return;
        }
        SF.export.output('Code review', lastOutput, 'md');
      });
    }
  };
})();
