// core/events.js
(function() {
  'use strict';

  var listeners = {};

  function on(eventName, fn) {
    if (typeof fn !== 'function') return function() {};
    if (!listeners[eventName]) listeners[eventName] = [];
    listeners[eventName].push(fn);
    return function off() { offEvent(eventName, fn); };
  }

  function once(eventName, fn) {
    var off = on(eventName, function handler(payload) { off(); fn(payload); });
    return off;
  }

  function offEvent(eventName, fn) {
    var arr = listeners[eventName];
    if (!arr) return;
    var idx = arr.indexOf(fn);
    if (idx !== -1) arr.splice(idx, 1);
    if (arr.length === 0) delete listeners[eventName];
  }

  function emit(eventName, payload) {
    var arr = listeners[eventName];
    if (!arr || arr.length === 0) return;
    var snapshot = arr.slice();
    for (var i = 0; i < snapshot.length; i++) {
      try { snapshot[i](payload); } catch (e) { console.error('[Events] Error in ' + eventName, e); }
    }
  }

  window.Events = { on: on, once: once, off: offEvent, emit: emit };
})();
