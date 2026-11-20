/* ==========================================================================
   StudyForge — AI provider layer
   BYOK cloud adapters + local Ollama, all called from the client.
   Answers can be streamed through an optional onDelta(fullText) callback.
   ========================================================================== */

(function () {
  const SF = window.SF;
  const TIMEOUT = 120000;
  const STREAM_TIMEOUT = 180000;

  function currentSettings() {
    return SF.store.settings();
  }

  function labelFor(id) {
    const meta = SF.config.providers[id];
    return meta ? meta.label : id;
  }

  function buildMessages(history, prompt, images) {
    const msgs = [];
    (history || []).forEach(function (m) {
      if (!m) return;
      const text = m.text !== undefined ? m.text : m.content;
      if (!text) return;
      msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', text: String(text), images: [] });
    });
    msgs.push({
      role: 'user',
      text: prompt || '',
      images: images || []
    });
    return msgs;
  }

  function mergeRoles(msgs) {
    const out = [];
    msgs.forEach(function (m) {
      const prev = out[out.length - 1];
      if (prev && prev.role === m.role) {
        prev.text += (prev.text ? '\n\n' : '') + m.text;
      } else {
        out.push({ role: m.role, text: m.text, images: m.images || [] });
      }
    });
    if (out.length && out[0].role === 'assistant') out.shift();
    return out;
  }

  function stripDataUrl(dataUrl) {
    const idx = String(dataUrl || '').indexOf(',');
    return idx === -1 ? '' : String(dataUrl).slice(idx + 1);
  }

  function hostOf(url) {
    try { return new URL(url).host; } catch (err) { return url; }
  }

  function netError(url) {
    return new Error(
      'Could not reach ' + hostOf(url) + '. Check your connection' +
      (hostOf(url).indexOf('localhost') !== -1
        ? ', that Ollama is running, and OLLAMA_ORIGINS for browser access.'
        : ' and that the model name exists.')
    );
  }

  function extractError(data, raw) {
    if (data) {
      if (data.error) {
        if (typeof data.error === 'string') return data.error;
        if (data.error.message) return String(data.error.message);
        if (data.error.type) return String(data.error.type);
      }
      if (data.message && typeof data.message === 'string') return data.message;
    }
    const text = String(raw || '').replace(/\s+/g, ' ').trim();
    return text ? text.slice(0, 240) : 'The provider rejected the request.';
  }

  async function request(url, options, timeout) {
    const controller = new AbortController();
    const timer = window.setTimeout(function () { controller.abort(); }, timeout || TIMEOUT);
    let res;
    try {
      res = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    } catch (err) {
      window.clearTimeout(timer);
      if (err && err.name === 'AbortError') {
        throw new Error('The request timed out after ' + Math.round((timeout || TIMEOUT) / 1000) + 's. Try a smaller prompt or a faster model.');
      }
      throw netError(url);
    }
    window.clearTimeout(timer);

    const raw = await res.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (err) { data = null; }

    if (!res.ok) {
      throw new Error(extractError(data, raw) + ' (HTTP ' + res.status + ')');
    }
    if (!data) throw new Error('The provider returned an empty response.');
    return data;
  }

  /* ------------------------------ streaming ------------------------------ */

  /* Thrown when the reader stopped the answer themselves, so callers can show
     a quiet "stopped" note instead of an error. */
  function stoppedError() {
    const err = new Error('Stopped.');
    err.stopped = true;
    return err;
  }

  /* Reads a streamed response line by line. The provider adapters below turn
     each line into text; this layer only cares about framing and errors. An
     optional `signal` lets the caller stop the answer mid-stream. */
  async function streamRequest(url, options, onLine, timeout, signal) {
    const limit = timeout || STREAM_TIMEOUT;
    const controller = new AbortController();
    const timer = window.setTimeout(function () { controller.abort(); }, limit);
    let stopped = false;

    function stop() {
      stopped = true;
      controller.abort();
    }

    if (signal) {
      if (signal.aborted) stop();
      else signal.addEventListener('abort', stop);
    }

    try {
      let res;
      try {
        res = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
      } catch (err) {
        if (stopped) throw stoppedError();
        if (err && err.name === 'AbortError') {
          throw new Error('The request timed out after ' + Math.round(limit / 1000) + 's. Try a smaller prompt or a faster model.');
        }
        throw netError(url);
      }

      if (!res.ok) {
        const raw = await res.text();
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch (err) { data = null; }
        throw new Error(extractError(data, raw) + ' (HTTP ' + res.status + ')');
      }

      if (!res.body || typeof res.body.getReader !== 'function') {
        throw new Error('This environment cannot read a streamed answer. Turn streaming off or use another browser.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        for (;;) {
          const step = await reader.read();
          if (step.done) break;
          buffer += decoder.decode(step.value, { stream: true });
          let cut;
          while ((cut = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, cut).replace(/\r$/, '');
            buffer = buffer.slice(cut + 1);
            if (line.trim()) onLine(line);
          }
        }
        buffer += decoder.decode();
        if (buffer.trim()) onLine(buffer.trim());
      } catch (err) {
        try { reader.cancel(); } catch (ignore) { /* already closed */ }
        if (stopped) throw stoppedError();
        if (err && err.name === 'AbortError') {
          throw new Error('The answer stalled and was stopped after ' + Math.round(limit / 1000) + 's. Try again or pick a faster model.');
        }
        throw err;
      }
    } finally {
      window.clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', stop);
    }
  }

  /* Accumulates streamed chunks and reports the whole answer so far at most
     every 60ms, so the UI can re-render without thrashing. */
  function collector(onDelta) {
    let text = '';
    let last = 0;
    return {
      push: function (chunk) {
        if (!chunk) return;
        text += chunk;
        if (!onDelta) return;
        const now = Date.now();
        if (now - last >= 60) {
          last = now;
          onDelta(text);
        }
      },
      finish: function () {
        if (onDelta) onDelta(text);
        return text;
      }
    };
  }

  function ssePayload(line) {
    if (line.slice(0, 5) !== 'data:') return null;
    const body = line.slice(5).trim();
    if (!body || body === '[DONE]') return null;
    try { return JSON.parse(body); } catch (err) { return null; }
  }

  /* ------------------------------ adapters ------------------------------ */

  function openAIHeaders(kind, p) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + p.key
    };
    if (kind === 'openrouter') {
      headers['HTTP-Referer'] = 'https://github.com/your-username/studyforge';
      headers['X-Title'] = 'StudyForge';
    }
    return headers;
  }

  function openAIMessages(system, msgs) {
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    msgs.forEach(function (m) {
      if (m.role === 'assistant') {
        messages.push({ role: 'assistant', content: m.text });
        return;
      }
      if (!m.images.length) {
        messages.push({ role: 'user', content: m.text || 'Continue.' });
        return;
      }
      const parts = [{ type: 'text', text: m.text || 'Solve everything in this image and show your work.' }];
      m.images.forEach(function (img) {
        parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
      });
      messages.push({ role: 'user', content: parts });
    });
    return messages;
  }

  function openAIBase(kind) {
    return kind === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
  }

  function openAIText(data) {
    const choice = data.choices && data.choices[0];
    const content = choice && choice.message ? choice.message.content : '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(function (part) { return part && part.text ? part.text : ''; }).join('\n');
    }
    return '';
  }

  async function callOpenAI(kind, settings, model, system, msgs) {
    const p = settings.providers[kind];
    const data = await request(openAIBase(kind) + '/chat/completions', {
      method: 'POST',
      headers: openAIHeaders(kind, p),
      body: JSON.stringify({ model: model, messages: openAIMessages(system, msgs) })
    });

    const text = openAIText(data);
    if (!text.trim()) {
      throw new Error('The model returned no text. Try another model name in settings.');
    }
    return text.trim();
  }

  async function streamOpenAI(kind, settings, model, system, msgs, onDelta, signal) {
    const p = settings.providers[kind];
    const acc = collector(onDelta);
    await streamRequest(openAIBase(kind) + '/chat/completions', {
      method: 'POST',
      headers: openAIHeaders(kind, p),
      body: JSON.stringify({ model: model, messages: openAIMessages(system, msgs), stream: true })
    }, function (line) {
      const data = ssePayload(line);
      if (!data) return;
      if (data.error) throw new Error(extractError(data));
      const choice = data.choices && data.choices[0];
      const delta = choice && (choice.delta || choice.message);
      if (delta && typeof delta.content === 'string') acc.push(delta.content);
    }, null, signal);

    const text = acc.finish().trim();
    if (!text) throw new Error('The model returned no text. Try another model name in settings.');
    return text;
  }

  function anthropicMessages(msgs) {
    return mergeRoles(msgs).map(function (m) {
      if (m.role === 'assistant') return { role: 'assistant', content: m.text };
      if (!m.images.length) return { role: 'user', content: m.text || 'Continue.' };
      const parts = m.images.map(function (img) {
        return {
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mime || 'image/jpeg',
            data: stripDataUrl(img.dataUrl)
          }
        };
      });
      parts.push({ type: 'text', text: m.text || 'Solve everything in this image and show your work.' });
      return { role: 'user', content: parts };
    });
  }

  function anthropicHeaders(key) {
    return {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
  }

  async function callAnthropic(p, model, system, msgs) {
    const data = await request('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: anthropicHeaders(p.key),
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        system: system,
        messages: anthropicMessages(msgs)
      })
    });

    const text = (data.content || [])
      .map(function (block) { return block && block.type === 'text' ? block.text : ''; })
      .join('\n')
      .trim();
    if (!text) throw new Error('Claude returned no text. Try a different model in settings.');
    return text;
  }

  async function streamAnthropic(p, model, system, msgs, onDelta, signal) {
    const acc = collector(onDelta);
    await streamRequest('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: anthropicHeaders(p.key),
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        system: system,
        messages: anthropicMessages(msgs),
        stream: true
      })
    }, function (line) {
      const data = ssePayload(line);
      if (!data) return;
      if (data.type === 'error') throw new Error(extractError(data));
      if (data.type === 'content_block_delta' && data.delta) {
        if (typeof data.delta.text === 'string') acc.push(data.delta.text);
      }
    }, null, signal);

    const text = acc.finish().trim();
    if (!text) throw new Error('Claude returned no text. Try a different model in settings.');
    return text;
  }

  function geminiContents(msgs) {
    return mergeRoles(msgs).map(function (m) {
      const parts = [];
      if (m.text) parts.push({ text: m.text });
      m.images.forEach(function (img) {
        parts.push({
          inlineData: { mimeType: img.mime || 'image/jpeg', data: stripDataUrl(img.dataUrl) }
        });
      });
      if (!parts.length) parts.push({ text: 'Continue.' });
      return { role: m.role === 'assistant' ? 'model' : 'user', parts: parts };
    });
  }

  function geminiBody(system, msgs) {
    return {
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: geminiContents(msgs),
      generationConfig: { temperature: 0.5, maxOutputTokens: 4096 }
    };
  }

  function geminiUrl(model, streaming) {
    const action = streaming ? ':streamGenerateContent?alt=sse' : ':generateContent';
    return 'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(model) + action;
  }

  function geminiText(data) {
    if (data.promptFeedback && data.promptFeedback.blockReason) {
      throw new Error('Gemini blocked this request (' + data.promptFeedback.blockReason + ').');
    }
    const candidate = data.candidates && data.candidates[0];
    const parts = candidate && candidate.content && candidate.content.parts ? candidate.content.parts : [];
    return parts.map(function (part) { return part && part.text ? part.text : ''; }).join('');
  }

  async function callGemini(p, model, system, msgs) {
    const data = await request(geminiUrl(model, false), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': p.key
      },
      body: JSON.stringify(geminiBody(system, msgs))
    });

    const text = geminiText(data).trim();
    if (!text) throw new Error('Gemini returned no text. Try another model name in settings.');
    return text;
  }

  async function streamGemini(p, model, system, msgs, onDelta, signal) {
    const acc = collector(onDelta);
    await streamRequest(geminiUrl(model, true), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': p.key
      },
      body: JSON.stringify(geminiBody(system, msgs))
    }, function (line) {
      const data = ssePayload(line);
      if (!data) return;
      if (data.error) throw new Error(extractError(data));
      acc.push(geminiText(data));
    }, null, signal);

    const text = acc.finish().trim();
    if (!text) throw new Error('Gemini returned no text. Try another model name in settings.');
    return text;
  }

  function ollamaMessages(system, msgs) {
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    msgs.forEach(function (m) {
      const msg = { role: m.role, content: m.text || '' };
      if (m.images.length) {
        msg.images = m.images.map(function (img) { return stripDataUrl(img.dataUrl); });
        if (!msg.content) msg.content = 'Solve everything in this image and show your work.';
      }
      messages.push(msg);
    });
    return messages;
  }

  function ollamaBase(p) {
    return String(p.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
  }

  function ollamaText(data) {
    const text = (data.message && data.message.content) || data.response || '';
    return String(text);
  }

  async function callOllama(p, model, system, msgs) {
    const data = await request(
      ollamaBase(p) + '/api/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model, messages: ollamaMessages(system, msgs), stream: false })
      },
      180000
    );

    const text = ollamaText(data).trim();
    if (!text) {
      throw new Error('Ollama returned no text. Is "' + model + '" pulled? Try `ollama pull ' + model + '`.');
    }
    return text;
  }

  async function streamOllama(p, model, system, msgs, onDelta, signal) {
    const acc = collector(onDelta);
    await streamRequest(ollamaBase(p) + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model, messages: ollamaMessages(system, msgs), stream: true })
    }, function (line) {
      let data;
      try { data = JSON.parse(line); } catch (err) { return; }
      if (data.error) throw new Error(String(data.error));
      if (data.done) return;
      const piece = ollamaText(data);
      if (piece) acc.push(piece);
    }, 180000, signal);

    const text = acc.finish().trim();
    if (!text) {
      throw new Error('Ollama returned no text. Is "' + model + '" pulled? Try `ollama pull ' + model + '`.');
    }
    return text;
  }

  /* ------------------------------ public API ------------------------------ */

  async function chat(opts) {
    const options = opts || {};
    const base = currentSettings();
    const settings = options.settings
      ? { provider: options.settings.provider || base.provider, providers: options.settings.providers || base.providers }
      : base;
    const id = options.providerId || settings.provider;
    const meta = SF.config.providers[id];
    const p = settings.providers[id];

    if (!meta || !p) throw new Error('Unknown AI provider.');
    if (meta.needsKey && !p.key) {
      throw new Error('Add your ' + meta.label + ' API key in AI settings to continue.');
    }
    if (id === 'ollama' && !p.baseUrl) {
      throw new Error('Add your Ollama base URL (usually http://localhost:11434) in AI settings.');
    }
    if (id === 'ollama' && !p.key && !p.baseUrl) {
      throw new Error('Ollama is not configured.');
    }

    const hasImages = !!(options.images && options.images.length);
    const model = hasImages ? (p.visionModel || p.model) : (p.model || p.visionModel);
    if (!model) throw new Error('Set a model name for ' + meta.label + ' in AI settings.');
    if (hasImages && !p.visionModel) {
      throw new Error(meta.label + ' needs a vision model for images. Add one in AI settings.');
    }

    const msgs = buildMessages(options.history, options.prompt, options.images);
    const system = options.system || '';
    const onDelta = typeof options.onDelta === 'function' ? options.onDelta : null;
    const signal = options.signal || null;
    let text;

    if (meta.kind === 'openai' || meta.kind === 'openrouter') {
      text = onDelta
        ? await streamOpenAI(meta.kind, settings, model, system, msgs, onDelta, signal)
        : await callOpenAI(meta.kind, settings, model, system, msgs);
    } else if (meta.kind === 'anthropic') {
      text = onDelta
        ? await streamAnthropic(p, model, system, msgs, onDelta, signal)
        : await callAnthropic(p, model, system, msgs);
    } else if (meta.kind === 'gemini') {
      text = onDelta
        ? await streamGemini(p, model, system, msgs, onDelta, signal)
        : await callGemini(p, model, system, msgs);
    } else if (meta.kind === 'ollama') {
      text = onDelta
        ? await streamOllama(p, model, system, msgs, onDelta, signal)
        : await callOllama(p, model, system, msgs);
    } else {
      throw new Error('Unsupported provider.');
    }

    return { text: text, provider: id, model: model };
  }

  function describe() {
    const settings = currentSettings();
    const id = settings.provider;
    const meta = SF.config.providers[id];
    const p = settings.providers[id] || {};
    const model = p.model || p.visionModel || 'no model';
    return { id: id, label: meta ? meta.label : id, model: model, configured: isConfigured(settings) };
  }

  function isConfigured(settings) {
    const s = settings || currentSettings();
    const id = s.provider;
    const meta = SF.config.providers[id];
    const p = s.providers[id];
    if (!meta || !p) return false;
    if (meta.needsKey) return !!p.key;
    return !!(p.baseUrl || p.model);
  }

  SF.ai = {
    chat: chat,
    describe: describe,
    isConfigured: isConfigured,
    needsSetup: function () { return !isConfigured(); },
    async test(providerId, settingsDraft) {
      const result = await chat({
        providerId: providerId,
        settings: settingsDraft,
        system: 'You are a connection test. Answer in three words or fewer.',
        prompt: 'Reply with exactly: connection ok'
      });
      return result;
    }
  };
})();
