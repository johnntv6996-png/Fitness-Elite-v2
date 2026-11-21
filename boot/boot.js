// boot/boot.js
(function() {
  'use strict';

  var OWNER = 'johnntv6996-png';
  var REPO = 'Fitness-Elite-v2';

  var PROD_BASE = 'https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/main/';
  var DEV_ZIP_URL = 'https://github.com/' + OWNER + '/' + REPO + '/archive/refs/heads/dev.zip';

  var ENV_KEY = 'fe_v2_env';

  function detectEnv() {
    try {
      var params = new URLSearchParams(window.location.search);

      if (params.get('dev') === '1') {
        localStorage.setItem(ENV_KEY, 'dev');
        return 'dev';
      }

      if (params.get('dev') === '0') {
        localStorage.setItem(ENV_KEY, 'prod');
        return 'prod';
      }

      return localStorage.getItem(ENV_KEY) === 'dev' ? 'dev' : 'prod';
    } catch (error) {
      return 'prod';
    }
  }

  var CURRENT_ENV = detectEnv();
  var modules = new Map();

  window.App = {
    env: CURRENT_ENV,

    define: function(id, module) {
      modules.set(id, module);
    },

    getModule: function(id) {
      return modules.get(id) || null;
    },

    getAllModules: function() {
      return modules;
    },

    switchEnv: function(targetEnv) {
      if (targetEnv !== 'prod' && targetEnv !== 'dev') return;

      try {
        localStorage.setItem(ENV_KEY, targetEnv);
      } catch (error) {}

      location.reload();
    },

    downloadDevZip: function() {
      window.open(DEV_ZIP_URL, '_blank');
    },

    getDisabledModules: function() {
      try {
        return JSON.parse(localStorage.getItem('fe_disabled_modules') || '[]');
      } catch (error) {
        return [];
      }
    }
  };

  function showError(title, error) {
    var root = document.getElementById('app');

    if (!root) {
      alert(title + '\n\n' + (error && error.message ? error.message : error));
      return;
    }

    root.innerHTML =
      '<div style="min-height:100vh;padding:20px;display:flex;align-items:center;justify-content:center">' +
        '<div style="max-width:500px;width:100%;background:#1a1a1a;color:#fff;padding:20px;border-radius:16px;border:1px solid #f87171">' +
          '<h2 style="color:#f87171;margin:0 0 12px">' + title + '</h2>' +
          '<div style="font-family:monospace;font-size:0.8em;white-space:pre-wrap;word-break:break-word;max-height:60vh;overflow:auto">' +
            (error && error.stack ? error.stack : (error && error.message ? error.message : String(error))) +
          '</div>' +
          '<button onclick="location.reload()" style="margin-top:16px;padding:12px 20px;border-radius:10px;border:none;background:#d4af37;color:#000;font-weight:700">Перезагрузить</button>' +
        '</div>' +
      '</div>';
  }

  function renderStatus(title, subtitle, isError, progress) {
    var root = document.getElementById('app');

    if (!root) return;

    var percent = typeof progress === 'number'
      ? Math.max(0, Math.min(100, Math.round(progress)))
      : null;

    var progressHtml = percent !== null && !isError
      ? '<div style="width:100%;max-width:300px;margin:16px auto 6px;height:6px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden">' +
          '<div id="bootProgressFill" style="height:100%;width:' + percent + '%;background:linear-gradient(90deg,#d4af37,#f4d03f);border-radius:4px"></div>' +
        '</div>' +
        '<div id="bootProgressPct" style="font-size:0.78em;opacity:0.6;font-family:monospace">' + percent + '%</div>'
      : '';

    root.innerHTML =
      '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center">' +
        '<div style="font-size:1.4em;font-weight:800;color:' + (isError ? '#f87171' : '#d4af37') + ';margin-bottom:8px">' + title + '</div>' +
        '<div id="bootSubtitle" style="font-size:0.9em;opacity:0.75;max-width:400px">' + subtitle + '</div>' +
        progressHtml +
      '</div>';
  }

  function updateProgress(completed, total, label) {
    var percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    var fill = document.getElementById('bootProgressFill');
    var text = document.getElementById('bootProgressPct');
    var subtitle = document.getElementById('bootSubtitle');

    if (fill) fill.style.width = percent + '%';
    if (text) text.textContent = percent + '% (' + completed + '/' + total + ')';
    if (subtitle && label) subtitle.textContent = label;
  }

  function fetchTimeout(url, timeout) {
    return new Promise(function(resolve, reject) {
      var controller = typeof AbortController !== 'undefined'
        ? new AbortController()
        : null;

      var timer = setTimeout(function() {
        if (controller) controller.abort();
        reject(new Error('Timeout'));
      }, timeout || 10000);

      fetch(url, {
        signal: controller ? controller.signal : undefined,
        cache: 'no-store'
      }).then(function(response) {
        clearTimeout(timer);

        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        resolve(response);
      }).catch(function(error) {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function downloadFiles(baseUrl, manifest) {
    var entries = manifest.files || [];
    var total = entries.length;
    var completed = 0;
    var files = [];
    var missing = [];

    renderStatus('Загрузка', 'Чтение файлов...', false, 0);

    var jobs = entries.map(function(entry) {
      var url = baseUrl + entry.path + '?t=' + Date.now();

      return fetchTimeout(url).then(function(response) {
        return entry.type === 'font' ? response.blob() : response.text();
      }).then(function(content) {
        if (!content || (typeof content === 'string' && !content.trim())) {
          throw new Error('Пустой файл');
        }

        files.push({
          path: entry.path,
          type: entry.type,
          id: entry.id || null,
          required: !!entry.required,
          content: content,
          version: manifest.version
        });
      }).catch(function() {
        if (entry.required) {
          missing.push(entry.path);
        }
      }).finally(function() {
        completed++;
        updateProgress(completed, total, entry.path);
      });
    });

    return Promise.all(jobs).then(function() {
      if (missing.length) {
        var error = new Error('Не удалось загрузить обязательные файлы: ' + missing.join(', '));
        error.missing = missing;
        throw error;
      }

      return files;
    });
  }

  function mountBundle(manifest, files) {
    var filesByPath = {};
    var fontUrls = {};

    for (var i = 0; i < files.length; i++) {
      filesByPath[files[i].path] = files[i];

      if (files[i].type === 'font' && files[i].content instanceof Blob) {
        fontUrls[files[i].path] = URL.createObjectURL(files[i].content);
      }
    }

    var entries = manifest.files || [];
    var cssFiles = [];
    var scriptFiles = [];

    for (var j = 0; j < entries.length; j++) {
      var file = filesByPath[entries[j].path];

      if (!file || file.type === 'font') continue;

      if (file.type === 'css') {
        cssFiles.push(file);
      } else {
        scriptFiles.push(file);
      }
    }

    for (var c = 0; c < cssFiles.length; c++) {
      var cssText = cssFiles[c].content;

      for (var fontPath in fontUrls) {
        cssText = cssText.split(fontPath).join(fontUrls[fontPath]);
      }

      var style = document.createElement('style');
      style.setAttribute('data-file', cssFiles[c].path);
      style.textContent = cssText;
      document.head.appendChild(style);
    }

    function runScript(index) {
      if (index >= scriptFiles.length) {
        return Promise.resolve();
      }

      var file = scriptFiles[index];

      return new Promise(function(resolve, reject) {
        var blob = new Blob([
          file.content + '\n//# sourceURL=' + file.path
        ], { type: 'application/javascript' });

        var url = URL.createObjectURL(blob);
        var script = document.createElement('script');

        script.src = url;

        script.onload = function() {
          URL.revokeObjectURL(url);
          resolve();
        };

        script.onerror = function() {
          URL.revokeObjectURL(url);
          reject(new Error('Ошибка в файле: ' + file.path));
        };

        document.body.appendChild(script);
      }).then(function() {
        return runScript(index + 1);
      });
    }

    return runScript(0).then(function() {
      var disabled = App.getDisabledModules();

      modules.forEach(function(module, id) {
        if (!module || typeof module.init !== 'function') return;
        if (disabled.indexOf(id) !== -1) return;

        try {
          module.init();
        } catch (error) {
          console.error('Ошибка инициализации модуля ' + id, error);
        }
      });
    });
  }

  function checkRemoteUpdate(currentVersion) {
    if (CURRENT_ENV !== 'prod') return;

    fetchTimeout(PROD_BASE + 'manifest.json?t=' + Date.now(), 5000)
      .then(function(response) {
        return response.json();
      })
      .then(function(remoteManifest) {
        if (!remoteManifest || !remoteManifest.version) return;
        if (remoteManifest.version === currentVersion) return;

        if (window.Shell && typeof Shell.showUpdateToast === 'function') {
          Shell.showUpdateToast(currentVersion, remoteManifest, function() {
            return downloadFiles(PROD_BASE, remoteManifest).then(function(files) {
              return FileDB.clearEnv('prod').then(function() {
                return FileDB.saveFiles('prod', files);
              }).then(function() {
                return FileDB.setMeta('manifest_prod', remoteManifest);
              }).then(function() {
                location.reload();
              });
            });
          });
        }
      })
      .catch(function() {});
  }

  function startDev() {
    renderStatus(
      'Локальная разработка',
      'Чтение manifest.json из папки проекта...',
      false
    );

    return fetchTimeout('./manifest.json?t=' + Date.now())
      .then(function(response) {
        return response.json();
      })
      .then(function(manifest) {
        return downloadFiles('./', manifest).then(function(files) {
          return mountBundle(manifest, files);
        });
      });
  }

  function startProd() {
    renderStatus('FITNESS ELITE', 'Инициализация ядра...', false);

    return FileDB.getMeta('manifest_prod').then(function(manifest) {
      if (manifest) {
        return FileDB.getAllFiles('prod').then(function(files) {
          if (files.length) {
            return mountBundle(manifest, files).then(function() {
              checkRemoteUpdate(manifest.version);
            });
          }

          return loadProdFromGitHub();
        });
      }

      return loadProdFromGitHub();
    });
  }

  function loadProdFromGitHub() {
    renderStatus(
      'Первая загрузка',
      'Скачивание файлов приложения...',
      false,
      0
    );

    return fetchTimeout(PROD_BASE + 'manifest.json?t=' + Date.now())
      .then(function(response) {
        return response.json();
      })
      .then(function(manifest) {
        return downloadFiles(PROD_BASE, manifest).then(function(files) {
          return FileDB.saveFiles('prod', files).then(function() {
            return FileDB.setMeta('manifest_prod', manifest);
          }).then(function() {
            return mountBundle(manifest, files);
          });
        });
      });
  }

  function start() {
    try {
      renderStatus('FITNESS ELITE', 'Инициализация ядра...', false);

      var startup = CURRENT_ENV === 'dev'
        ? startDev()
        : startProd();

      startup.catch(function(error) {
        console.error('Ошибка запуска', error);
        showError('Ошибка запуска', error);
      });
    } catch (error) {
      showError('Критическая ошибка boot.js', error);
    }
  }

  window.addEventListener('error', function(event) {
    showError('Ошибка JavaScript', event.error || event.message);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
