/* ==========================================================================
   StudyForge — (9) Assignment & Study Planner (tasks + Pomodoro)
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;
  SF.pages = SF.pages || {};

  let mounted = false;
  let tasks = [];
  let filter = 'open';

  const POMO = { focus: 25 * 60, break: 5 * 60 };
  const pomo = { mode: 'focus', left: POMO.focus, total: POMO.focus, running: false, interval: null, count: 0 };
  const els = {};

  function rank(priority) {
    return priority === 'High' ? 0 : priority === 'Low' ? 2 : 1;
  }

  function daysUntil(due) {
    if (!due) return null;
    const d = new Date(due + 'T00:00:00');
    const t = new Date(ui.todayISO() + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    return Math.round((d - t) / 86400000);
  }

  function dueLabel(due, done) {
    if (!due) return 'No due date';
    const days = daysUntil(due);
    if (days === null) return due;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days < 0) return done ? 'Was due ' + Math.abs(days) + 'd ago' : Math.abs(days) + 'd overdue';
    return 'Due in ' + days + 'd';
  }

  function save() {
    SF.store.planner(tasks);
  }

  function render() {
    const visible = tasks
      .filter(function (t) {
        if (filter === 'open') return !t.done;
        if (filter === 'done') return t.done;
        return true;
      })
      .sort(function (a, b) {
        const da = a.due || '9999-99-99';
        const db = b.due || '9999-99-99';
        if (da !== db) return da.localeCompare(db);
        return rank(a.priority) - rank(b.priority);
      });

    const open = tasks.filter(function (t) { return !t.done; }).length;
    const soon = tasks.filter(function (t) {
      if (t.done || !t.due) return false;
      const d = daysUntil(t.due);
      return d !== null && d >= 0 && d <= 7;
    }).length;
    const done = tasks.filter(function (t) { return t.done; }).length;

    els.stats.innerHTML =
      '<div class="stat"><b>' + open + '</b><span>Open</span></div>' +
      '<div class="stat"><b>' + soon + '</b><span>Due in 7 days</span></div>' +
      '<div class="stat"><b>' + done + '</b><span>Done</span></div>';

    if (!visible.length) {
      els.list.innerHTML = '<li class="empty-state">' +
        (filter === 'done' ? 'Nothing finished yet.' : filter === 'open' ? 'No open tasks. Add one on the left.' : 'Your list is empty.') +
        '</li>';
      return;
    }

    els.list.innerHTML = visible.map(function (t) {
      const days = daysUntil(t.due);
      const overdue = !t.done && days !== null && days < 0;
      return (
        '<li class="task' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
          '<button class="task-check" type="button" data-act="toggle" aria-label="Toggle done">' +
            ui.icon('check') +
          '</button>' +
          '<div class="task-main">' +
            '<div class="task-title">' + ui.esc(t.title) + '</div>' +
            '<div class="task-meta">' +
              (t.subject ? '<span class="tag">' + ui.esc(t.subject) + '</span>' : '') +
              '<span class="tag ' + t.priority.toLowerCase() + '">' + ui.esc(t.priority) + '</span>' +
              '<span class="tag' + (overdue ? ' overdue' : '') + '">' + ui.esc(dueLabel(t.due, t.done)) + '</span>' +
            '</div>' +
          '</div>' +
          '<button class="task-del" type="button" data-act="del" title="Delete task">' + ui.icon('trash') + '</button>' +
        '</li>'
      );
    }).join('');
  }

  function addTask() {
    const title = els.title.value.trim();
    if (!title) {
      ui.toast('Give the assignment a name.', 'err');
      els.title.focus();
      return;
    }
    tasks.unshift({
      id: SF.store.uid(),
      title: title,
      subject: els.subject.value.trim(),
      due: els.due.value,
      priority: els.priority.value,
      done: false
    });
    save();
    els.title.value = '';
    els.subject.value = '';
    render();
    els.title.focus();
  }

  /* ---------- pomodoro ---------- */

  function pomoDisplay() {
    const m = Math.floor(pomo.left / 60);
    const s = pomo.left % 60;
    els.pomoTime.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    els.pomoMode.textContent = (pomo.mode === 'focus' ? 'Focus · 25 min' : 'Break · 5 min');
    els.pomoBar.style.width = Math.min(100, Math.max(0, ((pomo.total - pomo.left) / pomo.total) * 100)) + '%';
    els.pomoStart.innerHTML = ui.icon(pomo.running ? 'pause' : 'play') + (pomo.running ? ' Pause' : ' Start');
    els.pomoCount.textContent = String(pomo.count);
  }

  function pomoStop() {
    pomo.running = false;
    if (pomo.interval) window.clearInterval(pomo.interval);
    pomo.interval = null;
    pomoDisplay();
  }

  function pomoSetMode(mode) {
    pomo.mode = mode;
    pomo.total = POMO[mode];
    pomo.left = POMO[mode];
    pomoStop();
  }

  function pomoTick() {
    pomo.left -= 1;
    if (pomo.left > 0) {
      pomoDisplay();
      return;
    }
    const finishedFocus = pomo.mode === 'focus';
    pomoStop();
    if (finishedFocus) {
      pomo.count += 1;
      SF.store.pomodoro({ date: ui.todayISO(), count: pomo.count });
      ui.toast('Focus session done. Take five.', 'ok');
      pomoSetMode('break');
    } else {
      ui.toast('Break over — back to focus.', 'ok');
      pomoSetMode('focus');
    }
  }

  function bindPomodoro() {
    const stored = SF.store.pomodoro();
    pomo.count = stored && stored.date === ui.todayISO() ? Number(stored.count) || 0 : 0;
    pomoDisplay();

    els.pomoStart.addEventListener('click', function () {
      if (pomo.running) {
        pomoStop();
        return;
      }
      pomo.running = true;
      pomo.interval = window.setInterval(pomoTick, 1000);
      pomoDisplay();
    });

    els.pomoReset.addEventListener('click', function () {
      pomoSetMode(pomo.mode);
    });

    els.pomoSkip.addEventListener('click', function () {
      pomoSetMode(pomo.mode === 'focus' ? 'break' : 'focus');
    });
  }

  SF.pages.planner = {
    init: function () {
      if (mounted) return;
      mounted = true;
      els.title = ui.$('#pl-title');
      els.subject = ui.$('#pl-subject');
      els.due = ui.$('#pl-due');
      els.priority = ui.$('#pl-priority');
      els.list = ui.$('#pl-list');
      els.stats = ui.$('#pl-stats');
      els.pomoTime = ui.$('#pomo-time');
      els.pomoMode = ui.$('#pomo-mode');
      els.pomoBar = ui.$('#pomo-bar');
      els.pomoStart = ui.$('#pomo-start');
      els.pomoReset = ui.$('#pomo-reset');
      els.pomoSkip = ui.$('#pomo-skip');
      els.pomoCount = ui.$('#pomo-count');

      tasks = SF.store.planner();
      els.due.value = ui.todayISO();
      render();
      bindPomodoro();

      ui.$('#pl-add').addEventListener('click', addTask);

      [els.title, els.subject].forEach(function (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            addTask();
          }
        });
      });

      ui.$('#pl-filter').addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-filter]');
        if (!btn) return;
        filter = btn.getAttribute('data-filter');
        ui.$$('#pl-filter button').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        render();
      });

      els.list.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const id = btn.closest('.task').getAttribute('data-id');
        const task = tasks.find(function (t) { return t.id === id; });
        if (!task) return;
        if (btn.getAttribute('data-act') === 'toggle') {
          task.done = !task.done;
        } else {
          tasks = tasks.filter(function (t) { return t.id !== id; });
        }
        save();
        render();
      });
    },
    onShow: render
  };
})();
