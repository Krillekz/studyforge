/* ==========================================================================
   StudyForge — (1) AI Homework Omni-Solver (text + vision)
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;
  SF.pages = SF.pages || {};

  let mounted = false;
  let convo = [];
  let pending = [];
  let entryId = null;
  const els = {};

  const EXAMPLES = [
    'Solve 3x² − 7x + 2 = 0 and show every step',
    'Explain photosynthesis like I am 12',
    'Why does this Python loop print nothing?',
    'Summarize the causes of World War I in 5 bullets'
  ];

  function emptyState() {
    els.log.innerHTML =
      '<div class="chat-empty">' +
        '<div class="chat-empty-mark">' + ui.icon('bolt') + '</div>' +
        '<h3>Ask anything from any subject</h3>' +
        '<p>Type a question, paste a problem, or attach a photo of the worksheet. StudyForge reads images and walks through the answer.</p>' +
        '<div class="example-chips">' +
          EXAMPLES.map(function (e) {
            return '<button type="button" data-example="' + ui.esc(e) + '">' + ui.esc(e) + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  function refreshProvider() {
    if (!els.providerLabel) return;
    const d = SF.ai.describe();
    els.providerLabel.textContent = d.label + ' · ' + d.model + (d.configured ? '' : ' (not configured)');
    els.settingsBtn.disabled = false;
  }

  function appendMessage(opts) {
    if (els.log.querySelector('.chat-empty')) els.log.innerHTML = '';
    const role = opts.role || 'assistant';
    const wrap = document.createElement('div');
    wrap.className = 'msg msg-' + (role === 'error' ? 'error' : role);

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.innerHTML = role === 'user' ? 'Y' : role === 'error' ? '!' : ui.icon('bolt');

    const body = document.createElement('div');
    body.className = 'msg-body';

    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    const who = document.createElement('strong');
    who.textContent = role === 'user' ? 'You' : role === 'error' ? 'Connection problem' : 'StudyForge';
    meta.appendChild(who);
    if (opts.meta) {
      const tag = document.createElement('span');
      tag.textContent = opts.meta;
      meta.appendChild(tag);
    }
    if (opts.text) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'msg-copy';
      copyBtn.title = 'Copy message';
      copyBtn.innerHTML = ui.icon('copy');
      copyBtn.addEventListener('click', function () { ui.copy(opts.text); });
      meta.appendChild(copyBtn);
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (opts.images && opts.images.length) {
      const gallery = document.createElement('div');
      gallery.className = 'msg-images';
      opts.images.forEach(function (img) {
        const thumb = document.createElement('img');
        thumb.src = img.dataUrl;
        thumb.alt = img.name || 'Attached image';
        gallery.appendChild(thumb);
      });
      bubble.appendChild(gallery);
    }

    const textNode = document.createElement('div');
    if (role === 'assistant') {
      textNode.className = 'markdown';
      textNode.innerHTML = ui.md(opts.text || '');
    } else if (role === 'error') {
      textNode.innerHTML = ui.md(opts.text || '');
    } else {
      textNode.textContent = opts.text || '';
    }
    bubble.appendChild(textNode);

    body.appendChild(meta);
    body.appendChild(bubble);
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    els.log.appendChild(wrap);
    els.log.scrollTop = els.log.scrollHeight;
    return wrap;
  }

  /* Assistant bubble that fills in while the answer streams. */
  function appendStreaming() {
    if (els.log.querySelector('.chat-empty')) els.log.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'msg msg-assistant';
    wrap.innerHTML =
      '<div class="msg-avatar">' + ui.icon('bolt') + '</div>' +
      '<div class="msg-body"><div class="msg-meta"><strong>StudyForge</strong>' +
      '<span class="msg-status">streaming…</span></div>' +
      '<div class="msg-bubble"><div class="markdown stream-live"></div></div></div>';
    els.log.appendChild(wrap);

    const node = wrap.querySelector('.stream-live');
    const status = wrap.querySelector('.msg-status');
    let last = '';

    return {
      set: function (text) {
        last = String(text || '');
        node.innerHTML = ui.md(last) + '<span class="stream-caret"></span>';
        els.log.scrollTop = els.log.scrollHeight;
      },
      finish: function (text, model) {
        node.innerHTML = ui.md(text);
        status.textContent = model || '';
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'msg-copy';
        copyBtn.title = 'Copy message';
        copyBtn.innerHTML = ui.icon('copy');
        copyBtn.addEventListener('click', function () { ui.copy(text); });
        wrap.querySelector('.msg-meta').appendChild(copyBtn);
        els.log.scrollTop = els.log.scrollHeight;
      },
      /* Drops the caret and marks an answer that never finished. */
      fail: function (note) {
        node.innerHTML = (last.trim() ? ui.md(last) : '') +
          '<p class="stream-note">' + ui.esc(note) + '</p>';
        status.textContent = 'incomplete';
        els.log.scrollTop = els.log.scrollHeight;
      }
    };
  }

  function showTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'msg msg-assistant';
    wrap.innerHTML =
      '<div class="msg-avatar">' + ui.icon('bolt') + '</div>' +
      '<div class="msg-body"><div class="msg-meta"><strong>StudyForge</strong><span>thinking…</span></div>' +
      '<div class="msg-bubble"><span class="typing"><i></i><i></i><i></i></span></div></div>';
    els.log.appendChild(wrap);
    els.log.scrollTop = els.log.scrollHeight;
    return wrap;
  }

  function renderStrip() {
    if (!pending.length) {
      els.strip.hidden = true;
      els.strip.innerHTML = '';
      return;
    }
    els.strip.hidden = false;
    els.strip.innerHTML = '';
    pending.forEach(function (img, index) {
      const item = document.createElement('div');
      item.className = 'attach-item';
      const thumb = document.createElement('img');
      thumb.src = img.dataUrl;
      thumb.alt = 'Attachment ' + (index + 1);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Remove image');
      remove.innerHTML = ui.icon('x');
      remove.addEventListener('click', function () {
        pending.splice(index, 1);
        renderStrip();
      });
      item.appendChild(thumb);
      item.appendChild(remove);
      els.strip.appendChild(item);
    });
  }

  async function addImages(files) {
    const list = Array.prototype.slice.call(files || []).filter(function (f) {
      return f && /^image\//.test(f.type);
    });
    if (!list.length) {
      ui.toast('That did not contain an image.', 'err');
      return;
    }
    for (const file of list) {
      try {
        const img = await ui.imageFromFile(file);
        pending.push(img);
      } catch (err) {
        ui.toast(err.message || 'Could not read that image.', 'err');
      }
    }
    renderStrip();
    els.input.focus();
  }

  function buildSystem() {
    return (
      SF.config.systemPrompt +
      '\n\nSubject focus: ' + els.subject.value + '.' +
      '\nRequested answer style: ' + els.style.value + '.' +
      '\nWhen the subject is not obvious, infer it from the question.' +
      SF.presets.directive('solver')
    );
  }

  function saveSession() {
    const first = convo.find(function (m) { return m.role === 'user'; });
    const title = ui.truncate((first && first.text) || 'Image problem', 70) || 'Image problem';
    if (!entryId) {
      const entry = SF.store.addHistory({ tool: 'solver', title: title, messages: convo });
      entryId = entry.id;
    } else {
      SF.store.updateHistory(entryId, { messages: convo });
    }
  }

  async function send() {
    const text = els.input.value.trim();
    if (!text && !pending.length) {
      ui.toast('Type a question or attach a screenshot first.', 'err');
      els.input.focus();
      return;
    }
    if (!SF.ai.isConfigured()) {
      ui.toast('Add an AI provider key to start solving.', 'err');
      if (SF.openSettings) SF.openSettings();
      return;
    }

    const images = pending.slice();
    pending = [];
    renderStrip();
    els.input.value = '';

    appendMessage({ role: 'user', text: text, images: images });
    convo.push({ role: 'user', text: text || 'Solve the problem in this image.', images: images });

    const history = convo.slice(0, -1).map(function (m) {
      return { role: m.role, text: m.text };
    });

    const typing = showTyping();
    let live = null;
    try {
      const answer = await ui.streaming({ button: els.send }, function (signal) {
        return SF.ai.chat({
          system: buildSystem(),
          history: history,
          prompt: text || 'Read this image and solve every problem on it. Show your work.',
          images: images,
          signal: signal,
          onDelta: function (partial) {
            if (!live) {
              typing.remove();
              live = appendStreaming();
            }
            live.set(partial);
          }
        });
      });
      typing.remove();
      if (!live) live = appendStreaming();
      live.finish(answer.text, answer.model);
      convo.push({ role: 'assistant', text: answer.text });
      saveSession();
    } catch (err) {
      typing.remove();
      const stopped = !!(err && err.stopped);
      if (live) {
        live.fail(stopped
          ? 'Stopped — this answer is incomplete and was not saved.'
          : 'The answer stopped early — nothing was saved. Try again.');
      } else if (stopped) {
        ui.toast('Stopped before the answer started.');
      }
      if (!stopped) {
        appendMessage({ role: 'error', text: (err && err.message) || 'Something went wrong.' });
      }
    }
  }

  function reset() {
    convo = [];
    pending = [];
    entryId = null;
    els.input.value = '';
    renderStrip();
    emptyState();
  }

  function bind() {
    els.send.addEventListener('click', send);

    els.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    els.log.addEventListener('click', function (e) {
      const chip = e.target.closest('[data-example]');
      if (chip) {
        els.input.value = chip.getAttribute('data-example');
        els.input.focus();
      }
    });

    els.newBtn.addEventListener('click', function () {
      if (convo.length && !window.confirm('Start a new conversation? This one is already in History.')) return;
      reset();
    });

    els.settingsBtn.addEventListener('click', function () {
      if (SF.openSettings) SF.openSettings();
    });

    els.attachBtn.addEventListener('click', function () { els.file.click(); });
    els.file.addEventListener('change', function () {
      addImages(els.file.files);
      els.file.value = '';
    });

    els.drop.addEventListener('dragover', function (e) {
      e.preventDefault();
      els.drop.classList.add('dragging');
    });
    els.drop.addEventListener('dragleave', function (e) {
      if (!els.drop.contains(e.relatedTarget)) els.drop.classList.remove('dragging');
    });
    els.drop.addEventListener('drop', function (e) {
      e.preventDefault();
      els.drop.classList.remove('dragging');
      if (e.dataTransfer && e.dataTransfer.files) addImages(e.dataTransfer.files);
    });
  }

  SF.pages.solver = {
    init: function () {
      if (mounted) {
        refreshProvider();
        return;
      }
      mounted = true;
      els.log = ui.$('#solver-log');
      els.input = ui.$('#solver-input');
      els.strip = ui.$('#solver-attach-strip');
      els.send = ui.$('#solver-send');
      els.newBtn = ui.$('#solver-new');
      els.subject = ui.$('#solver-subject');
      els.style = ui.$('#solver-style');
      els.settingsBtn = ui.$('#solver-settings');
      els.providerLabel = ui.$('#solver-provider-label');
      els.attachBtn = ui.$('#solver-attach-btn');
      els.file = ui.$('#solver-file');
      els.drop = ui.$('#solver-drop');

      bind();
      emptyState();
      refreshProvider();
    },
    refresh: refreshProvider,
    addImages: addImages,
    reset: reset
  };
})();
