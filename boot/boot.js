// boot/boot.js
(function() {
  'use strict';

  var proto = 'https:' + '//';
  var host = 'raw' + '.githubusercontent.com';
  var repo = 'johnntv6996-png' + '/' + 'Fitness-Elite-v2' + '/main/';
  var GITHUB_BASE = proto + host + '/' + repo;
  var ENV_KEY = 'fe_v2_env';

  function detectEnv() {
    try {
      var q = new URLSearchParams(window.location.search);
      if (q.get('dev') === '1') { localStorage.setItem(ENV_KEY, 'dev'); return 'dev'; }
      if (q.get('dev') === '0') { localStorage.setItem(ENV_KEY, 'prod'); return 'prod'; }
      return localStorage.getItem(ENV_KEY) === 'dev' ? 'dev' : 'prod';
    } catch (e) { return 'prod'; }
  }

  var CURRENT_ENV = detectEnv();

  var _modules = new Map();
  window.App = {
    env: CURRENT_ENV,
    define: function(id, moduleObj) { _modules.set(id, moduleObj); },
    getModule: function(id) { return _modules.get(id) || null; },
    getAllModules: function() { return _modules; },
    switchEnv: function(targetEnv) {
      if (targetEnv !== 'prod' && targetEnv !== 'dev') return;
      try { localStorage.setItem(ENV_KEY, targetEnv); } catch (e) {}
      location.reload();
    },
    importLocalFolder: function(fileList) {
      if (!fileList || !fileList.length) return;
      var byRel = {};
      for (var i = 0; i < fileList.length; i++) {
        var parts = fileList[i].webkitRelativePath.split('/');
        parts.shift();
        var rel = parts.join('/');
        if (rel) byRel[rel] = fileList[i];
      }
      if (!byRel['manifest.json']) { renderStatus('Ошибка', 'В папке нет manifest.json', true); return; }
      byRel['manifest.json'].text().then(function(txt) {
        var manifest = JSON.parse(txt);
        var missing = [], records = [];
        var jobs = (manifest.files || []).map(function(entry) {
          var f = byRel[entry.path];
          if (!f) { if (entry.required) missing.push(entry.path); return Promise.resolve(); }
          var reader = entry.type === 'font' ? Promise.resolve(f) : f.text();
          return reader.then(function(content) {
            records.push({ path: entry.path, type: entry.type, id: entry.id || null, required: !!entry.required, content: content, version: manifest.version });
          });
        });
        return Promise.all(jobs).then(function() {
          if (missing.length) { renderStatus('Не хватает файлов', 'Проверь состав папки', true, missing); return; }
          return FileDB.saveFiles(CURRENT_ENV, records).then(function() {
            return FileDB.setMeta('manifest_' + CURRENT_ENV, manifest);
          }).then(function() { location.reload(); });
        });
      });
    }
  };

  function renderStatus(title, subtitle, isError, missingList) {
    var root = document.getElementById('app');
    if (!root) return;
    var listHtml = (missingList && missingList.length)
      ? '<div style="margin:12px auto;padding:10px;max-width:400px;text-align:left;background:rgba(248,113,113,0.1);border:1px solid #f87171;border-radius:8px;font-size:0.8em">' +
        '<strong>Не найдены файлы:</strong><br>' + missingList.join('<br>') + '</div>'
      : '';
    var retryHtml = isError
      ? '<div style="display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap">' +
          '<button onclick="location.reload()" style="padding:10px 22px;border-radius:10px;border:none;background:#d4af37;color:#000;font-weight:700;cursor:pointer">Повторить</button>' +
          '<label style="padding:10px 20px;border-radius:10px;border:1px solid #d4af37;color:#d4af37;font-weight:600;cursor:pointer">' +
            'Выбрать папку с файлами<input type="file" webkitdirectory directory multiple style="display:none" onchange="App.importLocalFolder(this.files)">' +
          '</label>' +
        '</div>'
      : '';
    root.innerHTML =
      '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center">' +
        '<div style="font-size:1.4em;font-weight:800;color:' + (isError ? '#f87171' : '#d4af37') + ';margin-bottom:8px">' + title + '</div>' +
        '<div style="font-size:0.9em;opacity:0.75;max-width:400px">' + subtitle + '</div>' +
        listHtml + retryHtml +
      '</div>';
  }

  function fetchTimeout(url, ms) {
    return new Promise(function(resolve, reject) {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var t = setTimeout(function() { if (ctrl) ctrl.abort(); reject(new Error('Timeout')); }, ms || 8000);
      fetch(url, { signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
        .then(function(r) { clearTimeout(t); if (!r.ok) reject(new Error('HTTP ' + r.status)); else resolve(r); })
        .catch(function(e) { clearTimeout(t); reject(e); });
    });
  }
  function downloadFiles(baseUrl, manifest) {
    var list = manifest.files || [];
    var result = [], missing = [];
    var jobs = list.map(function(entry) {
      var url = baseUrl + entry.path + (baseUrl.indexOf('http') === 0 ? '?t=' + Date.now() : '');
      return fetchTimeout(url, 8000)
        .then(function(r) { return entry.type === 'font' ? r.blob() : r.text(); })
        .then(function(data) {
          if (!data || (typeof data === 'string' && !data.trim())) throw new Error('Empty file');
          result.push({
            path: entry.path, type: entry.type, id: entry.id || null,
            required: !!entry.required, content: data, version: manifest.version
          });
        })
        .catch(function() { if (entry.required) missing.push(entry.path); });
    });
    return Promise.all(jobs).then(function() {
      if (missing.length > 0) {
        var err = new Error('Missing required files');
        err.missing = missing;
        throw err;
      }
      return result;
    });
  }

  function mountBundle(manifest, files) {
    var byPath = {}, fontUrls = {};
    for (var i = 0; i < files.length; i++) {
      byPath[files[i].path] = files[i];
      if (files[i].type === 'font' && files[i].content instanceof Blob) {
        fontUrls[files[i].path] = URL.createObjectURL(files[i].content);
      }
    }

    var ordered = manifest.files || [];
    var cssList = [], scriptList = [];
    for (var j = 0; j < ordered.length; j++) {
      var item = byPath[ordered[j].path];
      if (!item || item.type === 'font') continue;
      if (item.type === 'css') cssList.push(item);
      else scriptList.push(item);
    }

    for (var c = 0; c < cssList.length; c++) {
      var cssText = cssList[c].content;
      for (var fPath in fontUrls) cssText = cssText.split(fPath).join(fontUrls[fPath]);
      var st = document.createElement('style');
      st.setAttribute('data-file', cssList[c].path);
      st.textContent = cssText;
      document.head.appendChild(st);
    }

    function runNext(idx) {
      if (idx >= scriptList.length) return Promise.resolve();
      var file = scriptList[idx];
      return new Promise(function(resolve, reject) {
        var blob = new Blob([file.content + '\n//# sourceURL=' + file.path], { type: 'application/javascript' });
        var url = URL.createObjectURL(blob);
        var s = document.createElement('script');
        s.src = url;
        s.onload = function() { URL.revokeObjectURL(url); resolve(); };
        s.onerror = function() { URL.revokeObjectURL(url); reject(new Error('Script error: ' + file.path)); };
        document.body.appendChild(s);
      }).then(function() { return runNext(idx + 1); });
    }

    return runNext(0).then(function() {
      _modules.forEach(function(mod, id) {
        if (mod && typeof mod.init === 'function') {
          try { mod.init(); } catch (e) { console.error('Init error in module ' + id, e); }
        }
      });
    });
  }

  function checkRemoteUpdate(currentVersion) {
    if (CURRENT_ENV !== 'prod') return;
    fetchTimeout(GITHUB_BASE + 'manifest.json?t=' + Date.now(), 5000)
      .then(function(r) { return r.json(); })
      .then(function(remoteManifest) {
        if (!remoteManifest || !remoteManifest.version || remoteManifest.version === currentVersion) return;
        if (window.Shell && typeof window.Shell.showUpdateToast === 'function') {
          window.Shell.showUpdateToast(currentVersion, remoteManifest, function() {
            return downloadFiles(GITHUB_BASE, remoteManifest).then(function(newFiles) {
              return FileDB.clearEnv('prod').then(function() {
                return FileDB.saveFiles('prod', newFiles);
              }).then(function() {
                return FileDB.setMeta('manifest_prod', remoteManifest);
              }).then(function() { location.reload(); });
            });
          });
        }
      })
      .catch(function() {});
  }

  function start() {
    renderStatus('FITNESS ELITE', 'Инициализация ядра...', false);

    Promise.all([FileDB.getMeta('manifest_' + CURRENT_ENV), FileDB.getAllFiles(CURRENT_ENV)])
      .then(function(res) {
        var cachedManifest = res.shift();
        var cachedFiles = res.shift();

        if (cachedManifest && cachedFiles && cachedFiles.length > 0) {
          return mountBundle(cachedManifest, cachedFiles).then(function() {
            checkRemoteUpdate(cachedManifest.version);
          });
        }

        renderStatus('Первая загрузка', 'Скачивание файлов приложения...', false);
        return fetchTimeout(GITHUB_BASE + 'manifest.json?t=' + Date.now(), 7000)
          .then(function(r) { return r.json(); })
          .then(function(m) { return downloadFiles(GITHUB_BASE, m).then(function(f) { return { manifest: m, files: f }; }); })
          .catch(function() {
            return fetchTimeout('./manifest.json', 3000)
              .then(function(r) { return r.json(); })
              .then(function(m) { return downloadFiles('./', m).then(function(f) { return { manifest: m, files: f }; }); });
          })
          .then(function(bundle) {
            return FileDB.saveFiles(CURRENT_ENV, bundle.files).then(function() {
              return FileDB.setMeta('manifest_' + CURRENT_ENV, bundle.manifest);
            }).then(function() { return mountBundle(bundle.manifest, bundle.files); });
          });
      })
      .catch(function(err) {
        renderStatus(
          'Ошибка запуска',
          'Не удалось загрузить приложение ни из сети, ни из локальной папки.',
          true,
          err && err.missing ? err.missing : ['manifest.json']
        );
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
