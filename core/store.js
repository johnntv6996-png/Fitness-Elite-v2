// core/store.js
(function() {
  'use strict';

  function prefix() {
    var env = (window.App && window.App.env) ? window.App.env : 'prod';
    return 'fe_' + env + '_';
  }

  function get(key, fallback) {
    try {
      var raw = localStorage.getItem(prefix() + key);
      return raw === null ? (fallback !== undefined ? fallback : null) : JSON.parse(raw);
    } catch (e) {
      return fallback !== undefined ? fallback : null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(prefix() + key, JSON.stringify(value));
      if (window.Events) window.Events.emit('store:' + key, value);
      return true;
    } catch (e) {
      console.error('[Store] Write failed:', key, e);
      return false;
    }
  }

  function remove(key) {
    try { localStorage.removeItem(prefix() + key); } catch (e) {}
  }

  function esc(text) {
    if (text == null) return '';
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  window.Store = {
    get: get,
    set: set,
    remove: remove,
    esc: esc
  };
})();
