/**
 * auth.js — Open Access Utility & Compatibility Layer
 * 
 * Login requirement is removed across all pages.
 * All syllabus units, mind maps, quizzes, question banks, games, and attendance
 * are directly and publicly accessible without authentication.
 */

(function () {
  'use strict';

  function getApiBase() {
    if (window.ECHEMED_CONFIG && typeof window.ECHEMED_CONFIG.getApiBase === 'function') {
      return window.ECHEMED_CONFIG.getApiBase();
    }
    return '';
  }

  function getRootPrefix() {
    const p = window.location.pathname.replace(/\\/g, '/');
    if (p.includes('/pages/') || p.includes('/games/')) {
      return '../';
    }
    return './';
  }

  const auth = {
    currentUser: null,
    isInitialized: true,

    getToken() {
      return '';
    },

    setToken() {},

    getCachedUser() {
      return null;
    },

    setCachedUser() {},

    getAuthHeaders() {
      return {
        'Content-Type': 'application/json'
      };
    },

    async checkAuth() {
      this.isInitialized = true;
      return null;
    },

    async login() {
      return { ok: true };
    },

    async logout() {
      const prefix = getRootPrefix();
      window.location.replace(`${prefix}index.html`);
    }
  };

  window.EchemAuth = auth;
})();
