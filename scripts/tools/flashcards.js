/* ==========================================================================
   StudyForge — (5) Flashcard & Practice Quiz Generator
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;
  SF.pages = SF.pages || {};

  let mounted = false;
  let deck = null;
  let idx = 0;
  let flipped = false;
  let tab = 'cards';
  let quiz = { i: 0, selected: null, checked: false, answers: [] };
  const els = {};

  function saveDeck() {
    SF.store.deck(deck ? { topic: deck.topic, cards: deck.cards, quiz: deck.quiz, date: deck.date } : null);
  }

  function renderStatus() {
    if (!deck) {
      els.status.textContent = '';
      return;
    }
    const src = deck.topic ? 'Deck: ' + ui.truncate(deck.topic, 60) : 'Deck';
    els.status.textContent = src + ' · ' + deck.cards.length + ' cards · ' + deck.quiz.length + ' quiz questions';
  }

  function renderDeck() {
    if (!deck || !deck.cards.length) {
      els.deck.innerHTML = '<p class="placeholder">Generate a deck to start studying.</p>';
      els.controls.hidden = true;
      return;
    }
    idx = Math.min(idx, deck.cards.length - 1);
    const card = deck.cards[idx];
    const face = flipped
      ? '<div class="fc-face fc-back">' + ui.md(card.back) + '</div>'
      : '<div class="fc-face">' + ui.md(card.front) + '</div>';
    els.deck.innerHTML =
      '<div class="flashcard" data-flip="1" role="button" tabindex="0" aria-label="Flip card">' +
        face +
        '<span class="fc-hint">' + (flipped ? 'Click to see the prompt' : 'Click to reveal the answer') + '</span>' +
      '</div>';
    els.controls.hidden = false;
    els.pos.textContent = (idx + 1) + ' / ' + deck.cards.length;
  }

  function renderQuiz() {
    if (!deck || !deck.quiz.length) {
      els.quiz.innerHTML = '<p class="placeholder">The quiz appears after you generate a deck.</p>';
      return;
    }

    if (quiz.i >= deck.quiz.length) {
      const correct = quiz.answers.filter(function (a, i) {
        return a === deck.quiz[i].answer;
      }).length;
      const pct = Math.round((correct / deck.quiz.length) * 100);
      els.quiz.innerHTML =
        '<div class="quiz-q">Deck complete</div>' +
        '<div class="quiz-score">You scored <strong>' + correct + ' / ' + deck.quiz.length + '</strong> (' + pct + '%)</div>' +
        '<p class="hint">' + (pct >= 80 ? 'Solid. Run it again tomorrow for spaced practice.' : 'Review the cards, then retake the quiz.') + '</p>' +
        '<div><button class="btn primary sm" type="button" data-restart="1">Restart quiz</button></div>';
      return;
    }

    const q = deck.quiz[quiz.i];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const opts = q.options.map(function (option, i) {
      let cls = 'quiz-opt';
      if (quiz.checked) {
        if (i === q.answer) cls += ' correct';
        else if (i === quiz.selected) cls += ' wrong';
      } else if (i === quiz.selected) {
        cls += ' selected';
      }
      return (
        '<button type="button" class="' + cls + '" data-opt="' + i + '">' +
          '<span class="opt-key">' + (letters[i] || i + 1) + '</span>' +
          '<span>' + ui.esc(option) + '</span>' +
        '</button>'
      );
    }).join('');

    els.quiz.innerHTML =
      '<div class="quiz-foot"><span class="hint">Question ' + (quiz.i + 1) + ' of ' + deck.quiz.length + '</span>' +
        '<span class="hint">Score so far: ' +
          quiz.answers.filter(function (a, i) { return a === deck.quiz[i].answer; }).length +
        '</span></div>' +
      '<div class="quiz-q">' + ui.esc(q.question) + '</div>' +
      '<div class="quiz-opts">' + opts + '</div>' +
      (quiz.checked && q.explain ? '<div class="quiz-explain">' + ui.md(q.explain) + '</div>' : '') +
      '<div class="quiz-foot">' +
        (quiz.checked
          ? '<button class="btn primary sm" type="button" data-next="1">' +
              (quiz.i + 1 >= deck.quiz.length ? 'See score' : 'Next question') + '</button>'
          : '<button class="btn primary sm" type="button" data-check="1"' +
            (quiz.selected === null ? ' disabled' : '') + '>Check answer</button>') +
        '<span class="hint">' + (quiz.checked ? (quiz.selected === q.answer ? 'Correct' : 'Not quite') : 'Pick one option') + '</span>' +
      '</div>';
  }

  function renderAll() {
    renderStatus();
    renderDeck();
    renderQuiz();
    els.deck.hidden = tab !== 'cards';
    els.controls.hidden = tab !== 'cards' || !deck;
    els.quiz.hidden = tab !== 'quiz';
  }

  function setTab(next) {
    tab = next;
    ui.$$('#fc-tabs button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === next);
    });
    renderAll();
  }

  async function generate() {
    const topic = els.input.value.trim();
    if (!topic) {
      ui.toast('Give it a topic or paste some notes.', 'err');
      els.input.focus();
      return;
    }
    if (!SF.ai.isConfigured()) {
      ui.toast('Add an AI provider key first.', 'err');
      if (SF.openSettings) SF.openSettings();
      return;
    }

    const count = Number(els.count.value) || 12;
    const qCount = Math.max(4, Math.min(8, Math.round(count / 2)));
    const system =
      'You build study decks. You output ONLY valid JSON — no prose, no markdown fences, no trailing text. ' +
      'Every fact must be accurate and self-contained.';
    const prompt =
      'Create a study deck about:\n"""\n' + topic.slice(0, 8000) + '\n"""\n\n' +
      'Level: ' + els.level.value + '.\n' +
      'Return exactly ' + count + ' flashcards and exactly ' + qCount + ' multiple-choice questions.\n' +
      'JSON shape: {"cards":[{"front":"prompt or term","back":"concise answer"}],' +
      '"quiz":[{"question":"...","options":["a","b","c","d"],"answer":0,"explain":"why"}]}\n' +
      'Rules: "answer" is the 0-based index of the correct option; options are short; ' +
      'only one option is correct; explanations are one sentence.';

    try {
      const res = await ui.busy(els.generateBtn, function () {
        return SF.ai.chat({ system: system, prompt: prompt });
      });
      const data = ui.parseJsonLoose(res.text);
      const cards = (Array.isArray(data.cards) ? data.cards : [])
        .filter(function (c) { return c && c.front && c.back; })
        .map(function (c) { return { front: String(c.front), back: String(c.back) }; })
        .slice(0, count);
      const items = (Array.isArray(data.quiz) ? data.quiz : [])
        .filter(function (q) { return q && q.question && Array.isArray(q.options) && q.options.length >= 2; })
        .map(function (q) {
          const answer = Number(q.answer);
          return {
            question: String(q.question),
            options: q.options.map(String).slice(0, 6),
            answer: Number.isInteger(answer) && answer >= 0 && answer < q.options.length ? answer : 0,
            explain: q.explain ? String(q.explain) : ''
          };
        })
        .slice(0, qCount);

      if (!cards.length) throw new Error('The model did not return usable cards. Try again.');

      deck = { topic: topic, cards: cards, quiz: items, date: new Date().toISOString() };
      idx = 0;
      flipped = false;
      quiz = { i: 0, selected: null, checked: false, answers: [] };
      saveDeck();
      renderAll();
      setTab('cards');
      ui.toast('Deck ready: ' + cards.length + ' cards.', 'ok');
    } catch (err) {
      const message = err instanceof SyntaxError
        ? 'The model returned malformed JSON. Try generating again.'
        : err.message || 'Could not generate the deck.';
      ui.toast(message, 'err');
    }
  }

  SF.pages.flashcards = {
    init: function () {
      if (mounted) return;
      mounted = true;
      els.input = ui.$('#fc-input');
      els.count = ui.$('#fc-count');
      els.level = ui.$('#fc-level');
      els.generateBtn = ui.$('#fc-generate');
      els.status = ui.$('#fc-status');
      els.deck = ui.$('#fc-deck');
      els.quiz = ui.$('#fc-quiz');
      els.controls = ui.$('#fc-controls');
      els.pos = ui.$('#fc-pos');

      deck = SF.store.deck();
      if (deck && deck.cards) renderAll();
      else renderDeck();

      els.generateBtn.addEventListener('click', generate);

      ui.$('#fc-tabs').addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-tab]');
        if (btn) setTab(btn.getAttribute('data-tab'));
      });

      els.deck.addEventListener('click', function (e) {
        if (e.target.closest('.flashcard')) {
          flipped = !flipped;
          renderDeck();
        }
      });
      els.deck.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.flashcard')) {
          e.preventDefault();
          flipped = !flipped;
          renderDeck();
        }
      });

      ui.$('#fc-prev').addEventListener('click', function () {
        if (!deck) return;
        idx = (idx - 1 + deck.cards.length) % deck.cards.length;
        flipped = false;
        renderDeck();
      });
      ui.$('#fc-next').addEventListener('click', function () {
        if (!deck) return;
        idx = (idx + 1) % deck.cards.length;
        flipped = false;
        renderDeck();
      });
      ui.$('#fc-shuffle').addEventListener('click', function () {
        if (!deck) return;
        for (let i = deck.cards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = deck.cards[i];
          deck.cards[i] = deck.cards[j];
          deck.cards[j] = tmp;
        }
        idx = 0;
        flipped = false;
        saveDeck();
        renderDeck();
        ui.toast('Deck shuffled.', 'ok');
      });

      els.quiz.addEventListener('click', function (e) {
        const opt = e.target.closest('[data-opt]');
        if (opt && !quiz.checked) {
          quiz.selected = Number(opt.getAttribute('data-opt'));
          renderQuiz();
          return;
        }
        if (e.target.closest('[data-check]')) {
          if (quiz.selected === null) return;
          quiz.checked = true;
          quiz.answers[quiz.i] = quiz.selected;
          renderQuiz();
          return;
        }
        if (e.target.closest('[data-next]')) {
          quiz.i += 1;
          quiz.selected = null;
          quiz.checked = false;
          renderQuiz();
          return;
        }
        if (e.target.closest('[data-restart]')) {
          quiz = { i: 0, selected: null, checked: false, answers: [] };
          renderQuiz();
        }
      });

      ui.$('#fc-status').textContent = deck ? '' : '';
      renderStatus();
    }
  };
})();
