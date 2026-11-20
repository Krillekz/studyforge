/* ==========================================================================
   StudyForge — (8) Citation & Bibliography Generator
   Deterministic formatting: works offline, no AI call, no network.
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;
  SF.pages = SF.pages || {};

  let mounted = false;
  let list = [];
  let rendered = [];
  let renderedIds = [];
  const els = {};

  /* ---------- author helpers ---------- */

  function splitAuthors(raw) {
    const s = String(raw || '').trim();
    if (!s) return [];
    const semi = s.split(/\s*;\s*/).filter(Boolean);
    if (semi.length > 1) return semi;
    const andSplit = s.split(/\s+(?:and|&)\s+/i).filter(Boolean);
    if (andSplit.length > 1) return andSplit;
    return [s];
  }

  function initials(given) {
    return String(given || '')
      .split(/\s+/)
      .filter(Boolean)
      .map(function (part) { return part[0].toUpperCase() + '.'; })
      .join(' ');
  }

  function apaName(name) {
    const n = String(name).trim();
    if (n.indexOf(',') !== -1) {
      const bits = n.split(',');
      const last = bits[0].trim();
      const given = bits.slice(1).join(' ').trim();
      return given ? last + ', ' + initials(given) : last;
    }
    const parts = n.split(/\s+/);
    if (parts.length === 1) return n;
    const last = parts.pop();
    return last + ', ' + initials(parts.join(' '));
  }

  function fullName(name) {
    const n = String(name).trim();
    if (n.indexOf(',') !== -1) {
      const bits = n.split(',');
      const last = bits[0].trim();
      const given = bits.slice(1).join(' ').trim();
      return given ? last + ', ' + given : last;
    }
    return n;
  }

  function naturalName(name) {
    const n = String(name).trim();
    if (n.indexOf(',') !== -1) {
      const bits = n.split(',');
      const last = bits[0].trim();
      const given = bits.slice(1).join(' ').trim();
      return given ? given + ' ' + last : last;
    }
    return n;
  }

  function withStop(str) {
    const s = String(str || '').trim();
    if (!s) return '';
    return /[.!?]$/.test(s) ? s : s + '.';
  }

  function authorsFor(style, raw) {
    const names = splitAuthors(raw);
    if (!names.length) return '';

    if (style.indexOf('APA') === 0) {
      const formatted = names.map(apaName);
      if (formatted.length === 1) return withStop(formatted[0]);
      if (formatted.length === 2) return withStop(formatted[0] + ', & ' + formatted[1]);
      return withStop(
        formatted.slice(0, -1).join(', ') + ', & ' + formatted[formatted.length - 1]
      );
    }

    const first = fullName(names[0]);
    if (names.length === 1) return withStop(first);
    const rest = names.slice(1).map(naturalName);
    if (rest.length === 1) return withStop(first + ', and ' + rest[0]);
    return withStop(first + ', ' + rest.slice(0, -1).join(', ') + ', and ' + rest[rest.length - 1]);
  }

  /* ---------- formatting ---------- */

  function P(str) {
    const s = String(str || '').trim();
    if (!s) return '';
    return /[.!?]$/.test(s) ? s : s + '.';
  }

  function apa(s, a) {
    const parts = [];
    if (a) parts.push(a);
    parts.push('(' + (s.year || 'n.d.') + ').');
    parts.push(P(s.title || 'Untitled'));
    const tag =
      s.type === 'Video' ? ' [Video]' :
      s.type === 'Podcast' ? ' [Podcast episode]' : '';
    if (tag) parts[parts.length - 1] = P((s.title || 'Untitled') + tag);

    if (s.type === 'Book') {
      if (s.container) parts.push(P(s.container));
    } else if (s.type === 'Journal article') {
      if (s.container) parts.push(P(s.container + (s.pages ? ', ' + s.pages : '')));
    } else if (s.container) {
      parts.push(P(s.container));
    }
    if (s.url) parts.push(s.url.trim());
    return parts.filter(Boolean).join(' ');
  }

  function mla(s, a) {
    const parts = [];
    if (a) parts.push(a);

    if (s.type === 'Book') {
      parts.push(P(s.title || 'Untitled'));
      const pub = [s.container, s.year].filter(Boolean).join(', ');
      if (pub) parts.push(P(pub));
    } else {
      parts.push('“' + P(s.title || 'Untitled') + '”');
      const bits = [];
      if (s.container) bits.push(s.container);
      if (s.pages) bits.push('pp. ' + s.pages);
      if (s.year) bits.push(s.year);
      if (bits.length) parts.push(P(bits.join(', ')));
    }
    if (s.url) parts.push(s.url.trim());
    return parts.filter(Boolean).join(' ');
  }

  function chicago(s, a) {
    const parts = [];
    if (a) parts.push(a);

    if (s.type === 'Book') {
      parts.push(P(s.title || 'Untitled'));
      const pub = [s.container, s.year].filter(Boolean).join(', ');
      if (pub) parts.push(P(pub));
    } else {
      parts.push('“' + P(s.title || 'Untitled') + '”');
      if (s.type === 'Journal article') {
        const bits = (s.container || '') + (s.year ? ' (' + s.year + ')' : '') +
          (s.pages ? ': ' + s.pages : '');
        if (bits) parts.push(P(bits));
      } else {
        const bits = [s.container, s.year].filter(Boolean).join(', ');
        if (bits) parts.push(P(bits));
      }
      if (s.accessed) {
        const d = new Date(s.accessed + 'T12:00:00');
        const pretty = isNaN(d.getTime())
          ? s.accessed
          : d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
        parts.push('Accessed ' + pretty + '.');
      }
      if (s.url) parts.push(s.url.trim());
    }
    return parts.filter(Boolean).join(' ');
  }

  function formatEntry(source, style) {
    const a = authorsFor(style, source.author);
    if (style.indexOf('MLA') === 0) return mla(source, a);
    if (style.indexOf('Chicago') === 0) return chicago(source, a);
    return apa(source, a);
  }

  /* ---------- rendering ---------- */

  function render() {
    const style = els.style.value;
    if (!list.length) {
      els.list.innerHTML = '<p class="placeholder">Add a source to build your bibliography.</p>';
      rendered = [];
      renderedIds = [];
      return;
    }
    const sorted = list.slice().sort(function (x, y) {
      const ax = (x.author || x.title || '').toLowerCase();
      const ay = (y.author || y.title || '').toLowerCase();
      return ax.localeCompare(ay);
    });
    rendered = sorted.map(function (source) { return formatEntry(source, style); });
    renderedIds = sorted.map(function (source) { return source.id; });
    els.list.innerHTML = sorted.map(function (source, i) {
      return (
        '<div class="cit-item" data-i="' + i + '">' +
          '<div class="cit-text">' + ui.esc(rendered[i]) + '</div>' +
          '<div class="cit-actions">' +
            '<button type="button" data-act="copy" title="Copy citation">' + ui.icon('copy') + '</button>' +
            '<button type="button" data-act="del" class="danger" title="Remove">' + ui.icon('trash') + '</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function addSource() {
    const title = els.title.value.trim();
    if (!title) {
      ui.toast('A title is required for the citation.', 'err');
      els.title.focus();
      return;
    }
    list.unshift({
      id: SF.store.uid(),
      type: els.type.value,
      author: els.author.value.trim(),
      year: els.year.value.trim(),
      title: title,
      container: els.container.value.trim(),
      url: els.url.value.trim(),
      pages: els.pages.value.trim(),
      accessed: els.accessed.value
    });
    SF.store.citations(list);
    render();
    els.title.value = '';
    els.author.value = '';
    els.year.value = '';
    els.container.value = '';
    els.url.value = '';
    els.pages.value = '';
    els.accessed.value = '';
    els.title.focus();
    ui.toast('Citation added.', 'ok');
  }

  SF.pages.citations = {
    init: function () {
      if (mounted) return;
      mounted = true;
      els.type = ui.$('#cit-type');
      els.style = ui.$('#cit-style');
      els.author = ui.$('#cit-author');
      els.year = ui.$('#cit-year');
      els.title = ui.$('#cit-title');
      els.container = ui.$('#cit-container');
      els.url = ui.$('#cit-url');
      els.pages = ui.$('#cit-pages');
      els.accessed = ui.$('#cit-accessed');
      els.list = ui.$('#cit-list');

      list = SF.store.citations();
      render();

      ui.$('#cit-add').addEventListener('click', addSource);
      els.style.addEventListener('change', render);

      els.list.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const i = Number(btn.closest('.cit-item').getAttribute('data-i'));
        if (btn.getAttribute('data-act') === 'copy') {
          ui.copy(rendered[i]);
        } else {
          const id = renderedIds[i];
          list = list.filter(function (source) { return source.id !== id; });
          SF.store.citations(list);
          render();
          ui.toast('Citation removed.', 'ok');
        }
      });

      ui.$('#cit-copy-all').addEventListener('click', function () {
        if (!rendered.length) {
          ui.toast('No citations yet.', 'err');
          return;
        }
        ui.copy(rendered.join('\n\n'));
      });

      ui.$('#cit-clear').addEventListener('click', function () {
        if (!list.length) return;
        if (!window.confirm('Clear the whole bibliography?')) return;
        list = [];
        SF.store.citations(list);
        render();
      });

      [els.title, els.author, els.year].forEach(function (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            addSource();
          }
        });
      });
    }
  };
})();
