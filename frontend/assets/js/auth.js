/**
 * auth.js — Client-Side Authentication Guard & Session Controller
 * 
 * Provides:
 * - window.EchemAuth: login, logout, session verification, user state
 * - Automatic route guarding: redirects unauthenticated users to /pages/login.html
 * - Synchronizes with backend SQLite sessions and HTTP-only cookies
 */

(function () {
  'use strict';

  const TOKEN_KEY = 'echemed_session_token';
  const USER_KEY = 'echemed_user_cache';

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

  const isLoginPage = window.location.pathname.replace(/\\/g, '/').endsWith('login.html');

  const auth = {
    currentUser: null,
    isInitialized: false,

    getToken() {
      try {
        return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
      } catch (e) {
        return '';
      }
    },

    setToken(token) {
      try {
        if (token) {
          sessionStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          sessionStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch (e) {}
    },

    getCachedUser() {
      try {
        const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    setCachedUser(user) {
      try {
        if (user) {
          sessionStorage.setItem(USER_KEY, JSON.stringify(user));
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
          sessionStorage.removeItem(USER_KEY);
          localStorage.removeItem(USER_KEY);
        }
      } catch (e) {}
    },

    getAuthHeaders() {
      const headers = {
        'Content-Type': 'application/json'
      };
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-session-token'] = token;
      }
      return headers;
    },

    async checkAuth() {
      const apiBase = getApiBase();
      const token = this.getToken();

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-session-token'] = token;
      }

      try {
        const res = await fetch(`${apiBase}/api/auth/me`, {
          method: 'GET',
          headers,
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.ok && data.user) {
            this.currentUser = data.user;
            this.setCachedUser(data.user);
            this.isInitialized = true;
            window.dispatchEvent(new CustomEvent('echemed:auth-changed', { detail: { user: this.currentUser } }));
            return this.currentUser;
          }
        } else if (res.status === 401) {
          // Explicit 401 Unauthorized: Session is genuinely expired, purged, or invalid
          this.currentUser = null;
          this.setCachedUser(null);
          this.setToken(null);
          this.isInitialized = true;
          window.dispatchEvent(new CustomEvent('echemed:auth-changed', { detail: { user: null } }));

          // If on protected page, redirect to login
          if (!isLoginPage) {
            const currentPath = window.location.pathname + window.location.search;
            const prefix = getRootPrefix();
            window.location.replace(`${prefix}pages/login.html?redirect=${encodeURIComponent(currentPath)}`);
          }
          return null;
        } else {
          // Server error (500, 502, 503, 504) or transient endpoint status:
          // Resilient fallback: DO NOT wipe token or force redirect.
          console.warn('[AUTH] Non-terminal server response during auth check:', res.status);
          const cached = this.getCachedUser();
          if (cached) {
            this.currentUser = cached;
            this.isInitialized = true;
            return this.currentUser;
          }
        }
      } catch (err) {
        // Network disruption / offline: preserve cached session
        console.warn('[AUTH] Network error during auth check:', err.message);
        const cached = this.getCachedUser();
        if (cached) {
          this.currentUser = cached;
          this.isInitialized = true;
          return this.currentUser;
        }
      }

      // If user had no token and no cached user, redirect if on protected page
      if (!this.getToken() && !this.getCachedUser()) {
        this.currentUser = null;
        this.isInitialized = true;
        window.dispatchEvent(new CustomEvent('echemed:auth-changed', { detail: { user: null } }));

        if (!isLoginPage) {
          const currentPath = window.location.pathname + window.location.search;
          const prefix = getRootPrefix();
          window.location.replace(`${prefix}pages/login.html?redirect=${encodeURIComponent(currentPath)}`);
        }
      }

      return this.currentUser;
    },

    async login(username, password) {
      const apiBase = getApiBase();

      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(
          res.status === 500
            ? 'Server error: Database not connected. Please attach a Postgres database in your Vercel project Storage tab.'
            : `Network error (${res.status}). Please try again.`
        );
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your username and password.');
      }

      this.currentUser = data.user;
      this.setToken(data.token);
      this.setCachedUser(data.user);
      this.isInitialized = true;

      window.dispatchEvent(new CustomEvent('echemed:auth-changed', { detail: { user: this.currentUser } }));
      return data;
    },

    async logout() {
      const apiBase = getApiBase();
      const headers = this.getAuthHeaders();

      try {
        await fetch(`${apiBase}/api/auth/logout`, {
          method: 'POST',
          headers,
          credentials: 'include'
        });
      } catch (e) {}

      this.currentUser = null;
      this.setToken(null);
      this.setCachedUser(null);
      window.dispatchEvent(new CustomEvent('echemed:auth-changed', { detail: { user: null } }));

      const prefix = getRootPrefix();
      window.location.replace(`${prefix}pages/login.html`);
    }
  };

  // Pre-seed currentUser from cache for immediate UI rendering without layout shifts
  auth.currentUser = auth.getCachedUser();

  // Multi-tab cross-tab synchronization
  window.addEventListener('storage', function (e) {
    if (e.key === TOKEN_KEY || e.key === USER_KEY) {
      const updatedUser = auth.getCachedUser();
      const updatedToken = auth.getToken();

      if (!updatedToken || !updatedUser) {
        auth.currentUser = null;
        window.dispatchEvent(new CustomEvent('echemed:auth-changed', { detail: { user: null } }));
        if (!isLoginPage) {
          const currentPath = window.location.pathname + window.location.search;
          const prefix = getRootPrefix();
          window.location.replace(`${prefix}pages/login.html?redirect=${encodeURIComponent(currentPath)}`);
        }
      } else {
        auth.currentUser = updatedUser;
        window.dispatchEvent(new CustomEvent('echemed:auth-changed', { detail: { user: updatedUser } }));
      }
    }
  });

  window.EchemAuth = auth;

  // Run auth guard check on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      auth.checkAuth();
    });
  } else {
    auth.checkAuth();
  }
})();
