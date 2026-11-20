/* ==========================================================================
   StudyForge — home page sample demo
   Canned answers, typed out so visitors can see the output format before
   they add an API key. No network requests are made here.
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;

  const SAMPLES = [
    {
      id: 'quadratic',
      label: 'Quadratic equation',
      question: 'Solve 3x² − 7x + 2 = 0',
      answer:
        '**Problem.** Solve 3x² − 7x + 2 = 0.\n\n' +
        '**Step 1 — Read off the coefficients.** a = 3, b = −7, c = 2.\n\n' +
        '**Step 2 — Quadratic formula.**\n\n' +
        'x = ( −b ± √(b² − 4ac) ) / 2a\n\n' +
        '**Step 3 — Substitute and simplify.**\n\n' +
        '- b² − 4ac = 49 − 24 = 25\n' +
        '- √25 = 5\n' +
        '- x = ( 7 ± 5 ) / 6\n\n' +
        '**Step 4 — Split into the two roots.**\n\n' +
        '- x = 12 / 6 = **2**\n' +
        '- x = 2 / 6 = **1/3**\n\n' +
        '**Check.** 3(2)² − 7(2) + 2 = 12 − 14 + 2 = 0 ✓\n\n' +
        '3(1/3)² − 7(1/3) + 2 = 1/3 − 7/3 + 6/3 = 0 ✓\n\n' +
        '**Answer: x = 2 or x = 1/3**'
    },
    {
      id: 'photosynthesis',
      label: 'Explain photosynthesis',
      question: 'Explain photosynthesis like I am 12',
      answer:
        'Think of a plant as a tiny solar-powered kitchen.\n\n' +
        '- **Sunlight is the stove.** The plant does not eat its energy — it catches light with the green pigment **chlorophyll**.\n' +
        '- **Roots fetch the water.** Water travels up the stem like a straw.\n' +
        '- **Leaves breathe in carbon dioxide** through tiny pores called stomata.\n' +
        '- **The kitchen builds sugar.** Light energy is used to join water and carbon dioxide into glucose — the plant’s food.\n' +
        '- **Oxygen is the leftover**, and it leaves through the same pores. That is the oxygen we breathe.\n\n' +
        '**The recipe:** 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂\n\n' +
        '**One-line takeaway:** plants turn light, water and air into food, and release the oxygen as a by-product.'
    },
    {
      id: 'ww1',
      label: 'Causes of World War I',
      question: 'Summarize the causes of World War I in 5 bullets',
      answer:
        '- **Alliances.** Europe split into two armed camps — the Triple Alliance and the Triple Entente — so a local quarrel could drag every great power in.\n' +
        '- **Militarism.** Britain and Germany raced to build dreadnoughts, and generals had war plans ready years before any shot was fired.\n' +
        '- **Imperialism.** Rival empires competed for colonies, markets and prestige, especially in Africa and the Balkans.\n' +
        '- **Nationalism.** Ethnic groups inside Austria-Hungary and the Ottoman Empire wanted their own states, which made the region unstable.\n' +
        '- **The spark.** The assassination of Archduke Franz Ferdinand in Sarajevo on 28 June 1914 triggered the alliance system within five weeks.\n\n' +
        '**Exam tip:** alliances and the assassination explain *how fast* the war spread; militarism, imperialism and nationalism explain *why Europe was ready* to fight.'
    }
  ];

  let timer = null;
  let buttonsHost = null;
  let output = null;
  let active = null;

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
    if (!output) return;
    output.classList.remove('streaming');
    const caret = output.querySelector('.stream-caret');
    if (caret && caret.parentNode) caret.parentNode.removeChild(caret);
  }

  function play(sample) {
    stop();
    active = sample.id;
    if (buttonsHost) {
      ui.$$('[data-sample]', buttonsHost).forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-sample') === sample.id);
      });
    }
    if (!output) return;

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let shown = 0;

    if (reduced) {
      output.innerHTML = ui.md(sample.answer);
      return;
    }

    output.classList.add('streaming');
    output.innerHTML = '<p class="demo-question">' + ui.esc(sample.question) + '</p><div class="demo-answer"></div>';
    const target = output.querySelector('.demo-answer');
    const started = Date.now();

    /* Advance by elapsed time, not by tick count, so a throttled background
       tab still finishes the sample promptly instead of crawling. */
    timer = window.setInterval(function () {
      const elapsed = Date.now() - started;
      shown = Math.min(sample.answer.length, Math.floor(elapsed / 16) * 4);
      target.innerHTML = ui.md(sample.answer.slice(0, shown)) + '<span class="stream-caret"></span>';
      if (shown >= sample.answer.length) stop();
    }, 16);
  }

  function init() {
    buttonsHost = document.querySelector('#demo-samples');
    output = document.querySelector('#demo-output');
    if (!buttonsHost || !output) return;

    buttonsHost.innerHTML = SAMPLES.map(function (s) {
      return '<button type="button" class="demo-chip" data-sample="' + s.id + '">' +
        ui.esc(s.label) + '</button>';
    }).join('');

    buttonsHost.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-sample]');
      if (!btn) return;
      const sample = SAMPLES.find(function (s) { return s.id === btn.getAttribute('data-sample'); });
      if (sample) play(sample);
    });

    if (active) play(SAMPLES.find(function (s) { return s.id === active; }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
