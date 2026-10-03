/**
 * config.js — Dynamic Runtime Configuration for e-chemEd
 * 
 * Computes API_BASE dynamically so requests work seamlessly from:
 * 1. Localhost: http://localhost:3000 -> http://localhost:3001
 * 2. Mobile/Tablet over Wi-Fi LAN: http://192.168.x.x:3000 -> http://192.168.x.x:3001
 * 3. Local file:// protocol (falls back to http://localhost:3001)
 * 4. Production remote deployments (via window.__ECHEMED_API_OVERRIDE__ or localStorage)
 */

(function () {
  'use strict';

  let backendPort = '3001';

  // Compute default base URL based on active window location
  function computeBaseUrl(port) {
    // 1. Check for manual override in window object or localStorage
    if (typeof window.__ECHEMED_API_OVERRIDE__ === 'string' && window.__ECHEMED_API_OVERRIDE__.trim()) {
      return window.__ECHEMED_API_OVERRIDE__.trim().replace(/\/+$/, '');
    }

    try {
      const storedOverride = localStorage.getItem('echemed_api_override');
      if (storedOverride && storedOverride.trim()) {
        return storedOverride.trim().replace(/\/+$/, '');
      }
    } catch (e) {
      // Ignore localStorage errors in restricted contexts
    }

    // 2. Local file preview fallback
    if (window.location.protocol === 'file:') {
      return `http://localhost:${port}`;
    }

    // 3. Dynamic origin derivation for localhost & LAN IP addresses
    const protocol = window.location.protocol;
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:${port}`;
  }

  const config = {
    backendPort: backendPort,
    API_BASE: computeBaseUrl(backendPort),
    getApiBase: function () {
      return this.API_BASE;
    },
    setOverride: function (url) {
      if (url) {
        localStorage.setItem('echemed_api_override', url.trim());
      } else {
        localStorage.removeItem('echemed_api_override');
      }
      this.API_BASE = computeBaseUrl(this.backendPort);
    }
  };

  // Asynchronously query /config.json if served over HTTP/S to verify port configuration
  if (window.location.protocol.startsWith('http')) {
    fetch('/config.json', { cache: 'no-store' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Config file unavailable');
      })
      .then(data => {
        if (data && data.backendPort) {
          config.backendPort = String(data.backendPort);
          config.API_BASE = computeBaseUrl(config.backendPort);
        }
      })
      .catch(() => {
        // Quiet fallback to default :3001
      });
  }

  window.ECHEMED_CONFIG = config;
})();
