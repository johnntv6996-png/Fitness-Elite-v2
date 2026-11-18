// app/file-db.js
(function() {
  'use strict';

  var DB_NAME = 'FitnessEliteV2_DB';
  var DB_VERSION = 1;
  var dbInstance = null;

  function openDB() {
    return new Promise(function(resolve, reject) {
      if (dbInstance) { resolve(dbInstance); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('prod_files')) db.createObjectStore('prod_files', { keyPath: 'path' });
        if (!db.objectStoreNames.contains('dev_files')) db.createObjectStore('dev_files', { keyPath: 'path' });
      };

      req.onsuccess = function(e) { dbInstance = e.target.result; resolve(dbInstance); };
      req.onerror = function(e) { reject(new Error('IndexedDB error: ' + (e.target.error && e.target.error.message))); };
    });
  }

  function getMeta(key) {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var req = db.transaction('meta', 'readonly').objectStore('meta').get(key);
        req.onsuccess = function() { resolve(req.result ? req.result.value : null); };
        req.onerror = function() { reject(req.error); };
      });
    });
  }

  function setMeta(key, value) {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction('meta', 'readwrite');
        tx.objectStore('meta').put({ key: key, value: value });
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { reject(tx.error); };
      });
    });
  }

  function saveFiles(env, filesList) {
    var store = env === 'dev' ? 'dev_files' : 'prod_files';
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(store, 'readwrite');
        var os = tx.objectStore(store);
        for (var i = 0; i < filesList.length; i++) os.put(filesList[i]);
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { reject(tx.error); };
      });
    });
  }

  function getAllFiles(env) {
    var store = env === 'dev' ? 'dev_files' : 'prod_files';
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var req = db.transaction(store, 'readonly').objectStore(store).getAll();
        req.onsuccess = function() { resolve(req.result || []); };
        req.onerror = function() { reject(req.error); };
      });
    });
  }

  function clearEnv(env) {
    var store = env === 'dev' ? 'dev_files' : 'prod_files';
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { reject(tx.error); };
      });
    });
  }

  window.FileDB = {
    getMeta: getMeta,
    setMeta: setMeta,
    saveFiles: saveFiles,
    getAllFiles: getAllFiles,
    clearEnv: clearEnv
  };
})();
