/**
 * e-chemEd Unit 1 Puzzle Challenge
 * Level 1: Linear Adjacency Word Search (EDTA, SCALE, HARDNESS, SLUDGE)
 * Level 2: Cause & Treatment Matching (with proper <sub> chemical formulas)
 * Level 3: Virtual EDTA Titration Simulator (endpoint at exactly 12.0 mL with float rounding)
 * Level 4: Boiler Room Emergency Escape
 */

(function () {
  'use strict';

  /* --- Tab / Level Navigation --- */
  window.switchPuzzleLevel = function (lvl) {
    document.querySelectorAll('.tab-btn').forEach((b, idx) => {
      b.classList.toggle('active', idx === lvl - 1);
      b.setAttribute('aria-selected', idx === lvl - 1 ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-content').forEach((c, idx) => {
      c.classList.toggle('active', idx === lvl - 1);
    });
  };

  /* ==========================================================================
     LEVEL 1: Pointer Events Touch-Drag & Tap-Start/Tap-End Word Search
     ========================================================================== */
  const gridData = [
    ['E', 'D', 'T', 'A', 'X', 'S', 'C', 'A', 'L', 'E'],
    ['H', 'A', 'R', 'D', 'N', 'E', 'S', 'S', 'A', 'B'],
    ['X', 'Y', 'Z', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'],
    ['S', 'L', 'U', 'D', 'G', 'E', 'W', 'A', 'T', 'E'],
    ['C', 'O', 'M', 'P', 'L', 'E', 'X', 'O', 'M', 'R']
  ];

  const TARGET_WORDS = ['EDTA', 'SCALE', 'HARDNESS', 'SLUDGE'];
  const foundWords = new Set();
  let selectedCells = []; // Array of { r, c, char, el }
  let isPointerDragging = false;
  let dragStartCell = null;
  let tapStartCell = null;

  function initWordSearch() {
    const gridEl = document.getElementById('word-search-grid');
    if (!gridEl) return;

    gridEl.innerHTML = '';
    gridData.forEach((row, r) => {
      row.forEach((char, c) => {
        const cell = document.createElement('div');
        cell.className = 'ws-cell';
        cell.textContent = char;
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}, Letter ${char}`);

        // Keyboard navigation & selection
        cell.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCellTap(r, c, char, cell);
          }
        });

        gridEl.appendChild(cell);
      });
    });

    // Pointer Events on grid container for smooth touch-drag and mouse-drag
    gridEl.addEventListener('pointerdown', handleGridPointerDown);
    gridEl.addEventListener('pointermove', handleGridPointerMove);
    gridEl.addEventListener('pointerup', handleGridPointerUp);
    gridEl.addEventListener('pointercancel', handleGridPointerUp);
  }

  function getLineCells(r1, c1, r2, c2) {
    const dr = r2 - r1;
    const dc = c2 - c1;
    const isHorizontal = dr === 0;
    const isVertical = dc === 0;
    const isDiagonal = Math.abs(dr) === Math.abs(dc);

    if (!isHorizontal && !isVertical && !isDiagonal) {
      return null;
    }

    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    const stepR = dr === 0 ? 0 : dr / steps;
    const stepC = dc === 0 ? 0 : dc / steps;

    const line = [];
    for (let i = 0; i <= steps; i++) {
      const currR = r1 + i * stepR;
      const currC = c1 + i * stepC;
      const char = gridData[currR][currC];
      const el = document.querySelector(`.ws-cell[data-r="${currR}"][data-c="${currC}"]`);
      if (el) {
        line.push({ r: currR, c: currC, char, el });
      }
    }
    return line;
  }

  function clearActiveSelection() {
    selectedCells.forEach(item => {
      if (!item.el.classList.contains('found')) {
        item.el.classList.remove('selected');
      }
    });
    selectedCells = [];
  }

  function handleCellTap(r, c, char, el) {
    if (el.classList.contains('found')) return;

    if (!tapStartCell) {
      clearActiveSelection();
      tapStartCell = { r, c, char, el };
      selectedCells = [tapStartCell];
      el.classList.add('selected');
      showWordSearchFeedback(`Selected start letter "${char}". Now tap the ending letter or touch-drag.`, 'info');
    } else {
      if (tapStartCell.r === r && tapStartCell.c === c) {
        clearActiveSelection();
        tapStartCell = null;
        showWordSearchFeedback('Selection cleared.', 'info');
        return;
      }

      const line = getLineCells(tapStartCell.r, tapStartCell.c, r, c);
      if (line) {
        clearActiveSelection();
        selectedCells = line;
        selectedCells.forEach(item => item.el.classList.add('selected'));
        const matched = checkWordMatch();
        tapStartCell = null;
        if (!matched) {
          setTimeout(() => {
            clearActiveSelection();
            showWordSearchFeedback('Not a target keyword. Tap another word or drag across letters.', 'warning');
          }, 500);
        }
      } else {
        clearActiveSelection();
        tapStartCell = { r, c, char, el };
        selectedCells = [tapStartCell];
        el.classList.add('selected');
        showWordSearchFeedback(`Selected start letter "${char}". Must be in a straight line with ending letter.`, 'warning');
      }
    }
  }

  function handleGridPointerDown(e) {
    const cellEl = e.target.closest('.ws-cell');
    if (!cellEl || cellEl.classList.contains('found')) return;

    const r = parseInt(cellEl.dataset.r, 10);
    const c = parseInt(cellEl.dataset.c, 10);
    const char = gridData[r][c];

    // Tap-start / tap-end resolution
    if (tapStartCell && (tapStartCell.r !== r || tapStartCell.c !== c)) {
      const line = getLineCells(tapStartCell.r, tapStartCell.c, r, c);
      if (line) {
        clearActiveSelection();
        selectedCells = line;
        selectedCells.forEach(item => item.el.classList.add('selected'));
        tapStartCell = null;
        isPointerDragging = false;
        checkWordMatch();
        return;
      }
    }

    if (tapStartCell && tapStartCell.r === r && tapStartCell.c === c) {
      clearActiveSelection();
      tapStartCell = null;
      isPointerDragging = false;
      return;
    }

    isPointerDragging = true;
    dragStartCell = { r, c, char, el: cellEl };

    clearActiveSelection();
    selectedCells = [dragStartCell];
    dragStartCell.el.classList.add('selected');

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  function handleGridPointerMove(e) {
    if (!isPointerDragging || !dragStartCell) return;

    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    const cellEl = targetEl ? targetEl.closest('.ws-cell') : null;
    if (!cellEl) return;

    const r = parseInt(cellEl.dataset.r, 10);
    const c = parseInt(cellEl.dataset.c, 10);

    const line = getLineCells(dragStartCell.r, dragStartCell.c, r, c);
    if (line && line.length > 0) {
      clearActiveSelection();
      selectedCells = line;
      selectedCells.forEach(item => item.el.classList.add('selected'));
    }
  }

  function handleGridPointerUp(e) {
    if (!isPointerDragging) return;
    isPointerDragging = false;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}

    if (selectedCells.length === 1) {
      tapStartCell = selectedCells[0];
      showWordSearchFeedback(`Selected start letter "${tapStartCell.char}". Now tap the ending letter or touch-drag!`, 'info');
      return;
    }

    tapStartCell = null;
    const matched = checkWordMatch();
    if (!matched) {
      if (window.EchemMotion && window.EchemMotion.shake) {
        selectedCells.forEach(item => window.EchemMotion.shake(item.el));
      }
      setTimeout(() => {
        if (!isPointerDragging) {
          clearActiveSelection();
          showWordSearchFeedback('Not a target keyword. Tap start & end letters or touch-drag across EDTA, SCALE, HARDNESS, SLUDGE.', 'warning');
        }
      }, 400);
    }
  }

  function checkWordMatch() {
    const forwardWord = selectedCells.map(c => c.char).join('');
    const reverseWord = selectedCells.map(c => c.char).reverse().join('');

    let matchedWord = null;
    if (TARGET_WORDS.includes(forwardWord) && !foundWords.has(forwardWord)) {
      matchedWord = forwardWord;
    } else if (TARGET_WORDS.includes(reverseWord) && !foundWords.has(reverseWord)) {
      matchedWord = reverseWord;
    }

    if (matchedWord) {
      foundWords.add(matchedWord);
      selectedCells.forEach(item => {
        item.el.classList.remove('selected');
        item.el.classList.add('found');
      });

      const pill = document.getElementById(`target-${matchedWord}`);
      if (pill) pill.classList.add('completed');

      showWordSearchFeedback(`Great job! Found term: ${matchedWord}`, 'success');
      selectedCells = [];
      tapStartCell = null;

      if (foundWords.size === TARGET_WORDS.length) {
        showWordSearchFeedback('Congratulations! All 4 water processing keywords identified! Proceed to Level 2.', 'success');
        if (window.EchemProgress) window.EchemProgress.markActivity(1, 'gamePlayed');
      }
      return true;
    }
    return false;
  }

  window.resetWordSearchSelection = function () {
    clearActiveSelection();
    tapStartCell = null;
    isPointerDragging = false;
    showWordSearchFeedback('Selection reset. Touch-drag or tap start/end letters to trace a word.', 'info');
  };

  function showWordSearchFeedback(msg, type) {
    const el = document.getElementById('ws-feedback-msg');
    if (!el) return;
    el.innerHTML = msg;
    el.style.display = 'block';
    el.className = `badge badge-${type === 'success' ? 'live' : 'soon'}`;
  }


  /* ==========================================================================
     LEVEL 2: Matching Problem to Cause & Solution (Formatted Formulas)
     ========================================================================== */
  let selectedProblem = null;
  let matchesCompleted = 0;

  window.selectProblem = function (el, key) {
    if (el.classList.contains('matched')) return;
    document.querySelectorAll('#problems-col .match-item-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedProblem = { key, el };
  };

  window.selectCause = function (el, key) {
    if (el.classList.contains('matched') || !selectedProblem) return;

    if (selectedProblem.key === key) {
      // Match successful!
      selectedProblem.el.classList.remove('selected');
      selectedProblem.el.classList.add('matched');
      el.classList.add('matched');
      matchesCompleted++;

      showMatchFeedback('Correct match! Problem and industrial mechanism verified.', true);
      selectedProblem = null;

      if (matchesCompleted === 3) {
        showMatchFeedback('Level 2 Complete! All industrial problems correctly resolved. Advance to Level 3!', true);
      }
    } else {
      if (window.EchemMotion && window.EchemMotion.shake) {
        window.EchemMotion.shake(selectedProblem.el);
        window.EchemMotion.shake(el);
      }
      showMatchFeedback('Incorrect correlation. Review boiler chemistry and try again.', false);
    }
  };

  function showMatchFeedback(text, isSuccess) {
    const el = document.getElementById('match-feedback');
    if (!el) return;
    el.innerHTML = text;
    el.style.display = 'block';
    el.style.color = isSuccess ? '#047857' : '#e11d48';
    el.style.fontWeight = '600';
  }


  /* ==========================================================================
     LEVEL 3: Virtual EDTA Titration Simulator (12.0 mL endpoint)
     ========================================================================== */
  let currentEdtaVolume = 0.0;
  const ENDPOINT_VOLUME = 12.0;

  function spawnBuretteDroplet() {
    if (window.EchemMotion && window.EchemMotion.isReduced()) return;
    const stage = document.querySelector('.titration-stage');
    if (!stage) return;
    const droplet = document.createElement('div');
    droplet.className = 'burette-droplet';
    stage.appendChild(droplet);
    setTimeout(() => {
      if (droplet.parentNode) droplet.remove();
    }, 450);
  }

  window.addEdta = function (amount) {
    // Handle float rounding reliably
    currentEdtaVolume = Math.round((currentEdtaVolume + amount) * 10) / 10;
    spawnBuretteDroplet();
    updateTitrationDisplay();
  };

  window.resetTitration = function () {
    currentEdtaVolume = 0.0;
    updateTitrationDisplay();
    const liquid = document.getElementById('flask-liquid');
    if (liquid) {
      liquid.className = 'flask-liquid';
      liquid.style.height = '65%';
    }
    const flask = document.querySelector('.conical-flask');
    if (flask) flask.classList.remove('endpoint-pulse');
    const feedback = document.getElementById('titration-feedback');
    if (feedback) feedback.style.display = 'none';
  };

  function updateTitrationDisplay() {
    const volDisplay = document.getElementById('edta-vol-display');
    if (volDisplay) volDisplay.textContent = currentEdtaVolume.toFixed(1);

    const liquid = document.getElementById('flask-liquid');
    const feedback = document.getElementById('titration-feedback');
    const flask = document.querySelector('.conical-flask');

    if (!liquid || !feedback) return;

    // Liquid meniscus rises as EDTA is added
    const liquidHeight = Math.min(84, 65 + (currentEdtaVolume / 15) * 18);
    liquid.style.height = `${liquidHeight}%`;

    // Swirl oscillation during addition
    if (!window.EchemMotion || !window.EchemMotion.isReduced()) {
      liquid.classList.remove('is-swirling');
      void liquid.offsetWidth;
      liquid.classList.add('is-swirling');
    }

    if (currentEdtaVolume === ENDPOINT_VOLUME) {
      // Exact stoichiometric equivalence point: 12.0 mL
      liquid.className = 'flask-liquid steel-blue';
      feedback.style.display = 'block';
      feedback.style.color = '#047857';
      feedback.innerHTML = `
        <strong>Stoichiometric Endpoint Reached! (12.0 mL)</strong><br>
        All Ca<sup>2+</sup> and Mg<sup>2+</sup> cations are sequestered into [M-EDTA]<sup>2-</sup> chelates. 
        Free uncomplexed Eriochrome Black T indicator is released, turning the solution <strong>Steel Blue</strong>!
      `;

      if (flask && (!window.EchemMotion || !window.EchemMotion.isReduced())) {
        flask.classList.remove('endpoint-pulse');
        void flask.offsetWidth;
        flask.classList.add('endpoint-pulse');
      }

      if (window.EchemProgress) window.EchemProgress.markActivity(1, 'gamePlayed');
    } else if (currentEdtaVolume > ENDPOINT_VOLUME) {
      // Over-titrated: solution stays Steel Blue with over-titration warning
      liquid.className = 'flask-liquid steel-blue';
      feedback.style.display = 'block';
      feedback.style.color = '#e11d48';
      feedback.innerHTML = '<strong>Over-titrated!</strong> Endpoint reached, but you added excess EDTA beyond the 12.0 mL stoichiometric point. Click Reset to perform an accurate titration.';
    } else if (currentEdtaVolume > 8.0) {
      // Transition phase matching original puzzle.html
      liquid.className = 'flask-liquid transition-purple';
      feedback.style.display = 'block';
      feedback.style.color = '#7e22ce';
      feedback.innerHTML = 'Approaching endpoint... Color is transitioning from Wine Red to Purple!';
    } else {
      liquid.className = 'flask-liquid';
      feedback.style.display = 'none';
    }
  }


  /* ==========================================================================
     LEVEL 4: Boiler Emergency Escape Room
     ========================================================================== */
  window.checkEscapeRoom = function () {
    const s1El = document.getElementById('s1');
    const s2El = document.getElementById('s2');
    const s1 = s1El?.value;
    const s2 = s2El?.value;
    const feedback = document.getElementById('escape-feedback');

    if (!s1 || !s2) {
      if (s1El && !s1 && window.EchemMotion) window.EchemMotion.shake(s1El);
      if (s2El && !s2 && window.EchemMotion) window.EchemMotion.shake(s2El);
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = '#e11d48';
        feedback.textContent = 'Please select remedial methods for both boiler emergency scenarios.';
      }
      return;
    }

    if (s1 === 'correct' && s2 === 'correct') {
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = '#047857';
        feedback.innerHTML = `
          <div class="boiler-door-reveal" style="background:rgba(16,185,129,0.15); border:1.5px solid #10b981; border-radius:var(--radius-lg); padding:var(--space-4); margin-top:var(--space-4);">
            <h4 style="color:#047857; margin-bottom:var(--space-2); font-size:var(--text-lg);">&check; Boiler Plant Saved! Challenge Mastered</h4>
            <p class="text-sm" style="margin-bottom:var(--space-3);">
              You resolved the CaSO<sub>4</sub> scale using Calgon conditioning and mitigated caustic embrittlement using NaNO<sub>3</sub> / tannin inhibitors!
            </p>
            <span class="badge badge-live">Unit 1 Certificate of Mastery Unlocked</span>
          </div>
        `;
      }
      if (window.EchemProgress) window.EchemProgress.markActivity(1, 'gamePlayed');
    } else {
      if (s1El && s1 !== 'correct' && window.EchemMotion) window.EchemMotion.shake(s1El);
      if (s2El && s2 !== 'correct' && window.EchemMotion) window.EchemMotion.shake(s2El);
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = '#e11d48';
        feedback.textContent = 'One or more treatment choices were incorrect. Review internal conditioning principles and retry.';
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    initWordSearch();
  });
})();
