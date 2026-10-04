/**
 * config.js — Dynamic Runtime Configuration for e-chemEd
 * 
 * Computes API_BASE dynamically so requests work seamlessly from:
 * 1. Production Vercel & Cloud Deployments: Same-origin relative ('') without hardcoded localhost assumptions.
 * 2. Localhost: http://localhost:3000 -> http://localhost:3001 (or same-origin via reverse proxy)
 * 3. Mobile/Tablet over Wi-Fi LAN: http://192.168.x.x:3000 -> http://192.168.x.x:3001
 * 4. Local file:// protocol (falls back to http://localhost:3001)
 * 5. Manual overrides via window.__ECHEMED_API_OVERRIDE__ or localStorage['echemed_api_override']
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
      return `http://localhost:${port || 3001}`;
    }

    const protocol = window.location.protocol;
    const hostname = window.location.hostname || 'localhost';
    const currentPort = window.location.port;

    // 3. Deployed environments and local frontend proxy (port 3000)
    // When running on Vercel, cloud domain, standard web ports, or serve-frontend.js (port 3000),
    // API routes are on the same origin ('') via reverse proxy or serverless routing.
    const isVercel = hostname.endsWith('.vercel.app') || window.location.host.includes('vercel');
    const isStandardPort = !currentPort || currentPort === '80' || currentPort === '443';
    const isFrontendProxyPort = currentPort === '3000';

    if (isVercel || isStandardPort || isFrontendProxyPort) {
      return ''; // Same-origin relative URL (/api/...)
    }

    // 4. Non-proxied static servers (e.g. VS Code Live Server on port 5500)
    return `${protocol}//${hostname}:${port || 3001}`;
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
        if (data) {
          if (data.sameOrigin) {
            config.API_BASE = '';
          } else if (data.backendPort) {
            config.backendPort = String(data.backendPort);
            if (!localStorage.getItem('echemed_api_override') && !window.__ECHEMED_API_OVERRIDE__) {
              config.API_BASE = computeBaseUrl(config.backendPort);
            }
          }
        }
      })
      .catch(() => {
        // Quiet fallback to computed base
      });
  }

  window.ECHEMED_CONFIG = config;
})();
