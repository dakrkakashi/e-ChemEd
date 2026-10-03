/**
 * e-chemEd Shared Components Injector
 * "Printed textbook meets lab notebook"
 * Dynamically provides consistent header, navigation, search modal, and footer across all pages
 */

(function () {
  'use strict';

  // Determine relative root prefix based on script or page path
  function getRootPrefix() {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/pages/') || path.includes('/games/')) {
      return '../';
    }
    return './';
  }

  const prefix = getRootPrefix();

  // Navigation Links - Clean academic labeling
  const navItems = [
    { label: 'Home', href: `${prefix}index.html`, id: 'nav-home' },
    { label: 'Mind Maps', href: `${prefix}pages/mind-maps.html`, id: 'nav-mindmaps' },
    { label: 'Quizzes', href: `${prefix}pages/quizzes.html`, id: 'nav-quizzes' },
    { label: 'Question Bank', href: `${prefix}pages/question-bank.html`, id: 'nav-qbank' },
    { label: 'Video Lectures', href: `${prefix}pages/video-lectures.html`, id: 'nav-videos' },
    { label: 'Attendance', href: `${prefix}pages/attendance.html`, id: 'nav-attendance' },
    { label: 'Games', href: `${prefix}pages/games.html`, id: 'nav-games' }
  ];

  // Render Site Header
  function renderHeader() {
    const headerEl = document.getElementById('site-header');
    if (!headerEl) return;

    const currentPath = window.location.pathname.replace(/\\/g, '/');

    const navLinksHtml = navItems
      .map((item) => {
        const itemFileName = item.href.split('/').pop().replace('.html', '');
        const isActive =
          (itemFileName === 'index' && (currentPath.endsWith('/') || currentPath.endsWith('index.html'))) ||
          currentPath.includes(itemFileName);
        return `<li><a href="${item.href}" class="nav-link ${isActive ? 'active' : ''}">${item.label}</a></li>`;
      })
      .join('');

    const mobileLinksHtml = navItems
      .map((item) => {
        const itemFileName = item.href.split('/').pop().replace('.html', '');
        const isActive =
          (itemFileName === 'index' && (currentPath.endsWith('/') || currentPath.endsWith('index.html'))) ||
          currentPath.includes(itemFileName);
        return `<a href="${item.href}" class="mobile-nav-link ${isActive ? 'active' : ''}">${item.label} &rarr;</a>`;
      })
      .join('');

    headerEl.className = 'site-header';
    headerEl.innerHTML = `
      <div class="container nav-container">
        <a href="${prefix}index.html" class="brand-wrapper" aria-label="e-chemEd Home">
          <img src="${prefix}assets/img/logo.jpg" alt="Sanjivani College Logo" class="brand-logo-img" width="40" height="40">
          <div class="brand-info">
            <span class="brand-title">e-chem<span>Ed</span></span>
            <span class="brand-subtitle">Sanjivani College of Engineering</span>
          </div>
        </a>

        <nav aria-label="Main Navigation">
          <ul class="nav-links">
            ${navLinksHtml}
          </ul>
        </nav>

        <div class="nav-actions">
          <button type="button" class="search-trigger-btn" id="global-search-btn" aria-label="Search syllabus topics and questions">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span class="search-btn-text">Search</span>
            <span class="search-shortcut">/</span>
          </button>

          <button type="button" class="btn-icon theme-toggle-btn" id="header-theme-toggle" aria-label="Switch theme mode" title="Switch theme mode">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          </button>

          <button type="button" class="btn-icon hamburger-btn" aria-label="Toggle navigation menu" aria-expanded="false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div class="drawer-backdrop" id="drawer-backdrop" aria-hidden="true">
        <div class="mobile-nav-drawer" id="mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
          <div class="drawer-header">
            <div style="display:flex; align-items:center; gap:var(--space-2);">
              <img src="${prefix}assets/img/logo.jpg" alt="Logo" class="brand-logo-img" width="32" height="32">
              <span class="brand-title">e-chem<span>Ed</span></span>
            </div>
            <button type="button" class="btn-icon drawer-close-btn" id="drawer-close-btn" aria-label="Close navigation menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="drawer-body">
            <button type="button" class="btn btn-outline drawer-search-btn" id="drawer-search-btn" style="width:100%; justify-content:flex-start; margin-bottom:var(--space-4); gap:var(--space-2); min-height:44px; padding:0 0.875rem; font-size:var(--text-sm); color:var(--text-secondary); border-color:var(--border-control);" aria-label="Search syllabus topics and questions">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <span>Search topics &amp; materials...</span>
            </button>
            <nav aria-label="Mobile Navigation Links" style="display:flex; flex-direction:column; gap:var(--space-2);">
              ${mobileLinksHtml}
            </nav>
            <div class="mobile-theme-row" style="padding: var(--space-4) var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary);">Appearance</span>
              <button type="button" class="btn btn-outline theme-toggle-btn" style="min-height: 40px; padding: 0.25rem 0.75rem; font-size: var(--text-xs); display: inline-flex; align-items: center; gap: 0.5rem;" aria-label="Switch theme mode" title="Switch theme mode">
                <span class="theme-icon-slot"></span>
                <span class="theme-label-slot">Light Mode</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Immediately sync theme UI state with active document theme
    if (window.updateThemeUI) {
      const activeTheme = document.documentElement.getAttribute('data-theme') || 'light';
      window.updateThemeUI(activeTheme);
    }
  }

  // Render Site Footer
  function renderFooter() {
    const footerEl = document.getElementById('site-footer');
    if (!footerEl) return;

    footerEl.className = 'site-footer';
    footerEl.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="brand-wrapper" style="margin-bottom: var(--space-2);">
              <img src="${prefix}assets/img/logo.jpg" alt="College Logo" class="brand-logo-img" width="34" height="34">
              <span class="brand-title">e-chem<span>Ed</span></span>
            </div>
            <p>
              Engineering Chemistry reference portal for First Year engineering students. Department of Engineering Science &amp; Humanities, Sanjivani College of Engineering, Kopargaon.
            </p>
          </div>

          <div class="footer-col">
            <div class="footer-col-title">Quick Links</div>
            <ul class="footer-links">
              <li><a href="${prefix}index.html">Home</a></li>
              <li><a href="${prefix}pages/mind-maps.html">Mind Maps</a></li>
              <li><a href="${prefix}pages/quizzes.html">Quizzes</a></li>
              <li><a href="${prefix}pages/question-bank.html">Question Bank</a></li>
              <li><a href="${prefix}pages/video-lectures.html">Video Lectures</a></li>
              <li><a href="${prefix}pages/attendance.html">Attendance</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <div class="footer-col-title">Learn with Fun</div>
            <ul class="footer-links">
              <li><a href="${prefix}games/periodic-table.html">Interactive Periodic Table</a></li>
              <li><a href="${prefix}games/unit1-puzzle.html">Unit 1 Puzzle Challenge</a></li>
              <li><a href="${prefix}games/unit2-arcade.html">Unit 2 Chem-Arcade Suite</a></li>
              <li><a href="${prefix}pages/unit.html?u=1">Unit 1: Water Processing</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <p>&copy; 2026 e-chemEd. Sanjivani College of Engineering, Kopargaon. All rights reserved.</p>
        </div>
      </div>
    `;
  }

  // Render Global Search Modal Container
  function renderSearchModal() {
    if (document.getElementById('search-modal-backdrop')) return;

    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'search-modal-backdrop';
    modalBackdrop.className = 'modal-backdrop';
    modalBackdrop.innerHTML = `
      <div class="modal search-modal" role="dialog" aria-modal="true" aria-labelledby="search-modal-heading" aria-label="Site Search">
        <div class="modal-header">
          <h2 id="search-modal-heading" class="sr-only">Site Search</h2>
          <div class="search-input-wrap" style="width: 100%;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="global-search-input" placeholder="Search units, EDTA, hardness, zeolite, boiler troubles..." autocomplete="off">
            <button type="button" class="btn-icon" data-close-modal aria-label="Close search" style="border:none; background:transparent; width:36px; height:36px; min-width:36px; min-height:36px; color:var(--text-muted); flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
        <div class="modal-body" style="padding-top: var(--space-2);">
          <div id="search-modal-status" class="text-xs text-muted" style="margin-bottom: var(--space-2); font-family: var(--font-mono);">Start typing to search units and question bank...</div>
          <ul id="search-results-container" class="search-results-list"></ul>
        </div>
      </div>
    `;
    document.body.appendChild(modalBackdrop);
  }

  // Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderFooter();
    renderSearchModal();
  });
})();
