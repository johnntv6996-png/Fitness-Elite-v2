// core/store.js
(function() {
  'use strict';

  var env = (window.App && window.App.env === 'dev') ? 'dev' : 'prod';
  var PREFIX = 'fe_' + env + '_';

  function get(key, fallback) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      return raw === null ? (fallback !== undefined ? fallback : null) : JSON.parse(raw);
    } catch (e) {
      return fallback !== undefined ? fallback : null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      if (window.Events) Events.emit('store:' + key, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      if (window.Events) Events.emit('store:' + key, null);
    } catch (e) {}
  }

  function esc(text) {
    if (text == null) return '';
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  window.Store = { prefix: PREFIX, get: get, set: set, remove: remove, esc: esc };
})();
