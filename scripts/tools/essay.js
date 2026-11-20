/* ==========================================================================
   StudyForge — (2) Essay & Paper Writer
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;
  SF.pages = SF.pages || {};

  let mounted = false;
  let lastDraft = '';
  let entryId = null;
  const els = {};

  function setupPrompt() {
    return (
      'Type: ' + els.type.value +
      '\nTone: ' + els.tone.value +
      '\nTarget length: ' + els.length.value +
      '\nCitation style: ' + els.citation.value +
      '\nAssignment: ' + els.prompt.value.trim() +
      (els.notes.value.trim() ? '\nNotes and sources to use: ' + els.notes.value.trim() : '')
    );
  }

  function ensurePrompt() {
    if (!els.prompt.value.trim()) {
      ui.toast('Add the essay prompt first.', 'err');
      els.prompt.focus();
      return false;
    }
    return true;
  }

  async function makeOutline(silent) {
    if (!ensurePrompt()) return false;
    const system =
      'You are an academic writing coach. Produce a clear, specific outline a student can ' +
      'expand into a full paper. Use Markdown headings and short bullet points. ' +
      'Do not write the essay yet. Never invent sources.';
    const prompt =
      'Create an outline for the following assignment.\n\n' + setupPrompt() +
      '\n\nReturn only the outline: a working title, thesis statement, and 4-6 numbered sections ' +
      'with 2-3 bullets each.';
    try {
      const res = await ui.busy(els.outlineBtn, function () {
        return SF.ai.chat({ system: system, prompt: prompt });
      });
      els.outline.value = res.text.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
      if (!silent) ui.toast('Outline ready — edit it if you like.', 'ok');
      return true;
    } catch (err) {
      ui.toast(err.message || 'Could not build the outline.', 'err');
      return false;
    }
  }

  async function writeDraft() {
    if (!ensurePrompt()) return;
    if (!SF.ai.isConfigured()) {
      ui.toast('Add an AI provider key first.', 'err');
      if (SF.openSettings) SF.openSettings();
      return;
    }
    if (!els.outline.value.trim()) {
      const ok = await makeOutline(true);
      if (!ok) return;
    }

    const system =
      'You are an expert academic writer. Write complete, original, well-structured prose. ' +
      'Follow the requested tone and length. Use paragraphs, not bullet lists, unless the type asks for it. ' +
      'Never invent quotations, page numbers or sources; if sources are not supplied, keep claims general. ' +
      'Format the result in Markdown with a title and, if a citation style is set, a short references section ' +
      'containing only sources supplied by the student.' +
      SF.presets.directive('essay');
    const prompt =
      setupPrompt() +
      '\n\nUse this outline:\n\n' + els.outline.value.trim() +
      '\n\nWrite the finished piece now. Match the target length closely (within 10%).';

    try {
      const res = await ui.streaming({ button: els.writeBtn, output: els.output }, function (signal, onDelta) {
        return SF.ai.chat({ system: system, prompt: prompt, onDelta: onDelta, signal: signal });
      });
      lastDraft = res.text;
      els.output.innerHTML = ui.md(lastDraft);
      const entry = SF.store.addHistory({
        tool: 'essay',
        title: ui.truncate(els.prompt.value.trim(), 70),
        messages: [
          { role: 'user', text: setupPrompt() },
          { role: 'assistant', text: lastDraft }
        ]
      });
      entryId = entry.id;
      ui.toast('Draft finished and saved to History.', 'ok');
    } catch (err) {
      if (!(err && err.stopped)) ui.toast(err.message || 'Could not write the draft.', 'err');
    }
  }

  async function polish() {
    if (!lastDraft) {
      ui.toast('Write a draft first.', 'err');
      return;
    }
    const system =
      'You are a line editor. Improve clarity, flow, grammar and precision without changing the ' +
      'argument or adding new claims. Keep the same length (±10%) and citation style. ' +
      'Return the full revised text in Markdown, not a list of changes.' +
      SF.presets.directive('essay');
    const prompt =
      'Polish this ' + els.type.value.toLowerCase() + ' (tone: ' + els.tone.value + '):\n\n' + lastDraft;
    try {
      const res = await ui.streaming({ button: els.polish, output: els.output }, function (signal, onDelta) {
        return SF.ai.chat({ system: system, prompt: prompt, onDelta: onDelta, signal: signal });
      });
      lastDraft = res.text;
      els.output.innerHTML = ui.md(lastDraft);
      if (entryId) {
        SF.store.updateHistory(entryId, {
          messages: [
            { role: 'user', text: setupPrompt() + '\n\n(Polished revision)' },
            { role: 'assistant', text: lastDraft }
          ]
        });
      }
      ui.toast('Polished. The History entry was updated.', 'ok');
    } catch (err) {
      if (!(err && err.stopped)) ui.toast(err.message || 'Could not polish the draft.', 'err');
    }
  }

  SF.pages.essay = {
    init: function () {
      if (mounted) return;
      mounted = true;
      els.prompt = ui.$('#essay-prompt');
      els.type = ui.$('#essay-type');
      els.tone = ui.$('#essay-tone');
      els.length = ui.$('#essay-length');
      els.citation = ui.$('#essay-citation');
      els.notes = ui.$('#essay-notes');
      els.outline = ui.$('#essay-outline');
      els.output = ui.$('#essay-output');
      els.outlineBtn = ui.$('#essay-outline-btn');
      els.writeBtn = ui.$('#essay-write-btn');
      els.polish = ui.$('#essay-polish');

      els.outlineBtn.addEventListener('click', function () { makeOutline(false); });
      els.writeBtn.addEventListener('click', writeDraft);
      els.polish.addEventListener('click', polish);

      ui.$('#essay-export').addEventListener('click', function () {
        if (!lastDraft) {
          ui.toast('Nothing to export yet.', 'err');
          return;
        }
        SF.export.output(els.prompt.value.trim() || 'Essay', lastDraft, 'md');
      });
    }
  };
})();
