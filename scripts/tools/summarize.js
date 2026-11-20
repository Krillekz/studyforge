/* ==========================================================================
   StudyForge — (4) Smart Summarizer & Note Condenser
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;
  SF.pages = SF.pages || {};

  let mounted = false;
  let lastSummary = '';
  const els = {};

  async function run() {
    const text = els.input.value.trim();
    if (text.length < 40) {
      ui.toast('Paste a bit more text — at least a paragraph.', 'err');
      els.input.focus();
      return;
    }
    if (!SF.ai.isConfigured()) {
      ui.toast('Add an AI provider key first.', 'err');
      if (SF.openSettings) SF.openSettings();
      return;
    }

    const system =
      'You are a study-skills coach who condenses dense reading into material a student can ' +
      'actually revise from. Keep the source’s facts and numbers exact. Use Markdown: short ' +
      'headings, tight bullets, bold key terms. Never add facts that are not in the source.' +
      SF.presets.directive('summarize');
    const prompt =
      'Format: ' + els.format.value + '\nLength: ' + els.length.value +
      '\n\nSource text:\n"""\n' + text.slice(0, 24000) + '\n"""' +
      '\n\nProduce the condensed version now. If the format is "Key terms & definitions", use a ' +
      'term — definition list. If it is "Likely exam questions", write questions followed by ' +
      'brief model answers.';

    try {
      const res = await ui.streaming({ button: els.runBtn, output: els.output }, function (signal, onDelta) {
        return SF.ai.chat({ system: system, prompt: prompt, onDelta: onDelta, signal: signal });
      });
      lastSummary = res.text;
      els.output.innerHTML = ui.md(lastSummary);
      SF.store.addHistory({
        tool: 'summarize',
        title: 'Summary · ' + ui.truncate(text, 60),
        messages: [
          { role: 'user', text: 'Summarize as ' + els.format.value + ' (' + els.length.value + '):\n\n' + ui.truncate(text, 500) },
          { role: 'assistant', text: lastSummary }
        ]
      });
      ui.toast('Summary saved to History.', 'ok');
    } catch (err) {
      if (!(err && err.stopped)) ui.toast(err.message || 'Could not summarize that.', 'err');
    }
  }

  SF.pages.summarize = {
    init: function () {
      if (mounted) return;
      mounted = true;
      els.input = ui.$('#sum-input');
      els.format = ui.$('#sum-format');
      els.length = ui.$('#sum-length');
      els.output = ui.$('#sum-output');
      els.runBtn = ui.$('#sum-run');

      els.runBtn.addEventListener('click', run);

      ui.$('#sum-paste').addEventListener('click', async function () {
        try {
          const text = await navigator.clipboard.readText();
          if (!text) {
            ui.toast('The clipboard is empty.', 'err');
            return;
          }
          els.input.value = text;
          els.input.focus();
        } catch (err) {
          ui.toast('Clipboard read was blocked — paste with Ctrl+V instead.', 'err');
        }
      });

      ui.$('#sum-export').addEventListener('click', function () {
        if (!lastSummary) {
          ui.toast('Nothing to export yet.', 'err');
          return;
        }
        SF.export.output('Study summary', lastSummary, 'md');
      });
    }
  };
})();
