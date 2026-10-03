/**
 * e-chemEd Unit 2 Chem-Arcade Suite Logic
 * Module 1: Battery & Solar Matchmaker Puzzle (6 pairs)
 * Module 2: Electrochemical Cell Builder (Lead-Acid & Li-Ion)
 * Module 3: Circuit Tycoon Trivia Quiz (6 questions with efficiency visualization)
 * Includes global XP scoring, timer, and celebratory completion modal.
 */

(function () {
  'use strict';

  let globalScore = 0;
  let secondsElapsed = 0;
  let timerInterval = null;
  let activeGame = 'hub';

  // Track completion of all 3 distinct arcade modules
  const completedModules = {
    matchmaker: false,
    builder: false,
    tycoon: false
  };

  /* ==========================================================================
     GLOBAL HUD & NAVIGATION
     ========================================================================== */
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      secondsElapsed++;
      const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
      const secs = (secondsElapsed % 60).toString().padStart(2, '0');
      const timerEl = document.getElementById('timer-display');
      if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  function updateModuleProgressHUD() {
    const cleared = Object.values(completedModules).filter(Boolean).length;
    const badge = document.getElementById('modules-progress-badge');
    if (badge) {
      badge.textContent = `Modules Cleared: ${cleared} / 3`;
      if (cleared === 3) {
        badge.className = 'badge badge-live';
      } else {
        badge.className = 'badge badge-accent';
      }
    }
  }

  function markModuleComplete(moduleKey, moduleTitle) {
    completedModules[moduleKey] = true;
    updateModuleProgressHUD();

    // Update status badge on hub card
    const hubBadge = document.getElementById(`hub-badge-${moduleKey}`);
    if (hubBadge) {
      hubBadge.textContent = "COMPLETED \u2713";
      hubBadge.className = "badge badge-live";
    }

    const allCompleted = completedModules.matchmaker && completedModules.builder && completedModules.tycoon;

    if (allCompleted) {
      setTimeout(() => {
        checkGameCompletion('Magnificent! You have conquered ALL 3 arcade modules: Matchmaker, Cell Builder, and Circuit Tycoon!');
      }, 700);
    } else {
      const cleared = Object.values(completedModules).filter(Boolean).length;
      showModuleInterimToast(moduleKey, moduleTitle, cleared);
    }
  }

  function showModuleInterimToast(moduleKey, moduleTitle, cleared) {
    if (moduleKey === 'matchmaker') {
      showMatchmakerFeedback(`\u2713 ${moduleTitle} Cleared! (${cleared}/3 Modules Finished). Return to Arcade Hub to complete the remaining challenges!`, true);
    } else if (moduleKey === 'builder') {
      const resDesc = document.getElementById('builder-result-desc');
      if (resDesc) {
        resDesc.innerHTML += `<br><br><strong style="color:var(--brand-accent);">\u2713 Cell Builder Module Cleared! (${cleared}/3 Modules Finished). Return to Arcade Hub to master all challenges.</strong>`;
      }
    } else if (moduleKey === 'tycoon') {
      const explBox = document.getElementById('tycoon-expl-box');
      const explText = document.getElementById('tycoon-expl-text');
      if (explBox && explText) {
        explBox.classList.remove('hidden');
        explText.innerHTML = `<strong style="color:var(--brand-accent); font-size:var(--text-sm);">\u2713 Circuit Tycoon Cleared! (${cleared}/3 Modules Finished). Return to Arcade Hub to conquer all challenges!</strong><br><br>` + explText.innerHTML;
      }
    }
  }

  window.switchGame = function (gameId) {
    activeGame = gameId;
    const views = ['hub', 'matchmaker', 'builder', 'tycoon'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) {
        if (v === gameId) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function addScore(pts) {
    const oldScore = globalScore;
    globalScore += pts;
    const scoreEl = document.getElementById('global-score');
    if (scoreEl && window.EchemMotion) {
      window.EchemMotion.animateNumber(scoreEl, oldScore, globalScore, 400);
    } else if (scoreEl) {
      scoreEl.textContent = globalScore;
    }
    if (window.EchemProgress) window.EchemProgress.markActivity(2, 'gamePlayed');
  }

  /* ==========================================================================
     MODULE 1: BATTERY & SOLAR MATCHMAKER
     ========================================================================== */
  const matchPairs = [
    { id: 1, term: "Lead-Acid Anode", definition: "Sponge lead (Pb) electrode that undergoes oxidation during cell discharge." },
    { id: 2, term: "P-N Junction", definition: "Semiconductor boundary where sunlight generates electron-hole pairs in solar photovoltaic cells." },
    { id: 3, term: "Monocrystalline Solar", definition: "Solar cell sliced from a single continuous silicon crystal ingot with highest commercial efficiency." },
    { id: 4, term: "EDLC Ultracapacitor", definition: "Electrostatic energy storage device utilizing non-faradaic ion adsorption at the electrode-electrolyte interface." },
    { id: 5, term: "Lithium-Ion Cathode", definition: "Lithium metal oxide (e.g., LiCoO2) electrode facilitating reversible intercalation during discharge." },
    { id: 6, term: "Secondary Battery", definition: "Rechargeable electrochemical cell allowing reversible chemical reactions via external electrical charging." }
  ];

  let selectedTermId = null;
  let matchedPairsCount = 0;

  window.initMatchmaker = function () {
    matchedPairsCount = 0;
    selectedTermId = null;
    
    const countEl = document.getElementById('match-count');
    if (countEl) countEl.textContent = '0';
    const totalEl = document.getElementById('match-total');
    if (totalEl) totalEl.textContent = matchPairs.length;
    
    const feedbackEl = document.getElementById('match-feedback');
    if (feedbackEl) feedbackEl.classList.add('hidden');

    const termsContainer = document.getElementById('terms-container');
    const defsContainer = document.getElementById('definitions-container');
    if (!termsContainer || !defsContainer) return;

    termsContainer.innerHTML = '';
    defsContainer.innerHTML = '';

    const shuffledTerms = [...matchPairs].sort(() => Math.random() - 0.5);
    const shuffledDefs = [...matchPairs].sort(() => Math.random() - 0.5);

    shuffledTerms.forEach(item => {
      const btn = document.createElement('button');
      btn.id = `term-${item.id}`;
      btn.className = "matchmaker-item-btn";
      btn.innerHTML = `<span>${item.term}</span> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted);"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>`;
      btn.setAttribute('aria-label', `Term: ${item.term}`);
      btn.onclick = () => selectTerm(item.id);
      termsContainer.appendChild(btn);
    });

    shuffledDefs.forEach(item => {
      const btn = document.createElement('button');
      btn.id = `def-${item.id}`;
      btn.className = "matchmaker-item-btn";
      btn.textContent = item.definition;
      btn.setAttribute('aria-label', `Definition: ${item.definition}`);
      btn.onclick = () => selectDefinition(item.id);
      defsContainer.appendChild(btn);
    });
  };

  function selectTerm(id) {
    const termBtn = document.getElementById(`term-${id}`);
    if (!termBtn || termBtn.classList.contains('matched')) return;

    matchPairs.forEach(item => {
      const tBtn = document.getElementById(`term-${item.id}`);
      if (tBtn && !tBtn.classList.contains('matched')) {
        tBtn.classList.remove('selected');
      }
    });

    selectedTermId = id;
    termBtn.classList.add('selected');
  }

  function selectDefinition(id) {
    if (!selectedTermId) {
      showMatchmakerFeedback("Please select a lab term on the left first!", false);
      return;
    }
    const defBtn = document.getElementById(`def-${id}`);
    if (!defBtn || defBtn.classList.contains('matched')) return;

    if (selectedTermId === id) {
      const tBtn = document.getElementById(`term-${selectedTermId}`);
      if (tBtn) {
        tBtn.classList.remove('selected');
        tBtn.classList.add('matched');
        tBtn.onclick = null;
      }
      defBtn.classList.add('matched');
      defBtn.onclick = null;

      matchedPairsCount++;
      const countEl = document.getElementById('match-count');
      if (countEl) countEl.textContent = matchedPairsCount;
      addScore(25);

      showMatchmakerFeedback(`Correct match established! Successfully linked "${getTermName(selectedTermId)}".`, true);
      selectedTermId = null;

      if (matchedPairsCount === matchPairs.length) {
        markModuleComplete('matchmaker', 'Battery & Solar Matchmaker');
      }
    } else {
      showMatchmakerFeedback("Incorrect match! Review electrochemical principles and try another definition.", false);
      const tBtn = document.getElementById(`term-${selectedTermId}`);
      if (tBtn) {
        if (window.EchemMotion && window.EchemMotion.shake) {
          window.EchemMotion.shake(tBtn);
          window.EchemMotion.shake(defBtn);
        }
        tBtn.classList.add('mismatch');
        setTimeout(() => tBtn.classList.remove('mismatch'), 500);
      }
    }
  }

  function getTermName(id) {
    const found = matchPairs.find(p => p.id === id);
    return found ? found.term : "";
  }

  function showMatchmakerFeedback(text, isSuccess) {
    const box = document.getElementById('match-feedback');
    const txt = document.getElementById('match-feedback-text');
    if (!box || !txt) return;

    box.classList.remove('hidden');
    txt.textContent = text;
    box.style.border = isSuccess ? '1.5px solid #10b981' : '1.5px solid #f43f5e';
    box.style.background = isSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)';
    box.style.color = isSuccess ? '#047857' : '#e11d48';
  }

  /* ==========================================================================
     MODULE 2: ELECTROCHEMICAL CELL BUILDER
     ========================================================================== */
  const cellDataSets = {
    leadacid: {
      title: "Lead-Acid Storage Battery",
      components: [
        { id: 'anode', name: "Sponge Lead Anode (Pb)", type: 'anode', correctSlot: 0 },
        { id: 'electrolyte', name: "Sulfuric Acid Electrolyte (H2SO4 ~38%)", type: 'electrolyte', correctSlot: 1 },
        { id: 'cathode', name: "Lead Dioxide Cathode (PbO2)", type: 'cathode', correctSlot: 2 }
      ],
      voltage: "12.0 V (6 Cells in Series)",
      desc: "Lead-acid battery successfully energized! Sponge lead and lead dioxide react with sulfuric acid to discharge electrical current while forming lead sulfate."
    },
    liion: {
      title: "Lithium-Ion Battery",
      components: [
        { id: 'anode', name: "Graphite Anode (Li intercalation)", type: 'anode', correctSlot: 0 },
        { id: 'electrolyte', name: "Non-Aqueous Organic Salt Electrolyte (LiPF6)", type: 'electrolyte', correctSlot: 1 },
        { id: 'cathode', name: "Lithium Cobalt Oxide Cathode (LiCoO2)", type: 'cathode', correctSlot: 2 }
      ],
      voltage: "3.7 V (Single Cell Nominal)",
      desc: "Lithium-ion cell successfully energized! Li+ ions de-intercalate from the graphite anode and shuttle through the non-aqueous electrolyte into the LiCoO2 cathode lattice."
    }
  };

  let currentCellType = 'leadacid';
  let placedComponents = [null, null, null];
  let availableBuilderItems = [];

  window.changeCellType = function () {
    const sel = document.getElementById('builder-type-select');
    if (sel) currentCellType = sel.value;
    window.initBuilder();
  };

  window.initBuilder = function () {
    const data = cellDataSets[currentCellType];
    const titleEl = document.getElementById('cell-title-display');
    if (titleEl) titleEl.textContent = data.title;

    const badge = document.getElementById('assembly-status-badge');
    if (badge) {
      badge.textContent = "INCOMPLETE";
      badge.className = "badge badge-soon";
    }

    const resBox = document.getElementById('builder-result-box');
    if (resBox) resBox.classList.add('hidden');

    const voltEl = document.getElementById('voltage-output');
    if (voltEl) voltEl.textContent = "0.0 V";

    const testBtn = document.getElementById('test-cell-btn');
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.className = "btn btn-secondary";
      testBtn.style.opacity = '0.5';
      testBtn.style.cursor = 'not-allowed';
    }

    const slotsGrid = document.getElementById('assembly-slots');
    if (slotsGrid) {
      slotsGrid.classList.remove('cell-energized', 'assembly-fault');
    }

    placedComponents = [null, null, null];
    availableBuilderItems = [...data.components].sort(() => Math.random() - 0.5);

    renderBuilderInventory();
    renderBuilderSlots();
  };

  function renderBuilderInventory() {
    const invContainer = document.getElementById('inventory-container');
    if (!invContainer) return;
    invContainer.innerHTML = '';

    availableBuilderItems.forEach(item => {
      const btn = document.createElement('button');
      btn.className = "matchmaker-item-btn";
      btn.innerHTML = `<span>${item.name}</span> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--brand-accent);"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
      btn.setAttribute('aria-label', `Add ${item.name} to assembly chamber`);
      btn.onclick = () => placeComponentInNextSlot(item);
      invContainer.appendChild(btn);
    });
  }

  function renderBuilderSlots() {
    const slotsContainer = document.getElementById('assembly-slots');
    if (!slotsContainer) return;
    slotsContainer.innerHTML = '';

    const slotLabels = ["1. Anode (-) Electrode", "2. Liquid/Gel Electrolyte", "3. Cathode (+) Electrode"];

    for (let i = 0; i < 3; i++) {
      const slotDiv = document.createElement('div');
      const placed = placedComponents[i];

      if (placed) {
        slotDiv.className = "assembly-slot-card filled";
        slotDiv.innerHTML = `
          <div class="flex justify-between items-center text-xs" style="font-family:var(--font-mono); color:var(--brand-accent);">
            <span>SLOT ${i + 1}</span>
            <button onclick="removeBuilderComponent(${i})" class="btn-icon" aria-label="Remove ${placed.name} from slot ${i + 1}" style="padding:2px; color:#f43f5e; cursor:pointer; background:none; border:none;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div style="font-weight:700; font-size:var(--text-xs); color:var(--text-main); margin-top:var(--space-2);">${placed.name}</div>
        `;
      } else {
        slotDiv.className = "assembly-slot-card";
        slotDiv.innerHTML = `
          <div class="text-xs text-muted" style="font-family:var(--font-mono);">SLOT ${i + 1}</div>
          <div class="text-xs text-muted" style="font-style:italic; margin-top:var(--space-2);">${slotLabels[i]}</div>
        `;
      }
      slotsContainer.appendChild(slotDiv);
    }

    const testBtn = document.getElementById('test-cell-btn');
    if (testBtn) {
      if (placedComponents.every(p => p !== null)) {
        testBtn.disabled = false;
        testBtn.className = "btn btn-primary";
        testBtn.style.opacity = '1';
        testBtn.style.cursor = 'pointer';
      } else {
        testBtn.disabled = true;
        testBtn.className = "btn btn-secondary";
        testBtn.style.opacity = '0.5';
        testBtn.style.cursor = 'not-allowed';
      }
    }
  }

  function placeComponentInNextSlot(item) {
    const emptyIdx = placedComponents.findIndex(p => p === null);
    if (emptyIdx === -1) return;

    placedComponents[emptyIdx] = item;
    availableBuilderItems = availableBuilderItems.filter(i => i.id !== item.id);
    renderBuilderInventory();
    renderBuilderSlots();
  }

  window.removeBuilderComponent = function (index) {
    const removed = placedComponents[index];
    if (!removed) return;

    placedComponents[index] = null;
    availableBuilderItems.push(removed);
    renderBuilderInventory();
    renderBuilderSlots();
  };

  window.testCellAssembly = function () {
    const data = cellDataSets[currentCellType];
    let isCorrect = true;

    for (let i = 0; i < 3; i++) {
      if (!placedComponents[i] || placedComponents[i].correctSlot !== i) {
        isCorrect = false;
        break;
      }
    }

    const badge = document.getElementById('assembly-status-badge');
    const resBox = document.getElementById('builder-result-box');
    const resTitle = document.getElementById('builder-result-title');
    const resDesc = document.getElementById('builder-result-desc');
    const voltEl = document.getElementById('voltage-output');
    const slotsGrid = document.getElementById('assembly-slots');

    if (resBox) resBox.classList.remove('hidden');

    if (isCorrect) {
      if (slotsGrid) {
        slotsGrid.classList.remove('assembly-fault');
        slotsGrid.classList.add('cell-energized');
      }
      if (badge) {
        badge.textContent = "ENERGIZED";
        badge.className = "badge badge-live";
      }
      if (voltEl) voltEl.textContent = data.voltage;
      if (resTitle) {
        resTitle.textContent = "Cell Successfully Energized!";
        resTitle.style.color = '#047857';
      }
      if (resDesc) resDesc.textContent = data.desc;
      addScore(50);
      markModuleComplete('builder', 'Electrochemical Cell Builder');
    } else {
      if (slotsGrid) {
        slotsGrid.classList.remove('cell-energized');
        slotsGrid.classList.add('assembly-fault');
        if (window.EchemMotion && window.EchemMotion.shake) {
          window.EchemMotion.shake(slotsGrid);
        }
      }
      if (badge) {
        badge.textContent = "SHORT-CIRCUITED";
        badge.className = "badge badge-soon";
        badge.style.background = 'rgba(244,63,94,0.15)';
        badge.style.color = '#e11d48';
      }
      if (voltEl) voltEl.textContent = "0.0 V (Internal Short)";
      if (resTitle) {
        resTitle.textContent = "Assembly Fault: Short Circuit Detected!";
        resTitle.style.color = '#e11d48';
      }
      if (resDesc) resDesc.textContent = "Incorrect component sequence! You must assemble Anode into Slot 1, Electrolyte into Slot 2, and Cathode into Slot 3 to establish a safe electrochemical potential.";
    }
  };

  /* ==========================================================================
     MODULE 3: CIRCUIT TYCOON TRIVIA QUIZ
     ========================================================================== */
  const tycoonQuestions = [
    {
      question: "What is the primary role of the sulfuric acid electrolyte in a lead-acid storage battery?",
      options: [
        "To act as a thermal coolant preventing battery explosion.",
        "To supply sulfate ions and facilitate ionic conduction between electrodes during redox reactions.",
        "To provide permanent structural rigidity to the outer plastic casing.",
        "To absorb stray electrons and prevent self-discharge."
      ],
      correct: 1,
      explanation: "Sulfuric acid provides the hydrogen and sulfate ions required to complete the internal circuit and drive the discharge reaction forming lead sulfate."
    },
    {
      question: "Why do monocrystalline silicon solar cells exhibit higher energy conversion efficiency than polycrystalline cells?",
      options: [
        "They are manufactured using toxic cadmium telluride compounds.",
        "Their single continuous crystal lattice minimizes electron scattering and recombination defects.",
        "They operate only under ultraviolet radiation.",
        "They incorporate built-in ultracapacitors for surge storage."
      ],
      correct: 1,
      explanation: "A single uninterrupted silicon crystal structure allows photogenerated electrons to travel with fewer grain boundary obstructions, boosting efficiency."
    },
    {
      question: "How do EDLC Ultracapacitors store electrical energy compared to traditional faradaic batteries?",
      options: [
        "By physical electrostatic ion adsorption at the electrode-electrolyte interface without chemical bonds breaking.",
        "By permanent chemical oxidation of lithium metal.",
        "By magnetic induction inside copper wire coils.",
        "By thermal emission of electrons at high temperatures."
      ],
      correct: 0,
      explanation: "EDLCs store charge electrostatically in an electric double layer, enabling lightning-fast charge/discharge rates and near-infinite cycle life."
    },
    {
      question: "What happens to the electrolyte concentration (density) of a lead-acid battery as it undergoes complete discharge?",
      options: [
        "Concentration increases significantly as pure acid is generated.",
        "Concentration decreases because sulfuric acid is consumed to form lead sulfate.",
        "Concentration remains perfectly constant.",
        "Electrolyte turns entirely into gaseous hydrogen."
      ],
      correct: 1,
      explanation: "Sulfuric acid is consumed during discharge to form solid lead sulfate on both plates, causing the specific gravity of the electrolyte to drop."
    },
    {
      question: "Which material is most commonly paired as a high-performance cathode in rechargeable lithium-ion batteries?",
      options: [
        "Zinc Metal Foil",
        "Lithium Cobalt Oxide (LiCoO2) or Lithium Iron Phosphate",
        "Lead Dioxide Paste",
        "Pure Carbon Black"
      ],
      correct: 1,
      explanation: "Lithium transition metal oxides like LiCoO2 provide high intercalation capacity and stable voltage plateaus for portable and EV applications."
    },
    {
      question: "What is a major limitation of ultracapacitors when compared against chemical batteries?",
      options: [
        "Extremely short cycle life and poor power density.",
        "Lower total energy storage density (energy per unit weight).",
        "Inability to operate at room temperature.",
        "High risk of spontaneous acid leakage."
      ],
      correct: 1,
      explanation: "While ultracapacitors offer exceptional power density, their energy density is lower than chemical batteries because electrostatic surface adsorption stores less total energy than bulk chemical redox reactions."
    }
  ];

  let tycoonIndex = 0;
  let tycoonStreak = 0;
  let tycoonPower = 0;

  window.initTycoon = function () {
    tycoonIndex = 0;
    tycoonStreak = 0;
    tycoonPower = 0;
    loadTycoonQuestion();
  };

  function loadTycoonQuestion() {
    if (tycoonIndex >= tycoonQuestions.length) {
      tycoonIndex = 0;
    }
    const q = tycoonQuestions[tycoonIndex];

    const qBadge = document.getElementById('tycoon-q-badge');
    if (qBadge) qBadge.textContent = `Question ${tycoonIndex + 1} of ${tycoonQuestions.length}`;

    const qText = document.getElementById('tycoon-q-text');
    if (qText) qText.textContent = q.question;

    const streakBadge = document.getElementById('tycoon-streak-badge');
    if (streakBadge) streakBadge.innerHTML = `Streak: <strong style="color:var(--brand-accent);">${tycoonStreak}</strong>`;

    const explBox = document.getElementById('tycoon-expl-box');
    if (explBox) explBox.classList.add('hidden');

    const nextBtn = document.getElementById('tycoon-next-btn');
    if (nextBtn) nextBtn.classList.add('hidden');

    const optionsContainer = document.getElementById('tycoon-options');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.id = `tycoon-opt-${idx}`;
      btn.className = "tycoon-option-btn";
      btn.innerHTML = `
        <span class="tycoon-opt-badge">${String.fromCharCode(65 + idx)}</span>
        <span style="flex-grow:1;">${opt}</span>
      `;
      btn.setAttribute('aria-label', `Option ${String.fromCharCode(65 + idx)}: ${opt}`);
      btn.onclick = () => selectTycoonOption(idx);
      optionsContainer.appendChild(btn);
    });
  }

  function selectTycoonOption(selectedIndex) {
    const q = tycoonQuestions[tycoonIndex];
    const correctIndex = q.correct;

    for (let i = 0; i < q.options.length; i++) {
      const btn = document.getElementById(`tycoon-opt-${i}`);
      if (btn) {
        btn.onclick = null;
        if (i === correctIndex) {
          btn.classList.add('correct');
        } else if (i === selectedIndex) {
          btn.classList.add('wrong');
        } else {
          btn.style.opacity = '0.4';
        }
      }
    }

    if (selectedIndex === correctIndex) {
      tycoonStreak++;
      const oldPower = tycoonPower;
      tycoonPower += 250;
      addScore(40);
      const wattsEl = document.getElementById('tycoon-watts');
      if (wattsEl && window.EchemMotion) {
        window.EchemMotion.animateNumber(wattsEl, oldPower, tycoonPower, 500, v => `${Math.round(v)} kW`);
      } else if (wattsEl) {
        wattsEl.textContent = `${tycoonPower} kW`;
      }
    } else {
      tycoonStreak = 0;
      const wrongBtn = document.getElementById(`tycoon-opt-${selectedIndex}`);
      if (wrongBtn && window.EchemMotion && window.EchemMotion.shake) {
        window.EchemMotion.shake(wrongBtn);
      }
    }

    // Update facility metrics
    const solarEl = document.getElementById('facility-solar');
    if (solarEl) solarEl.textContent = "Online (98%)";

    const storageEl = document.getElementById('facility-storage');
    if (storageEl) storageEl.textContent = "Intercalating";

    const effPercent = Math.min(100, Math.round(((tycoonIndex + 1) / tycoonQuestions.length) * 100));
    const effText = document.getElementById('grid-efficiency');
    if (effText) effText.textContent = `${effPercent}%`;

    const effBar = document.getElementById('efficiency-bar');
    if (effBar) {
      effBar.style.transform = `scaleX(${effPercent / 100})`;
      effBar.style.width = '100%';
    }

    const explText = document.getElementById('tycoon-expl-text');
    if (explText) explText.textContent = q.explanation;

    const explBox = document.getElementById('tycoon-expl-box');
    if (explBox) explBox.classList.remove('hidden');

    const nextBtn = document.getElementById('tycoon-next-btn');
    if (nextBtn) nextBtn.classList.remove('hidden');
  }

  window.nextTycoonQuestion = function () {
    tycoonIndex++;
    if (tycoonIndex < tycoonQuestions.length) {
      loadTycoonQuestion();
    } else {
      markModuleComplete('tycoon', 'Circuit Tycoon Trivia');
    }
  };

  /* ==========================================================================
     COMPLETION MODAL
     ========================================================================== */
  function checkGameCompletion(customMsg) {
    if (timerInterval) clearInterval(timerInterval);
    const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (secondsElapsed % 60).toString().padStart(2, '0');

    const scoreModal = document.getElementById('modal-final-score');
    if (scoreModal) scoreModal.textContent = globalScore;

    const timeModal = document.getElementById('modal-final-time');
    if (timeModal) timeModal.textContent = `${mins}:${secs}`;

    const msgModal = document.getElementById('modal-completion-msg');
    if (msgModal && customMsg) msgModal.textContent = customMsg;

    const modal = document.getElementById('completion-modal');
    if (modal) modal.classList.remove('hidden');
  }

  window.closeCompletionModal = function () {
    const modal = document.getElementById('completion-modal');
    if (modal) modal.classList.add('hidden');
    window.switchGame('hub');
  };

  document.addEventListener('DOMContentLoaded', () => {
    startTimer();
    window.initMatchmaker();
    window.initBuilder();
    window.initTycoon();
  });
})();
