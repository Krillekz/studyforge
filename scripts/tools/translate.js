/* ==========================================================================
   StudyForge — (7) Language Translator & Grammar Checker
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;
  SF.pages = SF.pages || {};

  let mounted = false;
  let mode = 'translate';
  let lastOutput = '';
  const els = {};

  function buildPrompt(text) {
    if (mode === 'grammar') {
      return (
        'Check and correct this text. Return **Corrected version** (full corrected text in a quote block), ' +
        'then **What changed** as a bullet list of specific fixes with the rule named, then ' +
        '**Vocabulary upgrades** with 2-4 better word choices if any apply.\n\nText:\n"""\n' + text + '\n"""'
      );
    }
    if (mode === 'both') {
      return (
        'Translate from ' + els.from.value + ' to ' + els.to.value + ', then check the grammar of the ' +
        'translation. Return **Translation**, **Grammar notes** (bullet list of corrections, or "none needed"), ' +
        'and **Vocabulary** (3 useful words or phrases with meanings).\n\nText:\n"""\n' + text + '\n"""'
      );
    }
    return (
      'Translate from ' + els.from.value + ' to ' + els.to.value + '. Return the translation only, ' +
      'preserving meaning and register. After the translation add one line starting with "Note:" only ' +
      'if a phrase has no direct equivalent.\n\nText:\n"""\n' + text + '\n"""'
    );
  }

  async function run() {
    const text = els.input.value.trim();
    if (!text) {
      ui.toast('Paste some text first.', 'err');
      els.input.focus();
      return;
    }
    if (!SF.ai.isConfigured()) {
      ui.toast('Add an AI provider key first.', 'err');
      if (SF.openSettings) SF.openSettings();
      return;
    }

    const system =
      'You are a professional translator and copy editor. Be faithful to the source, keep formatting, ' +
      'and never add content that is not there. Use Markdown.' +
      SF.presets.directive('translate');
    try {
      const res = await ui.streaming({ button: els.runBtn, output: els.output }, function (signal, onDelta) {
        return SF.ai.chat({ system: system, prompt: buildPrompt(text), onDelta: onDelta, signal: signal });
      });
      lastOutput = res.text;
      els.output.innerHTML = ui.md(lastOutput);
      SF.store.addHistory({
        tool: 'translate',
        title: (mode === 'grammar' ? 'Grammar check · ' : 'Translate · ') + ui.truncate(text, 50),
        messages: [
          { role: 'user', text: buildPrompt(text) },
          { role: 'assistant', text: lastOutput }
        ]
      });
    } catch (err) {
      if (!(err && err.stopped)) ui.toast(err.message || 'Could not run that.', 'err');
    }
  }

  SF.pages.translate = {
    init: function () {
      if (mounted) return;
      mounted = true;
      els.input = ui.$('#tr-input');
      els.from = ui.$('#tr-from');
      els.to = ui.$('#tr-to');
      els.output = ui.$('#tr-output');
      els.runBtn = ui.$('#tr-run');

      ui.$('#tr-mode').addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-mode]');
        if (!btn) return;
        mode = btn.getAttribute('data-mode');
        ui.$$('#tr-mode button').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        els.to.disabled = mode === 'grammar';
      });

      els.runBtn.addEventListener('click', run);
      els.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          run();
        }
      });
    }
  };
})();
