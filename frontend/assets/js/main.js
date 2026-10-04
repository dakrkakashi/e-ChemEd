/**
 * e-chemEd - Main Application Logic
 * "Printed textbook meets lab notebook"
 * Theme toggle (Light by default, ignores OS dark setting, manual toggle saved in localStorage),
 * Mobile drawer, local storage progress tracking, and shared utilities
 */

(function () {
  'use strict';

  // --- Theme Management ---
  const THEME_STORAGE_KEY = 'echemed_theme';
  const THEME_VERSION_KEY = 'echemed_theme_version';
  const THEME_VER = '2.0';

  const SUN_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  const MOON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

  function getPreferredTheme() {
    try {
      // Force migration to Light default if on legacy version
      if (localStorage.getItem(THEME_VERSION_KEY) !== THEME_VER) {
        localStorage.setItem(THEME_VERSION_KEY, THEME_VER);
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
        return 'light';
      }
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'dark' ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    const targetTheme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', targetTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, targetTheme);
      localStorage.setItem(THEME_VERSION_KEY, THEME_VER);
    } catch (e) {}

    updateThemeUI(targetTheme);
  }

  function updateThemeUI(theme) {
    const isDark = theme === 'dark';
    const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
    themeToggleBtns.forEach((btn) => {
      btn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
      btn.setAttribute('title', `Switch to ${isDark ? 'light' : 'dark'} mode`);

      const iconSlot = btn.querySelector('.theme-icon-slot');
      if (iconSlot) {
        iconSlot.innerHTML = isDark ? SUN_SVG : MOON_SVG;
      } else {
        btn.innerHTML = isDark ? SUN_SVG : MOON_SVG;
      }

      const labelSlot = btn.querySelector('.theme-label-slot');
      if (labelSlot) {
        labelSlot.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      }
    });
  }

  // Apply immediately to prevent flash
  applyTheme(getPreferredTheme());

  // Expose helpers globally
  window.applyTheme = applyTheme;
  window.updateThemeUI = updateThemeUI;
  window.THEME_SUN_SVG = SUN_SVG;
  window.THEME_MOON_SVG = MOON_SVG;

  // --- Student Progress Tracking API with SQLite Backend & Resilient Offline Cache ---
  const PROGRESS_KEY = 'echemed_progress';

  function getDefaultProgress() {
    return {
      units: {
        1: { mindMapRead: false, videoWatched: false, questionBankViewed: false, quizCompleted: false, gamePlayed: false },
        2: { mindMapRead: false, videoWatched: false, questionBankViewed: false, quizCompleted: false, gamePlayed: false },
        3: { mindMapRead: false, videoWatched: false, questionBankViewed: false, quizCompleted: false, gamePlayed: false },
        4: { mindMapRead: false, videoWatched: false, questionBankViewed: false, quizCompleted: false, gamePlayed: false },
        5: { mindMapRead: false, videoWatched: false, questionBankViewed: false, quizCompleted: false, gamePlayed: false }
      }
    };
  }

  window.EchemProgress = {
    cached: null,

    get() {
      if (this.cached) return this.cached;
      try {
        const stored = JSON.parse(localStorage.getItem(PROGRESS_KEY));
        if (stored && stored.units) {
          this.cached = stored;
          return stored;
        }
      } catch (e) {}
      this.cached = getDefaultProgress();
      return this.cached;
    },

    save(progress) {
      this.cached = progress;
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('echemed:progress-updated', { detail: progress }));
    },

    async syncWithServer() {
      const apiBase = (window.ECHEMED_CONFIG && window.ECHEMED_CONFIG.getApiBase) ? window.ECHEMED_CONFIG.getApiBase() : '';
      const headers = (window.EchemAuth && window.EchemAuth.getAuthHeaders) ? window.EchemAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };

      try {
        const res = await fetch(`${apiBase}/api/progress`, {
          method: 'GET',
          headers,
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.ok && data.progress && data.progress.units) {
            const current = this.get();
            for (const [uId, uObj] of Object.entries(data.progress.units)) {
              if (!current.units[uId]) current.units[uId] = {};
              for (const [k, v] of Object.entries(uObj)) {
                if (v) current.units[uId][k] = true;
              }
            }
            this.save(current);
            return current;
          }
        }
      } catch (e) {
        // Silently preserve local cache on network disruption
      }
      return this.get();
    },

    async markActivity(unitId, activityKey) {
      const data = this.get();
      if (!data.units[unitId]) data.units[unitId] = {};
      data.units[unitId][activityKey] = true;
      this.save(data);

      // Asynchronously send to backend SQLite database
      const apiBase = (window.ECHEMED_CONFIG && window.ECHEMED_CONFIG.getApiBase) ? window.ECHEMED_CONFIG.getApiBase() : '';
      const headers = (window.EchemAuth && window.EchemAuth.getAuthHeaders) ? window.EchemAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };

      try {
        const res = await fetch(`${apiBase}/api/progress`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ unitId: Number(unitId), activityKey: String(activityKey) })
        });
        if (res.ok) {
          const respData = await res.json();
          if (respData && respData.ok && respData.progress) {
            this.save(respData.progress);
          }
        }
      } catch (err) {
        // Non-blocking resilient UI: local state is preserved, user flow never breaks
        console.warn('[PROGRESS SYNC NOTICE] Offline or temporary API unreachable. Local progress preserved.');
      }
    },

    getUnitPercentage(unitId) {
      const data = this.get();
      const unit = data.units[unitId];
      if (!unit) return 0;
      const keys = ['mindMapRead', 'videoWatched', 'questionBankViewed', 'quizCompleted', 'gamePlayed'];
      const completed = keys.filter((k) => unit[k]).length;
      return Math.round((completed / keys.length) * 100);
    }
  };

  // Sync progress upon auth change
  window.addEventListener('echemed:auth-changed', (e) => {
    if (e.detail && e.detail.user) {
      window.EchemProgress.syncWithServer();
    }
  });

  // Initial sync attempt if already authenticated
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.EchemProgress.syncWithServer();
    });
  } else {
    window.EchemProgress.syncWithServer();
  }

  // Delegated theme toggle listener (works for dynamically injected buttons anywhere)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-toggle-btn');
    if (btn) {
      e.preventDefault();
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    }
  });

  // --- Global Initializer on DOM Loaded ---
  document.addEventListener('DOMContentLoaded', () => {
    // Refresh theme UI elements once DOM is ready
    const activeTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemeUI(activeTheme);

    // --- Mobile Navigation Drawer Controller ---
    function openMobileDrawer() {
      const drawerBackdrop = document.getElementById('drawer-backdrop');
      const drawer = document.getElementById('mobile-drawer');
      const hamburgerBtn = document.querySelector('.hamburger-btn');
      if (!drawerBackdrop || !drawer) return;
      drawerBackdrop.classList.add('open');
      drawerBackdrop.setAttribute('aria-hidden', 'false');
      if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';

      const focusable = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length > 0) {
        setTimeout(() => focusable[0].focus(), 50);
      }
    }

    function closeMobileDrawer() {
      const drawerBackdrop = document.getElementById('drawer-backdrop');
      const drawer = document.getElementById('mobile-drawer');
      const hamburgerBtn = document.querySelector('.hamburger-btn');
      if (!drawerBackdrop || !drawer) return;
      drawerBackdrop.classList.remove('open');
      drawerBackdrop.setAttribute('aria-hidden', 'true');
      if (hamburgerBtn) {
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        hamburgerBtn.focus();
      }
      document.body.style.overflow = '';
    }

    window.openMobileDrawer = openMobileDrawer;
    window.closeMobileDrawer = closeMobileDrawer;

    // Delegated click listener for mobile drawer elements (always works regardless of render timing)
    document.addEventListener('click', (e) => {
      const hamburger = e.target.closest('.hamburger-btn');
      if (hamburger) {
        e.preventDefault();
        e.stopPropagation();
        const backdrop = document.getElementById('drawer-backdrop');
        if (backdrop && backdrop.classList.contains('open')) {
          closeMobileDrawer();
        } else {
          openMobileDrawer();
        }
        return;
      }

      const closeBtn = e.target.closest('#drawer-close-btn');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        closeMobileDrawer();
        return;
      }

      const drawerSearch = e.target.closest('#drawer-search-btn');
      if (drawerSearch) {
        e.preventDefault();
        closeMobileDrawer();
        const globalSearch = document.getElementById('global-search-btn');
        if (globalSearch) {
          setTimeout(() => globalSearch.click(), 50);
        }
        return;
      }

      const navLink = e.target.closest('.mobile-nav-link');
      if (navLink) {
        closeMobileDrawer();
        return;
      }

      const backdrop = document.getElementById('drawer-backdrop');
      if (backdrop && e.target === backdrop) {
        closeMobileDrawer();
        return;
      }
    });

    // Keyboard accessibility & trap focus inside drawer
    document.addEventListener('keydown', (e) => {
      const drawerBackdrop = document.getElementById('drawer-backdrop');
      const drawer = document.getElementById('mobile-drawer');
      const isDrawerOpen = drawerBackdrop && drawerBackdrop.classList.contains('open');

      if (e.key === 'Escape') {
        if (isDrawerOpen) {
          closeMobileDrawer();
        }
        document.querySelectorAll('.modal-backdrop.open').forEach((m) => {
          m.classList.remove('open');
          document.body.style.overflow = '';
        });
        return;
      }

      if (e.key === 'Tab' && isDrawerOpen && drawer) {
        const focusable = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Modal close helpers
    document.querySelectorAll('[data-close-modal]').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const modalBackdrop = trigger.closest('.modal-backdrop');
        if (modalBackdrop) {
          modalBackdrop.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    });

    // Faculty Profile & CV availability (configured via cvAvailable flag in faculty.json)
    const facultyImg = document.querySelector('.faculty-photo');
    if (facultyImg) {
      facultyImg.addEventListener('error', function () {
        const isSubdir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('/games/');
        this.src = isSubdir ? '../assets/img/faculty-placeholder.svg' : 'assets/img/faculty-placeholder.svg';
      });
    }

    const cvLink = document.getElementById('faculty-cv-link');
    const cvDownload = document.getElementById('faculty-cv-download');
    const cvRow = document.getElementById('faculty-cv-row');

    if (cvLink || cvDownload || cvRow) {
      const isSubdir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('/games/');
      const facultyDataPath = isSubdir ? '../data/faculty.json' : 'data/faculty.json';

      const applyCvConfig = (faculty) => {
        const isAvailable = Boolean(faculty && faculty.cvAvailable === true);
        if (isAvailable) {
          const docUrl = (faculty && faculty.cvDocument) ? ((isSubdir ? '../' : '') + faculty.cvDocument) : '#';
          if (cvLink) {
            cvLink.href = docUrl;
            cvLink.style.display = '';
          }
          if (cvDownload) {
            cvDownload.href = docUrl;
            cvDownload.style.display = '';
          }
          if (cvRow) cvRow.style.display = 'flex';
        } else {
          if (cvLink) cvLink.style.display = 'none';
          if (cvDownload) cvDownload.style.display = 'none';
          if (cvRow) cvRow.style.display = 'none';
        }

        if (facultyImg && faculty && faculty.photo && !faculty.photo.includes('placeholder')) {
          const photoUrl = (isSubdir ? '../' : '') + faculty.photo;
          facultyImg.src = photoUrl;
        }
      };

      if (window.loadEchemData) {
        window.loadEchemData(facultyDataPath)
          .then(applyCvConfig)
          .catch(() => {
            applyCvConfig(window.EchemData && window.EchemData.faculty);
          });
      } else if (window.EchemData && window.EchemData.faculty) {
        applyCvConfig(window.EchemData.faculty);
      } else {
        applyCvConfig(null);
      }
    }
  });

  // Offline-First Service Worker Registration
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      const isSubdir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('/games/');
      const swUrl = (isSubdir ? '../' : './') + 'sw.js';
      navigator.serviceWorker.register(swUrl).catch(() => {});
    });
  }

  // Global helper to open modal
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  };
})();
