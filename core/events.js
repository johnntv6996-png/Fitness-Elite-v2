// core/events.js
(function() {
  'use strict';

  var listeners = {};

  function on(event, fn) {
    if (typeof fn !== 'function') return function() {};
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return function off() {
      var arr = listeners[event];
      if (!arr) return;
      var i = arr.indexOf(fn);
      if (i !== -1) arr.splice(i, 1);
    };
  }

  function emit(event, payload) {
    var arr = listeners[event];
    if (!arr) return;
    var copy = arr.slice();
    for (var i = 0; i < copy.length; i++) {
      try { copy[i](payload); } catch (e) { console.error('[Events]', event, e); }
    }
  }

  window.Events = { on: on, emit: emit };
})();
