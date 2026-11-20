/* ==========================================================================
   StudyForge — DOM helpers, markdown renderer, toasts, images
   ========================================================================== */

(function () {
  const SF = window.SF;

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function esc(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  function inline(src) {
    return src
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/(^|[^_\w])_([^_\n]+)_/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      );
  }

  /* Small, dependency-free Markdown renderer: headings, lists, quotes,
     fenced code, rules, bold/italic/code/links and tables. */
  function md(src) {
    if (!src) return '';
    const fences = [];
    let text = esc(String(src).replace(/\r\n/g, '\n'));

    text = text.replace(/```[a-zA-Z0-9+#-]*\n?([\s\S]*?)```/g, function (m, code) {
      fences.push('<pre class="code-block"><code>' + code.replace(/\n$/, '') + '</code></pre>');
      return '\n@@FENCE' + (fences.length - 1) + '@@\n';
    });

    const lines = text.split('\n');
    const out = [];
    let para = [];
    let list = null;

    function flushPara() {
      if (para.length) {
        out.push('<p>' + inline(para.join(' ')) + '</p>');
        para = [];
      }
    }
    function closeList() {
      if (list) {
        out.push('</' + list + '>');
        list = null;
      }
    }

    lines.forEach(function (line) {
      const fence = line.match(/^@@FENCE(\d+)@@$/);
      if (fence) {
        flushPara();
        closeList();
        out.push(fences[Number(fence[1])]);
        return;
      }
      if (/^\s*$/.test(line)) {
        flushPara();
        closeList();
        return;
      }
      const h = line.match(/^(#{1,5})\s+(.*)$/);
      if (h) {
        flushPara();
        closeList();
        const level = Math.min(h[1].length + 1, 5);
        out.push('<h' + level + '>' + inline(h[2]) + '</h' + level + '>');
        return;
      }
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        flushPara();
        closeList();
        out.push('<hr>');
        return;
      }
      const bq = line.match(/^&gt;\s?(.*)$/);
      if (bq) {
        flushPara();
        closeList();
        out.push('<blockquote>' + inline(bq[1]) + '</blockquote>');
        return;
      }
      const tableRow = line.match(/^\s*\|(.+)\|\s*$/);
      if (tableRow && tableRow[1].indexOf('-') !== -1 && /^\s*\|[\s:|-]+\|\s*$/.test(line)) {
        flushPara();
        closeList();
        return;
      }
      if (tableRow) {
        flushPara();
        closeList();
        const cells = tableRow[1].split('|').map(function (c) { return inline(c.trim()); });
        out.push('<table><tbody><tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr></tbody></table>');
        return;
      }
      const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ol || ul) {
        flushPara();
        const want = ol ? 'ol' : 'ul';
        if (list !== want) {
          closeList();
          list = want;
          out.push('<' + want + '>');
        }
        out.push('<li>' + inline(ol ? ol[2] : ul[1]) + '</li>');
        return;
      }
      para.push(line.trim());
    });

    flushPara();
    closeList();
    return out.join('\n');
  }

  /* Renders a partially streamed answer into a live output element.
     The returned painter carries `.end(note)` so a stopped or failed stream
     always drops the blinking caret and can leave a short explanation. */
  function streamInto(el) {
    let latest = '';

    function balanced(text) {
      const fences = (text.match(/```/g) || []).length;
      return fences % 2 === 1 ? text + '\n```' : text;
    }

    const paint = function (text) {
      if (!el) return;
      latest = String(text || '');
      el.innerHTML = md(balanced(latest)) + '<span class="stream-caret" aria-hidden="true"></span>';
    };

    paint.text = function () { return latest; };

    paint.end = function (note) {
      if (!el) return;
      let html = latest.trim() ? md(balanced(latest)) : '';
      if (note) html += '<p class="stream-note">' + esc(note) + '</p>';
      el.innerHTML = html;
    };

    return paint;
  }

  /* Runs a streaming chat request with a Stop control next to its button.
     `task(signal, onDelta)` does the actual call; the caller still handles the
     result. A user stop rejects with an error whose `.stopped` flag is true. */
  async function streaming(opts, task) {
    const options = opts || {};
    const button = options.button || null;
    const paint = options.output ? streamInto(options.output) : null;
    const onDelta = paint || function () {};
    const controller = new AbortController();
    const original = button ? button.innerHTML : '';
    const originalTitle = button ? button.title : '';
    let stopped = false;
    let stopBtn = null;

    if (button) {
      button.disabled = true;
      button.classList.add('loading', 'streaming');
      button.setAttribute('aria-busy', 'true');
      stopBtn = document.createElement('button');
      stopBtn.type = 'button';
      stopBtn.className = 'btn outline stop-btn';
      stopBtn.title = 'Stop this answer';
      stopBtn.textContent = 'Stop';
      stopBtn.addEventListener('click', function () {
        stopped = true;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping…';
        controller.abort();
      });
      if (button.parentNode) button.parentNode.insertBefore(stopBtn, button.nextSibling);
    }

    try {
      const result = await task(controller.signal, onDelta);
      if (paint) paint.end();
      return result;
    } catch (err) {
      const userStop = stopped || !!(err && err.stopped);
      if (paint) {
        paint.end(userStop
          ? 'Stopped — this answer is incomplete and was not saved.'
          : 'The answer stopped early — nothing was saved. Try again.');
      }
      if (userStop) {
        if (!err || !err.message) err = new Error('Stopped.');
        err.stopped = true;
      }
      throw err;
    } finally {
      if (stopBtn && stopBtn.parentNode) stopBtn.parentNode.removeChild(stopBtn);
      if (button) {
        button.disabled = false;
        button.classList.remove('loading', 'streaming');
        button.removeAttribute('aria-busy');
        button.innerHTML = original;
        button.title = originalTitle;
      }
    }
  }

  let toastTimer = null;
  function toast(message, type) {
    const host = $('#toasts');
    if (!host) return;
    while (host.children.length >= 4) host.removeChild(host.firstChild);
    const node = document.createElement('div');
    node.className = 'toast' + (type ? ' ' + type : '');
    node.textContent = message;
    host.appendChild(node);
    window.setTimeout(function () {
      node.classList.add('leaving');
      window.setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 220);
    }, 4200);
  }

  async function copy(text) {
    const value = String(text || '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        toast('Copied to clipboard', 'ok');
        return true;
      } catch (err) { /* fall through to the textarea method */ }
    }
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    toast(ok ? 'Copied to clipboard' : 'Copy failed — select the text manually', ok ? 'ok' : 'err');
    return ok;
  }

  /* Runs an async task while a button shows a loading state. */
  async function busy(button, task) {
    if (!button) return task();
    const original = button.innerHTML;
    button.disabled = true;
    button.classList.add('loading');
    try {
      return await task();
    } finally {
      button.disabled = false;
      button.classList.remove('loading');
      button.innerHTML = original;
    }
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function imageFromFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error('That file is not an image.'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read that image.')); };
      reader.onload = function () {
        const img = new Image();
        img.onerror = function () { reject(new Error('Could not decode that image.')); };
        img.onload = function () {
          const max = 1600;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          const scale = Math.min(1, max / Math.max(w, h));
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          let dataUrl;
          try {
            dataUrl = canvas.toDataURL('image/jpeg', 0.86);
          } catch (err) {
            dataUrl = reader.result;
          }
          resolve({ dataUrl: dataUrl, mime: 'image/jpeg', name: file.name || 'screenshot.jpg' });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function fmtDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  function truncate(str, n) {
    const s = String(str || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
  }

  function slug(str) {
    return String(str || 'studyforge')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'studyforge';
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function parseJsonLoose(text) {
    if (!text) throw new Error('Empty response.');
    let raw = String(text).trim();
    raw = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) raw = raw.slice(start, end + 1);
    return JSON.parse(raw);
  }

  SF.ui = {
    $: $,
    $$: $$,
    esc: esc,
    md: md,
    icon: icon,
    toast: toast,
    copy: copy,
    busy: busy,
    downloadFile: downloadFile,
    imageFromFile: imageFromFile,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    truncate: truncate,
    slug: slug,
    todayISO: todayISO,
    parseJsonLoose: parseJsonLoose,
    streamInto: streamInto,
    streaming: streaming
  };
})();
