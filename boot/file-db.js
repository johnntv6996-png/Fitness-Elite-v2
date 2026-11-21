// boot/file-db.js
(function() {
  'use strict';

  var DB_NAME = 'FitnessEliteV2_DB';
  var DB_VERSION = 1;
  var dbInstance = null;

  function openDB() {
    return new Promise(function(resolve, reject) {
      if (dbInstance) {
        resolve(dbInstance);
        return;
      }

      var request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function(event) {
        var db = event.target.result;

        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('prod_files')) {
          db.createObjectStore('prod_files', { keyPath: 'path' });
        }

        if (!db.objectStoreNames.contains('dev_files')) {
          db.createObjectStore('dev_files', { keyPath: 'path' });
        }
      };

      request.onsuccess = function(event) {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = function(event) {
        reject(new Error('IndexedDB error: ' + (event.target.error && event.target.error.message)));
      };
    });
  }

  function getStoreName(env) {
    return env === 'dev' ? 'dev_files' : 'prod_files';
  }

  function getMeta(key) {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var request = db.transaction('meta', 'readonly')
          .objectStore('meta')
          .get(key);

        request.onsuccess = function() {
          resolve(request.result ? request.result.value : null);
        };

        request.onerror = function() {
          reject(request.error);
        };
      });
    });
  }

  function setMeta(key, value) {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var transaction = db.transaction('meta', 'readwrite');

        transaction.objectStore('meta').put({
          key: key,
          value: value
        });

        transaction.oncomplete = function() {
          resolve(true);
        };

        transaction.onerror = function() {
          reject(transaction.error);
        };
      });
    });
  }

  function saveFiles(env, files) {
    var storeName = getStoreName(env);

    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var transaction = db.transaction(storeName, 'readwrite');
        var store = transaction.objectStore(storeName);

        for (var i = 0; i < files.length; i++) {
          store.put(files[i]);
        }

        transaction.oncomplete = function() {
          resolve(true);
        };

        transaction.onerror = function() {
          reject(transaction.error);
        };
      });
    });
  }

  function getAllFiles(env) {
    var storeName = getStoreName(env);

    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var request = db.transaction(storeName, 'readonly')
          .objectStore(storeName)
          .getAll();

        request.onsuccess = function() {
          resolve(request.result || []);
        };

        request.onerror = function() {
          reject(request.error);
        };
      });
    });
  }

  function clearEnv(env) {
    var storeName = getStoreName(env);

    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var transaction = db.transaction(storeName, 'readwrite');

        transaction.objectStore(storeName).clear();

        transaction.oncomplete = function() {
          resolve(true);
        };

        transaction.onerror = function() {
          reject(transaction.error);
        };
      });
    });
  }

  function deleteFile(env, path) {
    var storeName = getStoreName(env);

    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var transaction = db.transaction(storeName, 'readwrite');

        transaction.objectStore(storeName).delete(path);

        transaction.oncomplete = function() {
          resolve(true);
        };

        transaction.onerror = function() {
          reject(transaction.error);
        };
      });
    });
  }

  function saveSingleFile(env, file) {
    return saveFiles(env, [file]);
  }

  function copyProdToDev() {
    return Promise.all([
      getMeta('manifest_prod'),
      getAllFiles('prod')
    ]).then(function(result) {
      var manifest = result[0];
      var files = result[1];

      if (!manifest || !files.length) {
        throw new Error('В PROD нет файлов для копирования');
      }

      return clearEnv('dev').then(function() {
        return saveFiles('dev', files);
      }).then(function() {
        return setMeta('manifest_dev', JSON.parse(JSON.stringify(manifest)));
      });
    });
  }

  function copyDevToProd() {
    return Promise.all([
      getMeta('manifest_dev'),
      getAllFiles('dev')
    ]).then(function(result) {
      var manifest = result[0];
      var files = result[1];

      if (!manifest || !files.length) {
        throw new Error('В DEV нет файлов для переноса');
      }

      return clearEnv('prod').then(function() {
        return saveFiles('prod', files);
      }).then(function() {
        return setMeta('manifest_prod', JSON.parse(JSON.stringify(manifest)));
      });
    });
  }

  window.FileDB = {
    getMeta: getMeta,
    setMeta: setMeta,
    saveFiles: saveFiles,
    saveSingleFile: saveSingleFile,
    getAllFiles: getAllFiles,
    clearEnv: clearEnv,
    deleteFile: deleteFile,
    copyProdToDev: copyProdToDev,
    copyDevToProd: copyDevToProd
  };
})();
