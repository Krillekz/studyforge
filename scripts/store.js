/* ==========================================================================
   StudyForge — local persistence (localStorage only, no backend)
   ========================================================================== */

(function () {
  const SF = window.SF;
  const NS = 'studyforge.';
  const isElectron = !!(window.studyforge && window.studyforge.isElectron);
  const MODE = (window.studyforge && window.studyforge.appMode) || 'public';

  SF.mode = MODE;
  SF.isElectron = isElectron;

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(NS + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[StudyForge] could not read', key, err);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('[StudyForge] could not save', key, err);
      if (SF.ui && SF.ui.toast) {
        SF.ui.toast('Local storage is full. Delete some history entries and try again.', 'err');
      }
      return false;
    }
  }

  function defaultSettings() {
    const providers = {};
    Object.keys(SF.config.providers).forEach(function (id) {
      const meta = SF.config.providers[id];
      providers[id] = {
        key: '',
        model: meta.textModel,
        visionModel: meta.visionModel,
        baseUrl: meta.baseUrl || ''
      };
    });
    return {
      provider: MODE === 'private' ? 'ollama' : 'openai',
      theme: 'dark',
      providers: providers
    };
  }

  function settings() {
    const stored = read('settings', null) || {};
    const base = defaultSettings();
    const merged = Object.assign({}, base, stored);
    merged.providers = {};
    Object.keys(base.providers).forEach(function (id) {
      merged.providers[id] = Object.assign({}, base.providers[id], (stored.providers || {})[id] || {});
    });
    if (MODE === 'private' && !stored.provider) merged.provider = 'ollama';
    return merged;
  }

  function saveSettings(next) {
    const current = settings();
    const merged = Object.assign({}, current, next);
    merged.providers = Object.assign({}, current.providers);
    if (next && next.providers) {
      Object.keys(next.providers).forEach(function (id) {
        merged.providers[id] = Object.assign({}, current.providers[id], next.providers[id]);
      });
    }
    write('settings', merged);
    return merged;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------------- History ---------------- */

  function history() {
    const list = read('history', []);
    return Array.isArray(list) ? list : [];
  }

  function saveHistory(list) {
    write('history', list.slice(0, 60));
  }

  function addHistory(entry) {
    const list = history();
    const item = Object.assign(
      { id: uid(), date: new Date().toISOString(), messages: [] },
      entry
    );
    /* Images are not persisted — data URLs would fill the 5 MB quota fast. */
    item.messages = (item.messages || []).map(function (m) {
      return { role: m.role, text: m.text || '', imageCount: (m.images || []).length };
    });
    list.unshift(item);
    saveHistory(list);
    return item;
  }

  function updateHistory(id, patch) {
    const list = history();
    const idx = list.findIndex(function (e) { return e.id === id; });
    if (idx === -1) return null;
    const next = Object.assign({}, list[idx], patch);
    if (patch.messages) {
      next.messages = patch.messages.map(function (m) {
        return { role: m.role, text: m.text || '', imageCount: (m.images || []).length || m.imageCount || 0 };
      });
    }
    list[idx] = next;
    saveHistory(list);
    return next;
  }

  function deleteHistory(id) {
    saveHistory(history().filter(function (e) { return e.id !== id; }));
  }

  function clearHistory() {
    write('history', []);
  }

  /* ---------------- Misc stores ---------------- */

  SF.store = {
    read: read,
    write: write,
    uid: uid,
    settings: settings,
    defaultSettings: defaultSettings,
    saveSettings: saveSettings,
    history: history,
    addHistory: addHistory,
    updateHistory: updateHistory,
    deleteHistory: deleteHistory,
    clearHistory: clearHistory,
    scratch: function (value) {
      if (value === undefined) return read('scratch', '');
      write('scratch', String(value));
    },
    planner: function (value) {
      if (value === undefined) {
        const list = read('planner', []);
        return Array.isArray(list) ? list : [];
      }
      write('planner', value);
    },
    citations: function (value) {
      if (value === undefined) {
        const list = read('citations', []);
        return Array.isArray(list) ? list : [];
      }
      write('citations', value);
    },
    deck: function (value) {
      if (value === undefined) return read('deck', null);
      write('deck', value);
    },
    pomodoro: function (value) {
      if (value === undefined) return read('pomodoro', { date: '', count: 0 });
      write('pomodoro', value);
    },
    calcHistory: function (value) {
      if (value === undefined) {
        const list = read('calc', []);
        return Array.isArray(list) ? list : [];
      }
      write('calc', value.slice(0, 12));
    }
  };
})();
