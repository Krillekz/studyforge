/* ==========================================================================
   StudyForge — (10) Quick-Reference Cheat Sheet Hub
   Static data, no network. Formulas, periodic table, grammar, timelines.
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;
  SF.pages = SF.pages || {};

  let mounted = false;
  const els = {};

  const FORMULAS = [
    {
      group: 'Algebra',
      items: [
        { name: 'Quadratic formula', expr: 'x = (−b ± √(b² − 4ac)) / 2a' },
        { name: 'Discriminant', expr: 'Δ = b² − 4ac' },
        { name: 'Vertex of a parabola', expr: 'x = −b / 2a' },
        { name: 'Slope', expr: 'm = (y₂ − y₁) / (x₂ − x₁)' },
        { name: 'Point-slope form', expr: 'y − y₁ = m(x − x₁)' },
        { name: 'Distance formula', expr: 'd = √((x₂−x₁)² + (y₂−y₁)²)' },
        { name: 'Midpoint', expr: '((x₁+x₂)/2, (y₁+y₂)/2)' },
        { name: 'Exponent product', expr: 'aᵐ · aⁿ = aᵐ⁺ⁿ' },
        { name: 'Power of a power', expr: '(aᵐ)ⁿ = aᵐⁿ' },
        { name: 'Negative exponent', expr: 'a⁻ⁿ = 1 / aⁿ' },
        { name: 'Log product', expr: 'log(ab) = log a + log b' },
        { name: 'Log power', expr: 'log(aⁿ) = n log a' },
        { name: 'Change of base', expr: 'log_b a = ln a / ln b' },
        { name: 'Difference of squares', expr: 'a² − b² = (a−b)(a+b)' },
        { name: 'Arithmetic sequence', expr: 'aₙ = a₁ + (n−1)d' },
        { name: 'Geometric sequence', expr: 'aₙ = a₁ rⁿ⁻¹' },
        { name: 'Compound interest', expr: 'A = P(1 + r/n)ⁿᵗ' }
      ]
    },
    {
      group: 'Geometry',
      items: [
        { name: 'Circle area & circumference', expr: 'A = πr²,  C = 2πr' },
        { name: 'Triangle area', expr: 'A = ½ b h' },
        { name: "Heron's formula", expr: 'A = √(s(s−a)(s−b)(s−c))' },
        { name: 'Trapezoid area', expr: 'A = ½(b₁ + b₂)h' },
        { name: 'Parallelogram area', expr: 'A = b h' },
        { name: 'Pythagorean theorem', expr: 'a² + b² = c²' },
        { name: 'Rectangle diagonal', expr: 'd = √(l² + w²)' },
        { name: 'Sphere volume', expr: 'V = 4/3 πr³' },
        { name: 'Sphere surface area', expr: 'S = 4πr²' },
        { name: 'Cylinder volume', expr: 'V = πr²h' },
        { name: 'Cone volume', expr: 'V = ⅓ πr²h' },
        { name: 'Sector area', expr: 'A = ½ r²θ' },
        { name: 'Arc length', expr: 's = rθ' }
      ]
    },
    {
      group: 'Trigonometry',
      items: [
        { name: 'Pythagorean identity', expr: 'sin²θ + cos²θ = 1' },
        { name: 'Tangent', expr: 'tan θ = sin θ / cos θ' },
        { name: 'Double angle (sine)', expr: 'sin 2θ = 2 sin θ cos θ' },
        { name: 'Double angle (cosine)', expr: 'cos 2θ = cos²θ − sin²θ' },
        { name: 'Law of sines', expr: 'a / sin A = b / sin B = c / sin C' },
        { name: 'Law of cosines', expr: 'c² = a² + b² − 2ab cos C' },
        { name: 'Degrees to radians', expr: 'radians = degrees × π / 180' },
        { name: 'Sine wave', expr: 'y = A sin(B(x − C)) + D' }
      ]
    },
    {
      group: 'Calculus',
      items: [
        { name: 'Power rule', expr: 'd/dx xⁿ = n xⁿ⁻¹' },
        { name: 'Product rule', expr: "(fg)′ = f′g + fg′" },
        { name: 'Quotient rule', expr: "(f/g)′ = (f′g − fg′) / g²" },
        { name: 'Chain rule', expr: "d/dx f(g(x)) = f′(g(x)) · g′(x)" },
        { name: 'Derivative of sine', expr: 'd/dx sin x = cos x' },
        { name: 'Derivative of eˣ', expr: 'd/dx eˣ = eˣ' },
        { name: 'Derivative of ln x', expr: 'd/dx ln x = 1/x' },
        { name: 'Power rule (integral)', expr: '∫ xⁿ dx = xⁿ⁺¹/(n+1) + C' },
        { name: 'Fundamental theorem', expr: '∫ₐᵇ f(x) dx = F(b) − F(a)' },
        { name: 'Limit of sin x / x', expr: 'lim(x→0) sin x / x = 1' },
        { name: 'Integration by parts', expr: '∫ u dv = uv − ∫ v du' }
      ]
    },
    {
      group: 'Physics essentials',
      items: [
        { name: 'Newton’s second law', expr: 'F = m a' },
        { name: 'Kinematics', expr: 'v = u + at' },
        { name: 'Displacement', expr: 's = ut + ½at²' },
        { name: 'Work', expr: 'W = F d cos θ' },
        { name: 'Kinetic energy', expr: 'KE = ½ m v²' },
        { name: 'Ohm’s law', expr: 'V = I R' },
        { name: 'Electrical power', expr: 'P = I V' },
        { name: 'Wave speed', expr: 'v = f λ' }
      ]
    },
    {
      group: 'Chemistry essentials',
      items: [
        { name: 'Moles from mass', expr: 'n = m / M' },
        { name: 'Molarity', expr: 'M = mol solute / L solution' },
        { name: 'Ideal gas law', expr: 'P V = n R T' },
        { name: 'Dilution', expr: 'M₁V₁ = M₂V₂' },
        { name: 'Percent yield', expr: '(actual / theoretical) × 100' },
        { name: 'pH', expr: 'pH = −log[H⁺]' }
      ]
    }
  ];

  const ELEMENTS = [
    'H Hydrogen', 'He Helium', 'Li Lithium', 'Be Beryllium', 'B Boron', 'C Carbon',
    'N Nitrogen', 'O Oxygen', 'F Fluorine', 'Ne Neon', 'Na Sodium', 'Mg Magnesium',
    'Al Aluminium', 'Si Silicon', 'P Phosphorus', 'S Sulfur', 'Cl Chlorine', 'Ar Argon',
    'K Potassium', 'Ca Calcium', 'Sc Scandium', 'Ti Titanium', 'V Vanadium', 'Cr Chromium',
    'Mn Manganese', 'Fe Iron', 'Co Cobalt', 'Ni Nickel', 'Cu Copper', 'Zn Zinc',
    'Ga Gallium', 'Ge Germanium', 'As Arsenic', 'Se Selenium', 'Br Bromine', 'Kr Krypton',
    'Rb Rubidium', 'Sr Strontium', 'Y Yttrium', 'Zr Zirconium', 'Nb Niobium', 'Mo Molybdenum',
    'Tc Technetium', 'Ru Ruthenium', 'Rh Rhodium', 'Pd Palladium', 'Ag Silver', 'Cd Cadmium',
    'In Indium', 'Sn Tin', 'Sb Antimony', 'Te Tellurium', 'I Iodine', 'Xe Xenon',
    'Cs Caesium', 'Ba Barium', 'La Lanthanum', 'Ce Cerium', 'Pr Praseodymium', 'Nd Neodymium',
    'Pm Promethium', 'Sm Samarium', 'Eu Europium', 'Gd Gadolinium', 'Tb Terbium', 'Dy Dysprosium',
    'Ho Holmium', 'Er Erbium', 'Tm Thulium', 'Yb Ytterbium', 'Lu Lutetium', 'Hf Hafnium',
    'Ta Tantalum', 'W Tungsten', 'Re Rhenium', 'Os Osmium', 'Ir Iridium', 'Pt Platinum',
    'Au Gold', 'Hg Mercury', 'Tl Thallium', 'Pb Lead', 'Bi Bismuth', 'Po Polonium',
    'At Astatine', 'Rn Radon', 'Fr Francium', 'Ra Radium', 'Ac Actinium', 'Th Thorium',
    'Pa Protactinium', 'U Uranium', 'Np Neptunium', 'Pu Plutonium', 'Am Americium', 'Cm Curium',
    'Bk Berkelium', 'Cf Californium', 'Es Einsteinium', 'Fm Fermium', 'Md Mendelevium', 'No Nobelium',
    'Lr Lawrencium', 'Rf Rutherfordium', 'Db Dubnium', 'Sg Seaborgium', 'Bh Bohrium', 'Hs Hassium',
    'Mt Meitnerium', 'Ds Darmstadtium', 'Rg Roentgenium', 'Cn Copernicium', 'Nh Nihonium', 'Fl Flerovium',
    'Mc Moscovium', 'Lv Livermorium', 'Ts Tennessine', 'Og Oganesson'
  ];

  const GRAMMAR = [
    { title: 'Its vs. it’s', body: '“Its” is possessive; “it’s” means “it is” or “it has”.', example: 'The dog wagged <em>its</em> tail. / <em>It’s</em> raining.' },
    { title: 'Their / there / they’re', body: 'Possession, place, and “they are”.', example: '<em>Their</em> books are over <em>there</em>; <em>they’re</em> late.' },
    { title: 'Affect vs. effect', body: '“Affect” is usually a verb; “effect” is usually a noun.', example: 'The news <em>affected</em> her. The <em>effect</em> was immediate.' },
    { title: 'Comma splices', body: 'Two complete sentences cannot be joined by a comma alone. Use a period, semicolon, or a conjunction.', example: 'Wrong: I was tired, I went to bed. Right: I was tired, so I went to bed.' },
    { title: 'Semicolons', body: 'Join two closely related independent clauses; also separate list items that already contain commas.', example: 'We finished early; the review still helped.' },
    { title: 'Subject–verb agreement', body: 'The verb agrees with the subject, not with a phrase between them.', example: 'The <em>box</em> of papers <em>is</em> heavy.' },
    { title: 'Who vs. whom', body: '“Who” is a subject; “whom” is an object. Test with he/him.', example: '<em>Who</em> called? To <em>whom</em> should I send it?' },
    { title: 'Parallel structure', body: 'Items in a list or comparison must share the same grammatical form.', example: 'She likes hiking, swimming, and <em>cycling</em> — not “to cycle”.' },
    { title: 'Dangling modifiers', body: 'The opening phrase must describe the subject of the main clause.', example: 'Wrong: Walking home, the rain started. Right: Walking home, I got caught in the rain.' },
    { title: 'Apostrophes', body: 'Plurals never take an apostrophe; possessives do.', example: 'The <em>1990s</em> were loud. The <em>1990s’</em> music still sells.' },
    { title: 'Active voice', body: 'Prefer subject → verb → object; it is shorter and clearer.', example: 'Active: The committee approved the plan. Passive: The plan was approved.' },
    { title: 'Avoid double negatives', body: 'Two negatives cancel each other in standard English.', example: 'Wrong: I don’t have no time. Right: I don’t have any time.' }
  ];

  const TIMELINE = [
    {
      title: 'Ancient Civilisations',
      era: 'c. 3500 BCE – 500 BCE',
      events: [
        'c. 3200 BCE — Writing develops in Mesopotamia (cuneiform)',
        'c. 2560 BCE — Great Pyramid of Giza completed',
        'c. 1754 BCE — Code of Hammurabi in Babylon',
        'c. 1500 BCE — Vedic period begins in India',
        'c. 1046 BCE — Zhou dynasty begins in China'
      ]
    },
    {
      title: 'Classical World',
      era: '500 BCE – 500 CE',
      events: [
        '508 BCE — Athenian democracy established',
        '336–323 BCE — Alexander the Great’s campaigns',
        '221 BCE — Qin unifies China',
        '27 BCE — Roman Empire begins under Augustus',
        '476 CE — Western Roman Empire falls'
      ]
    },
    {
      title: 'Medieval Period',
      era: '500 – 1400',
      events: [
        '622 — Hijra marks the start of the Islamic calendar',
        '800 — Charlemagne crowned Holy Roman Emperor',
        '1066 — Norman conquest of England',
        '1215 — Magna Carta sealed',
        '1347–1351 — Black Death across Europe'
      ]
    },
    {
      title: 'Renaissance & Exploration',
      era: '1400 – 1600',
      events: [
        'c. 1440 — Gutenberg’s printing press',
        '1492 — Columbus reaches the Americas',
        '1517 — Luther’s Ninety-five Theses',
        '1543 — Copernicus publishes heliocentric theory',
        '1599 — Shakespeare’s Globe Theatre opens'
      ]
    },
    {
      title: 'Revolutions & Industry',
      era: '1600 – 1900',
      events: [
        '1687 — Newton publishes the Principia',
        '1776 — US Declaration of Independence',
        '1789 — French Revolution begins',
        'c. 1760–1840 — Industrial Revolution',
        '1859 — Darwin publishes On the Origin of Species'
      ]
    },
    {
      title: 'Modern Era',
      era: '1900 – present',
      events: [
        '1914–1918 — World War I',
        '1939–1945 — World War II',
        '1947–1991 — Cold War',
        '1969 — Apollo 11 Moon landing',
        '1989 — Berlin Wall falls',
        '1991 — Public World Wide Web launched'
      ]
    }
  ];

  function renderFormulas() {
    els.formulas.innerHTML = FORMULAS.map(function (block) {
      return (
        '<div class="formula-block">' +
          '<h3>' + ui.esc(block.group) + '</h3>' +
          '<div class="formula-grid">' +
            block.items.map(function (item) {
              return '<div class="formula-card"><b>' + ui.esc(item.name) + '</b><code>' + ui.esc(item.expr) + '</code></div>';
            }).join('') +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderElements(query) {
    const q = String(query || '').trim().toLowerCase();
    const rows = ELEMENTS.map(function (entry, index) {
      const bits = entry.split(' ');
      return { number: index + 1, symbol: bits[0], name: bits.slice(1).join(' ') };
    }).filter(function (el) {
      if (!q) return true;
      return el.name.toLowerCase().indexOf(q) !== -1 ||
        el.symbol.toLowerCase().indexOf(q) !== -1 ||
        String(el.number) === q;
    });

    if (!rows.length) {
      els.elements.innerHTML = '<p class="placeholder">No element matches “' + ui.esc(query) + '”.</p>';
      return;
    }
    els.elements.innerHTML = rows.map(function (el) {
      return (
        '<div class="elem" title="' + ui.esc(el.name + ' · atomic number ' + el.number) + '">' +
          '<span class="num">' + el.number + '</span>' +
          '<span class="sym">' + ui.esc(el.symbol) + '</span>' +
          '<span class="nm">' + ui.esc(el.name) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderGrammar() {
    els.grammar.innerHTML =
      '<ul class="rule-list">' +
        GRAMMAR.map(function (rule) {
          return '<li><b>' + ui.esc(rule.title) + '</b><span>' + ui.esc(rule.body) +
            ' <em>' + rule.example + '</em></span></li>';
        }).join('') +
      '</ul>';
  }

  function renderTimeline() {
    els.timeline.innerHTML =
      '<div class="timeline">' +
        TIMELINE.map(function (group) {
          return (
            '<div class="tl-group">' +
              '<h3>' + ui.esc(group.title) + '</h3>' +
              '<div class="era">' + ui.esc(group.era) + '</div>' +
              '<ul>' + group.events.map(function (event) {
                return '<li>' + ui.esc(event) + '</li>';
              }).join('') + '</ul>' +
            '</div>'
          );
        }).join('') +
      '</div>';
  }

  SF.pages.cheatsheet = {
    init: function () {
      if (mounted) return;
      mounted = true;
      els.formulas = ui.$('#cs-formulas');
      els.periodic = ui.$('#cs-periodic');
      els.elements = ui.$('#elem-grid');
      els.grammar = ui.$('#cs-grammar');
      els.timeline = ui.$('#cs-timeline');

      renderFormulas();
      renderElements('');
      renderGrammar();
      renderTimeline();

      ui.$('#cs-tabs').addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-tab]');
        if (!btn) return;
        const tab = btn.getAttribute('data-tab');
        ui.$$('#cs-tabs button').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        [
          ['formulas', els.formulas],
          ['periodic', els.periodic],
          ['grammar', els.grammar],
          ['timeline', els.timeline]
        ].forEach(function (pair) {
          pair[1].hidden = pair[0] !== tab;
        });
        if (tab === 'periodic') ui.$('#cs-search').focus();
      });

      ui.$('#cs-search').addEventListener('input', function (e) {
        renderElements(e.target.value);
      });
    }
  };
})();
