/**
 * e-chemEd Motion System Engine
 * "A well-made printed textbook coming to life"
 * 
 * Responsibilities:
 * 1. Reduced-motion preference management (OS, user toggle, low-end device, saveData)
 * 2. IntersectionObserver for scroll-driven page reveals
 * 3. Numerical count-up engine with ease-out curve
 * 4. Tab visibility awareness (pauses animations when hidden)
 * 5. Global API window.EchemMotion for games and modules
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'echemed_motion';

  // SVG Icons for Motion Toggle
  const MOTION_ON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M10 8l6 4-6 4V8z"></path></svg>`;
  const MOTION_OFF_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><rect x="9" y="8" width="2" height="8"></rect><rect x="13" y="8" width="2" height="8"></rect></svg>`;

  // Determine initial motion preference
  function getInitialMotionPreference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'reduced' || stored === 'full') {
        return stored;
      }
    } catch (e) {}

    // Check OS preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'reduced';
    }

    // Check Save-Data header/client hint
    if (navigator.connection && navigator.connection.saveData === true) {
      return 'reduced';
    }

    // Detect low-end device (<= 4 cores and <= 2GB RAM)
    if (
      navigator.hardwareConcurrency &&
      navigator.hardwareConcurrency <= 4 &&
      navigator.deviceMemory &&
      navigator.deviceMemory <= 2
    ) {
      return 'reduced';
    }

    return 'full';
  }

  function applyMotionPreference(pref, saveToStorage = true) {
    const isReduced = pref === 'reduced';
    document.documentElement.setAttribute('data-motion', isReduced ? 'reduced' : 'full');

    if (saveToStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, isReduced ? 'reduced' : 'full');
      } catch (e) {}
    }

    updateMotionUI(isReduced);

    // If reduced motion activated, immediately reveal any waiting scroll elements
    if (isReduced) {
      document.querySelectorAll('.reveal-on-scroll:not(.is-revealed)').forEach((el) => {
        el.classList.add('is-revealed');
      });
    }

    window.dispatchEvent(new CustomEvent('echemed:motion-changed', { detail: { isReduced } }));
  }

  function updateMotionUI(isReduced) {
    const buttons = document.querySelectorAll('.motion-toggle-btn');
    buttons.forEach((btn) => {
      const label = isReduced ? 'Enable motion' : 'Reduce motion';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);

      const iconSlot = btn.querySelector('.motion-icon-slot');
      if (iconSlot) {
        iconSlot.innerHTML = isReduced ? MOTION_OFF_SVG : MOTION_ON_SVG;
      } else {
        btn.innerHTML = `${isReduced ? MOTION_OFF_SVG : MOTION_ON_SVG} <span class="motion-toggle-badge">${isReduced ? 'OFF' : 'ON'}</span>`;
      }

      const labelSlot = btn.querySelector('.motion-label-slot');
      if (labelSlot) {
        labelSlot.textContent = isReduced ? 'Motion: Reduced' : 'Motion: Normal';
      }
    });
  }

  // Apply preference immediately to documentElement
  const currentPref = getInitialMotionPreference();
  applyMotionPreference(currentPref, false);

  // Global EchemMotion API
  window.EchemMotion = {
    isReduced() {
      return document.documentElement.getAttribute('data-motion') === 'reduced';
    },

    toggle() {
      const next = this.isReduced() ? 'full' : 'reduced';
      applyMotionPreference(next, true);
      return next;
    },

    setPreference(pref) {
      applyMotionPreference(pref, true);
    },

    /**
     * Animate a numeric counter with ease-out cubic progression
     */
    animateNumber(element, start, end, duration = 600, formatter = (v) => Math.round(v)) {
      if (!element) return;
      if (this.isReduced()) {
        element.textContent = formatter(end);
        return;
      }

      const startTime = performance.now();
      const change = end - start;

      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Cubic ease out
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = start + change * easeOut;
        element.textContent = formatter(currentVal);

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          element.textContent = formatter(end);
        }
      }

      requestAnimationFrame(update);
    },

    /**
     * Trigger accessible validation shake (WCAG <= 200ms) without forced synchronous layout
     */
    shake(element) {
      if (!element || this.isReduced()) return;
      element.classList.remove('motion-shake');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          element.classList.add('motion-shake');
          setTimeout(() => {
            element.classList.remove('motion-shake');
          }, 220);
        });
      });
    },

    /**
     * Re-observe newly injected dynamic DOM nodes (e.g. from async JSON fetches)
     */
    refresh() {
      if (this.isReduced()) {
        document.querySelectorAll('.reveal-on-scroll:not(.is-revealed)').forEach((el) => {
          el.classList.add('is-revealed');
        });
        return;
      }
      if (activeScrollObserver) {
        document.querySelectorAll('.reveal-on-scroll:not(.is-revealed)').forEach((el) => {
          activeScrollObserver.observe(el);
        });
      }
      if (activeCounterObserver) {
        document.querySelectorAll('[data-counter-target]:not(.is-counted)').forEach((el) => {
          activeCounterObserver.observe(el);
        });
      }
    }
  };

  let activeScrollObserver = null;
  let activeCounterObserver = null;

  // Delegated click handler for motion toggle buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.motion-toggle-btn');
    if (btn) {
      e.preventDefault();
      window.EchemMotion.toggle();
    }
  });

  // Listen to OS prefers-reduced-motion changes if user hasn't explicitly set localStorage
  if (window.matchMedia) {
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) {
          applyMotionPreference(e.matches ? 'reduced' : 'full', false);
        }
      } catch (err) {}
    });
  }

  // Pause animations when tab becomes hidden (conserves CPU/battery on mobile)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      document.documentElement.classList.add('tab-hidden-paused');
    } else {
      document.documentElement.classList.remove('tab-hidden-paused');
    }
  });

  // Auto-stop skeleton loading shimmers at 3.0s (WCAG 2.2.2 compliance)
  setTimeout(() => {
    document.querySelectorAll('.skeleton-loading').forEach((el) => {
      el.classList.remove('skeleton-loading');
    });
  }, 3000);

  // Initialize Scroll Observer and UI states on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    // Signal CSS that JS is active so scroll animations can prepare
    document.documentElement.classList.add('js-motion-ready');

    updateMotionUI(window.EchemMotion.isReduced());

    // Setup IntersectionObserver for .reveal-on-scroll elements
    if ('IntersectionObserver' in window) {
      activeScrollObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '0px 0px -40px 0px',
          threshold: 0.15
        }
      );

      document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
        if (window.EchemMotion.isReduced()) {
          el.classList.add('is-revealed');
        } else {
          activeScrollObserver.observe(el);
        }
      });

      // Setup Counter Observer for [data-counter-target]
      activeCounterObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target;
              el.classList.add('is-counted');
              const target = parseFloat(el.getAttribute('data-counter-target')) || 0;
              const suffix = el.getAttribute('data-counter-suffix') || '';
              window.EchemMotion.animateNumber(
                el,
                0,
                target,
                600,
                (v) => Math.round(v) + suffix
              );
              observer.unobserve(el);
            }
          });
        },
        { threshold: 0.3 }
      );

      document.querySelectorAll('[data-counter-target]').forEach((el) => {
        activeCounterObserver.observe(el);
      });
    } else {
      // Fallback if IntersectionObserver is unsupported
      document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
        el.classList.add('is-revealed');
      });
    }

    // Initialize calm hero periodic tile flip sequence
    initHeroTileSequence();
  });

  function initHeroTileSequence() {
    const tiles = document.querySelectorAll('.hero-ptable-mini .mini-tile');
    if (!tiles || tiles.length === 0) return;

    let currentIndex = 0;
    let flipTimer = null;
    let isHeroVisible = true;

    if ('IntersectionObserver' in window) {
      const heroContainer = document.querySelector('.hero-section');
      if (heroContainer) {
        const obs = new IntersectionObserver((entries) => {
          isHeroVisible = entries[0].isIntersecting;
        }, { threshold: 0.1 });
        obs.observe(heroContainer);
      }
    }

    function flipNextTile() {
      if (
        window.EchemMotion.isReduced() ||
        document.hidden ||
        !isHeroVisible
      ) {
        flipTimer = setTimeout(flipNextTile, 4000);
        return;
      }

      const tile = tiles[currentIndex];
      if (tile) {
        tile.classList.add('is-flipping');
        setTimeout(() => {
          tile.classList.remove('is-flipping');
        }, 700);
      }

      currentIndex = (currentIndex + 1) % tiles.length;
      flipTimer = setTimeout(flipNextTile, 4500);
    }

    // Start initial sequence calmly after 2.5s
    flipTimer = setTimeout(flipNextTile, 2500);
  }
})();
