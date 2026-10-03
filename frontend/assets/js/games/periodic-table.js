/**
 * e-chemEd Interactive Periodic Table
 * 118 Elements with dynamic 11-category filter, live search, and slide-over / bottom-sheet inspector
 * Supports responsive Card View (default on <960px) and Full IUPAC Grid View with sticky period labels
 */

(function () {
  'use strict';

  let elements = [];
  let activeCategory = 'all';
  let searchQuery = '';
  let selectedElement = null;
  let currentViewMode = 'cards';

  // Category to CSS class map
  const CAT_CLASS_MAP = {
    'alkali metal': 'cat-alkali',
    'alkaline earth metal': 'cat-alkaline',
    'transition metal': 'cat-transition',
    'post-transition metal': 'cat-posttrans',
    'metalloid': 'cat-metalloid',
    'nonmetal': 'cat-nonmetal',
    'halogen': 'cat-halogen',
    'noble gas': 'cat-noble',
    'lanthanide': 'cat-lanthanide',
    'actinide': 'cat-actinide',
    'unknown': 'cat-unknown'
  };

  async function initPeriodicTable() {
    try {
      const loader = window.loadEchemData || (p => fetch(p).then(r => r.json()));
      elements = await loader('../data/elements.json');
      
      // Ensure sorted by atomic number 1 to 118
      elements.sort((a, b) => a.number - b.number);

      renderCategoryFilters();
      renderCardsView();
      renderTableGrid();
      initViewMode();
      setupEventListeners();

      // Default select Hydrogen on desktop/tablet only, keep collapsed on mobile
      if (elements.length > 0 && window.innerWidth >= 768) {
        showElementDetail(elements[0]);
      }
    } catch (err) {
      console.error('Failed to load periodic table elements:', err);
    }
  }

  // View Mode Controller (Cards vs Grid)
  function initViewMode() {
    const savedPref = localStorage.getItem('echemed_ptable_view');
    if (savedPref === 'grid' || savedPref === 'cards') {
      setViewMode(savedPref, false);
    } else {
      // Default: full 18-col grid only from 960px up. Below that, card view is default
      const defaultMode = window.innerWidth >= 960 ? 'grid' : 'cards';
      setViewMode(defaultMode, false);
    }
  }

  function setViewMode(mode, savePref = true) {
    currentViewMode = mode;
    if (savePref) {
      localStorage.setItem('echemed_ptable_view', mode);
    }

    const cardsContainer = document.getElementById('ptable-cards-view');
    const gridContainer = document.getElementById('ptable-grid-view');
    const cardsBtn = document.getElementById('toggle-cards-btn');
    const gridBtn = document.getElementById('toggle-grid-btn');

    if (mode === 'cards') {
      if (cardsContainer) cardsContainer.classList.remove('hidden');
      if (gridContainer) gridContainer.classList.add('hidden');
      if (cardsBtn) {
        cardsBtn.classList.add('active');
        cardsBtn.setAttribute('aria-pressed', 'true');
      }
      if (gridBtn) {
        gridBtn.classList.remove('active');
        gridBtn.setAttribute('aria-pressed', 'false');
      }
    } else {
      if (cardsContainer) cardsContainer.classList.add('hidden');
      if (gridContainer) gridContainer.classList.remove('hidden');
      if (gridBtn) {
        gridBtn.classList.add('active');
        gridBtn.setAttribute('aria-pressed', 'true');
      }
      if (cardsBtn) {
        cardsBtn.classList.remove('active');
        cardsBtn.setAttribute('aria-pressed', 'false');
      }
    }
  }

  // Requirement: Build filters dynamically from all 11 categories in the data
  function renderCategoryFilters() {
    const filterContainer = document.getElementById('category-filters-container');
    if (!filterContainer) return;

    // Extract unique categories from loaded data
    const categories = [...new Set(elements.map(e => e.category))];

    let html = `
      <button type="button" class="cat-filter-btn active" data-cat="all" onclick="filterByCategory('all', this)">
        <span class="cat-swatch" style="background:var(--brand-primary);"></span>
        All Elements (${elements.length})
      </button>
    `;

    categories.forEach(cat => {
      const count = elements.filter(e => e.category === cat).length;
      const cssClass = CAT_CLASS_MAP[cat] || 'cat-unknown';
      html += `
        <button type="button" class="cat-filter-btn" data-cat="${cat}" onclick="filterByCategory('${cat}', this)">
          <span class="cat-swatch ${cssClass}"></span>
          ${capitalize(cat)} (${count})
        </button>
      `;
    });

    filterContainer.innerHTML = html;
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Render Card View (Mobile-First 118 Elements Cards)
  function renderCardsView() {
    const cardGrid = document.getElementById('ptable-cards-grid');
    if (!cardGrid) return;

    cardGrid.innerHTML = '';

    elements.forEach(el => {
      const card = document.createElement('div');
      const catClass = CAT_CLASS_MAP[el.category] || 'cat-unknown';
      card.className = `el-card-item ${catClass}`;
      card.dataset.num = el.number;
      card.dataset.symbol = el.symbol.toLowerCase();
      card.dataset.name = el.name.toLowerCase();
      card.dataset.cat = el.category;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${el.name}, Atomic number ${el.number}, ${el.symbol}, ${el.category}`);

      card.innerHTML = `
        <div class="el-card-top">
          <span class="el-card-num">#${el.number}</span>
          <span class="el-card-mass">${el.mass} u</span>
        </div>
        <div class="el-card-sym">${el.symbol}</div>
        <div class="el-card-name">${el.name}</div>
        <span class="el-card-cat-badge badge ${catClass}">${el.category}</span>
      `;

      card.addEventListener('click', () => {
        showElementDetail(el);
        setSelectedItem(el.number);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showElementDetail(el);
          setSelectedItem(el.number);
        }
      });

      cardGrid.appendChild(card);
    });
  }

  // Render IUPAC 18-Column Grid View with Sticky Period Labels
  function renderTableGrid() {
    const gridEl = document.getElementById('ptable-main-grid');
    if (!gridEl) return;

    gridEl.innerHTML = '';

    // Standard Periodic Table layout: 7 periods, 18 groups
    // Main body: elements where group > 0
    // Lanthanides: period 6, group 0 (elements 57-71)
    // Actinides: period 7, group 0 (elements 89-103)
    
    // Grid mapping 7 rows x 18 cols
    const mainGrid = Array(7).fill(null).map(() => Array(18).fill(null));

    elements.forEach(el => {
      if (el.group > 0 && el.period <= 7) {
        mainGrid[el.period - 1][el.group - 1] = el;
      }
    });

    // Populate rows 1 to 7 with sticky period labels on left (column 0)
    for (let r = 0; r < 7; r++) {
      // Sticky period label cell
      const periodLabel = document.createElement('div');
      periodLabel.className = 'period-label-cell';
      periodLabel.textContent = (r + 1);
      periodLabel.setAttribute('aria-label', `Period ${r + 1}`);
      gridEl.appendChild(periodLabel);

      for (let c = 0; c < 18; c++) {
        const el = mainGrid[r][c];
        if (el) {
          gridEl.appendChild(createElementCell(el));
        } else {
          // Check for lanthanide placeholder (Row 6, Col 3) and actinide placeholder (Row 7, Col 3)
          if (r === 5 && c === 2) {
            gridEl.appendChild(createPlaceholderCell('57–71', 'La–Lu', 'cat-lanthanide', 'Lanthanides'));
          } else if (r === 6 && c === 2) {
            gridEl.appendChild(createPlaceholderCell('89–103', 'Ac–Lr', 'cat-actinide', 'Actinides'));
          } else {
            const spacer = document.createElement('div');
            spacer.className = 'el-cell el-spacer';
            gridEl.appendChild(spacer);
          }
        }
      }
    }

    // Series Separator Label
    const sep = document.createElement('div');
    sep.className = 'ptable-series-label';
    sep.textContent = 'f-Block Rare Earth Elements';
    gridEl.appendChild(sep);

    // Lanthanide Series row (elements 57 to 71)
    const lanLabel = document.createElement('div');
    lanLabel.className = 'period-label-cell';
    lanLabel.textContent = '6*';
    lanLabel.setAttribute('aria-label', 'Lanthanide Series');
    gridEl.appendChild(lanLabel);

    for (let i = 0; i < 3; i++) {
      const s = document.createElement('div');
      s.className = 'el-cell el-spacer';
      gridEl.appendChild(s);
    }
    elements.filter(e => e.category === 'lanthanide').forEach(el => {
      gridEl.appendChild(createElementCell(el));
    });

    // Actinide Series row (elements 89 to 103)
    const actLabel = document.createElement('div');
    actLabel.className = 'period-label-cell';
    actLabel.textContent = '7*';
    actLabel.setAttribute('aria-label', 'Actinide Series');
    gridEl.appendChild(actLabel);

    for (let i = 0; i < 3; i++) {
      const s = document.createElement('div');
      s.className = 'el-cell el-spacer';
      gridEl.appendChild(s);
    }
    elements.filter(e => e.category === 'actinide').forEach(el => {
      gridEl.appendChild(createElementCell(el));
    });

    updateCellHighlights();
  }

  function createElementCell(el) {
    const cell = document.createElement('div');
    const catClass = CAT_CLASS_MAP[el.category] || 'cat-unknown';
    cell.className = `el-cell ${catClass}`;
    cell.dataset.num = el.number;
    cell.dataset.symbol = el.symbol.toLowerCase();
    cell.dataset.name = el.name.toLowerCase();
    cell.dataset.cat = el.category;
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label', `${el.name}, Atomic number ${el.number}, ${el.category}`);

    cell.innerHTML = `
      <div class="el-num">${el.number}</div>
      <div class="el-sym">${el.symbol}</div>
      <div class="el-name">${el.name}</div>
    `;

    cell.addEventListener('click', () => {
      showElementDetail(el);
      setSelectedItem(el.number);
    });

    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showElementDetail(el);
        setSelectedItem(el.number);
      }
    });

    return cell;
  }

  function createPlaceholderCell(range, label, catClass, ariaText) {
    const ph = document.createElement('div');
    ph.className = `el-cell ${catClass}`;
    ph.style.border = '1.5px dashed rgba(255, 255, 255, 0.6)';
    ph.setAttribute('aria-label', ariaText);
    ph.innerHTML = `
      <div class="el-num" style="font-size:8px; font-weight:700;">${range}</div>
      <div class="el-sym" style="font-size:12px; font-weight:800;">${label}</div>
      <div class="el-name" style="font-size:7px; font-weight:600;">*f-block</div>
    `;
    return ph;
  }

  function setSelectedItem(num) {
    document.querySelectorAll('.el-cell, .el-card-item').forEach(c => {
      if (c.dataset.num === String(num)) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });
  }

  function showElementDetail(el) {
    selectedElement = el;
    const panel = document.getElementById('element-detail-panel');
    if (!panel) return;

    const catClass = CAT_CLASS_MAP[el.category] || 'cat-unknown';

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--space-4);">
        <span class="badge ${catClass}" style="font-size:11px; padding:3px 10px;">${capitalize(el.category)}</span>
        <button type="button" class="btn-icon" onclick="closeElementDetail()" aria-label="Close element inspector" style="min-width:36px; min-height:36px; display:flex; align-items:center; justify-content:center; font-size:22px; cursor:pointer;">&times;</button>
      </div>

      <div class="el-detail-hero">
        <div class="el-hero-box ${catClass}">
          <span style="font-family:var(--font-mono); font-size:11px; opacity:0.85;">${el.number}</span>
          <span style="font-family:var(--font-display); font-size:32px; font-weight:800; line-height:1;">${el.symbol}</span>
          <span style="font-size:9px; opacity:0.9;">${el.mass}</span>
        </div>
        <div>
          <h2 style="font-size:var(--text-2xl); margin-bottom:2px;">${el.name}</h2>
          <div style="font-family:var(--font-mono); font-size:var(--text-xs); color:var(--text-muted); margin-bottom:var(--space-2);">
            Period ${el.period} &bull; Group ${el.group > 0 ? el.group : 'f-block'}
          </div>
          <div style="font-size:var(--text-xs); color:var(--text-secondary);">
            Standard Atomic Weight: <strong>${el.mass} u</strong>
          </div>
        </div>
      </div>

      <div class="el-detail-facts-grid">
        <div class="el-fact-box" style="grid-column: 1 / -1;">
          <div class="el-fact-label">Electron Configuration</div>
          <div class="el-fact-value" style="color:var(--brand-primary);">${el.electronConfig || '—'}</div>
        </div>

        <div class="el-fact-box">
          <div class="el-fact-label">Electronegativity</div>
          <div class="el-fact-value">${el.electronegativity !== '—' && el.electronegativity ? el.electronegativity + ' (Pauling)' : '—'}</div>
        </div>

        <div class="el-fact-box">
          <div class="el-fact-label">Atomic Radius</div>
          <div class="el-fact-value">${el.atomicRadius && el.atomicRadius !== '—' ? el.atomicRadius + ' pm' : '—'}</div>
        </div>

        <div class="el-fact-box">
          <div class="el-fact-label">Ionization Energy</div>
          <div class="el-fact-value">${el.ionizationEnergy && el.ionizationEnergy !== '—' ? el.ionizationEnergy + ' kJ/mol' : '—'}</div>
        </div>

        <div class="el-fact-box">
          <div class="el-fact-label">Density</div>
          <div class="el-fact-value">${el.density || '—'}</div>
        </div>

        <div class="el-fact-box">
          <div class="el-fact-label">Melting Point</div>
          <div class="el-fact-value">${el.meltingPoint !== undefined && el.meltingPoint !== '—' ? el.meltingPoint + ' °C' : '—'}</div>
        </div>

        <div class="el-fact-box">
          <div class="el-fact-label">Boiling Point</div>
          <div class="el-fact-value">${el.boilingPoint !== undefined && el.boilingPoint !== '—' ? el.boilingPoint + ' °C' : '—'}</div>
        </div>

        <div class="el-fact-box" style="grid-column: 1 / -1;">
          <div class="el-fact-label">Oxidation States</div>
          <div class="el-fact-value">${el.oxidationStates || '—'}</div>
        </div>
      </div>
    `;

    panel.classList.add('open');
  }

  window.closeElementDetail = function () {
    const panel = document.getElementById('element-detail-panel');
    if (panel) panel.classList.remove('open');
  };

  window.filterByCategory = function (cat, btn) {
    activeCategory = cat;
    document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    updateCellHighlights();
  };

  function updateCellHighlights() {
    const query = searchQuery.trim().toLowerCase();

    // Update Grid cells
    document.querySelectorAll('.el-cell:not(.el-spacer)').forEach(cell => {
      const cat = cell.dataset.cat;
      const num = cell.dataset.num;
      const sym = cell.dataset.symbol;
      const name = cell.dataset.name;

      if (!cat) return; // Placeholder cell

      const matchesCat = activeCategory === 'all' || cat === activeCategory;
      const matchesSearch = !query || 
        (num && num === query) ||
        (sym && sym.includes(query)) ||
        (name && name.includes(query));

      if (matchesCat && matchesSearch) {
        cell.classList.remove('dimmed');
      } else {
        cell.classList.add('dimmed');
      }
    });

    // Update Card items
    document.querySelectorAll('.el-card-item').forEach(card => {
      const cat = card.dataset.cat;
      const num = card.dataset.num;
      const sym = card.dataset.symbol;
      const name = card.dataset.name;

      const matchesCat = activeCategory === 'all' || cat === activeCategory;
      const matchesSearch = !query || 
        (num && num === query) ||
        (sym && sym.includes(query)) ||
        (name && name.includes(query));

      if (matchesCat && matchesSearch) {
        card.style.display = '';
        card.classList.remove('dimmed');
      } else {
        card.style.display = 'none';
        card.classList.add('dimmed');
      }
    });
  }

  function setupEventListeners() {
    const searchInput = document.getElementById('ptable-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        updateCellHighlights();
      });
    }

    // View Mode Toggle Buttons
    const toggleCardsBtn = document.getElementById('toggle-cards-btn');
    const toggleGridBtn = document.getElementById('toggle-grid-btn');

    if (toggleCardsBtn) {
      toggleCardsBtn.addEventListener('click', () => {
        setViewMode('cards', true);
      });
    }

    if (toggleGridBtn) {
      toggleGridBtn.addEventListener('click', () => {
        setViewMode('grid', true);
      });
    }

    // Close panel on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.closeElementDetail();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initPeriodicTable);
})();
