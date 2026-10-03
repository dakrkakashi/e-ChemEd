/**
 * e-chemEd Global Search Engine
 * Searches units, syllabus topics, and question bank theory/numericals
 */

(function () {
  'use strict';

  function getRootPrefix() {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/pages/') || path.includes('/games/')) {
      return '../';
    }
    return './';
  }

  const prefix = getRootPrefix();
  let searchIndex = [];
  let isDataLoaded = false;

  async function loadSearchData() {
    if (isDataLoaded) return;
    try {
      const loader = window.loadEchemData || (p => fetch(p).then(r => r.json()));
      const [unitsRes, qbankRes] = await Promise.all([
        loader(`${prefix}data/units.json`),
        loader(`${prefix}data/questions/unit1.json`)
      ]);

      searchIndex = [];

      // 1. Index Units
      unitsRes.forEach((unit) => {
        searchIndex.push({
          type: 'Unit',
          title: `Unit ${unit.unitNumber}: ${unit.title}`,
          snippet: unit.description,
          url: `${prefix}pages/unit.html?u=${unit.unitNumber}`,
          badge: unit.status === 'live' ? 'Unit Available' : 'Coming Soon',
          badgeClass: unit.status === 'live' ? 'badge-live' : 'badge-soon'
        });

        // Index topics
        if (unit.topics && Array.isArray(unit.topics)) {
          unit.topics.forEach((topic) => {
            searchIndex.push({
              type: 'Topic',
              title: topic,
              snippet: `Topic covered in Unit ${unit.unitNumber}: ${unit.shortTitle}`,
              url: `${prefix}pages/unit.html?u=${unit.unitNumber}`,
              badge: `Unit ${unit.unitNumber}`,
              badgeClass: 'badge-live'
            });
          });
        }
      });

      // 2. Index Question Bank Theory
      if (qbankRes.theory && Array.isArray(qbankRes.theory)) {
        qbankRes.theory.forEach((item) => {
          searchIndex.push({
            type: 'Theory Q&A',
            title: `Q${item.questionNumber}: ${item.question}`,
            snippet: item.answer.definition || 'Detailed engineering chemistry theoretical answer.',
            url: `${prefix}pages/question-bank.html#${item.id}`,
            badge: 'Question Bank',
            badgeClass: 'badge-live'
          });
        });
      }

      // 3. Index Question Bank Numericals
      if (qbankRes.numericals && Array.isArray(qbankRes.numericals)) {
        qbankRes.numericals.forEach((item) => {
          searchIndex.push({
            type: 'Numerical Problem',
            title: `Problem ${item.problemNumber}: ${item.title}`,
            snippet: item.problemStatement,
            url: `${prefix}pages/question-bank.html#${item.id}`,
            badge: 'Solved Numerical',
            badgeClass: 'badge-live'
          });
        });
      }

      isDataLoaded = true;
    } catch (err) {
      console.warn('e-chemEd search data loading failed or running via file:// protocol without local server:', err);
    }
  }

  function openSearchModal() {
    loadSearchData();
    const backdrop = document.getElementById('search-modal-backdrop');
    if (backdrop) {
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
      const input = document.getElementById('global-search-input');
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 50);
      }
      renderSearchResults('');
    }
  }

  function closeSearchModal() {
    const backdrop = document.getElementById('search-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function renderSearchResults(query) {
    const resultsContainer = document.getElementById('search-results-container');
    const statusEl = document.getElementById('search-modal-status');
    if (!resultsContainer) return;

    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      if (statusEl) statusEl.textContent = 'Type a keyword like "EDTA", "hardness", "zeolite", or "scale"...';
      resultsContainer.innerHTML = `
        <li style="padding: var(--space-4); text-align: center; color: var(--text-muted); font-size: var(--text-sm);">
          Quick suggestions: <a href="${prefix}pages/unit.html?u=1" style="text-decoration:underline;">Unit 1: Water Processing</a> &bull; 
          <a href="${prefix}pages/question-bank.html" style="text-decoration:underline;">Hardness Numericals</a> &bull;
          <a href="${prefix}games/periodic-table.html" style="text-decoration:underline;">Periodic Table</a>
        </li>
      `;
      return;
    }

    const matches = searchIndex.filter((item) => {
      return (
        item.title.toLowerCase().includes(trimmed) ||
        (item.snippet && item.snippet.toLowerCase().includes(trimmed)) ||
        (item.type && item.type.toLowerCase().includes(trimmed))
      );
    });

    if (statusEl) {
      statusEl.textContent = `Found ${matches.length} result${matches.length === 1 ? '' : 's'} for "${query}"`;
    }

    if (matches.length === 0) {
      resultsContainer.innerHTML = `
        <li style="padding: var(--space-6); text-align: center; color: var(--text-muted);">
          No matching topics or questions found for "<strong>${escapeHtml(query)}</strong>".
        </li>
      `;
      return;
    }

    resultsContainer.innerHTML = matches
      .slice(0, 8)
      .map((item) => {
        return `
        <li class="search-result-item" onclick="window.location.href='${item.url}'" role="listitem" tabindex="0">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-2);">
            <span class="search-result-title">${highlightMatch(escapeHtml(item.title), trimmed)}</span>
            <span class="badge ${item.badgeClass}">${item.type}</span>
          </div>
          <p style="font-size: var(--text-xs); color: var(--text-secondary); margin: 0; line-height: 1.4;">
            ${highlightMatch(escapeHtml(item.snippet.slice(0, 110)), trimmed)}${item.snippet.length > 110 ? '...' : ''}
          </p>
        </li>
      `;
      })
      .join('');
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background:rgba(245,158,11,0.25); color:inherit; padding:1px 3px; border-radius:2px;">$1</mark>');
  }

  // Keyboard shortcut listener
  document.addEventListener('keydown', (e) => {
    // Pressing "/" when not in an input
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      openSearchModal();
    }
    // Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearchModal();
    }
    // Escape to close
    if (e.key === 'Escape') {
      closeSearchModal();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
      const searchTrigger = e.target.closest('#global-search-btn');
      if (searchTrigger) {
        e.preventDefault();
        openSearchModal();
      }
    });

    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderSearchResults(e.target.value);
      });
    }
  });

  window.openGlobalSearch = openSearchModal;
})();
