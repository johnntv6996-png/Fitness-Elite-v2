// boot/boot.js
(function() {
  'use strict';

  var OWNER = 'johnntv6996-png';
  var REPO = 'Fitness-Elite-v2';

  var PROD_BASE = 'https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/main/';
  var DEV_BASE = 'https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/dev/';
  var DEV_BRANCH_URL = 'https://github.com/' + OWNER + '/' + REPO + '/tree/dev';

  var ENV_KEY = 'fe_v2_env';
  var DEV_SOURCE_KEY = 'fe_dev_source';

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

  function getDevSource() {
    try {
      return localStorage.getItem(DEV_SOURCE_KEY) === 'local' ? 'local' : 'online';
    } catch (error) {
      return 'online';
    }
  }

  function setDevSource(source) {
    try {
      localStorage.setItem(
        DEV_SOURCE_KEY,
        source === 'local' ? 'local' : 'online'
      );
    } catch (error) {}
  }

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

    getDevSource: getDevSource,

    reloadDevFromGitHub: function() {
      if (CURRENT_ENV !== 'dev') return;

      setDevSource('online');
      location.reload();
    },

    updateDevFromGitHub: function() {
      if (CURRENT_ENV !== 'dev') {
        return Promise.reject(new Error('Обновление доступно только в DEV'));
      }

      return fetchTimeout(DEV_BASE + 'manifest.json?t=' + Date.now())
        .then(function(response) {
          return response.json();
        })
        .then(function(manifest) {
          return downloadFiles(DEV_BASE, manifest).then(function(files) {
            return FileDB.saveFiles('dev', files).then(function() {
              return FileDB.setMeta('manifest_dev', manifest);
            });
          });
        });
    },

    openDevBranch: function() {
      window.open(DEV_BRANCH_URL, '_blank');
    },

    importLocalFolder: function(fileList) {
      if (CURRENT_ENV !== 'dev') return;

      if (!fileList || !fileList.length) {
        renderStatus('Импорт отменён', 'Папка не выбрана', true);
        return;
      }

      var filesByPath = {};

      for (var i = 0; i < fileList.length; i++) {
        var parts = fileList[i].webkitRelativePath.split('/');
        parts.shift();

        var relativePath = parts.join('/');

        if (relativePath) {
          filesByPath[relativePath] = fileList[i];
        }
      }

      if (!filesByPath['manifest.json']) {
        renderStatus(
          'Ошибка импорта',
          'В выбранной папке нет manifest.json',
          true
        );
        return;
      }

      filesByPath['manifest.json'].text().then(function(text) {
        var manifest;

        try {
          manifest = JSON.parse(text);
        } catch (error) {
          renderStatus(
            'Ошибка импорта',
            'manifest.json содержит некорректный JSON',
            true
          );
          return;
        }

        return importLocalBundle(manifest, filesByPath);
      }).catch(function(error) {
        renderStatus(
          'Ошибка импорта',
          error && error.message ? error.message : 'Не удалось импортировать файлы',
          true
        );
      });
    }
  };

  function importLocalBundle(manifest, filesByPath) {
    var entries = manifest.files || [];
    var total = entries.length;
    var completed = 0;
    var missing = [];
    var records = [];

    renderStatus('Импорт DEV', 'Чтение локальных файлов...', false, null, 0);

    var jobs = entries.map(function(entry) {
      var file = filesByPath[entry.path];

      if (!file) {
        if (entry.required) {
          missing.push(entry.path);
        }

        completed++;
        updateProgress(completed, total);
        return Promise.resolve();
      }

      var reader = entry.type === 'font'
        ? Promise.resolve(file)
        : file.text();

      return reader.then(function(content) {
        records.push({
          path: entry.path,
          type: entry.type,
          id: entry.id || null,
          required: !!entry.required,
          content: content,
          version: manifest.version
        });

        completed++;
        updateProgress(completed, total, entry.path);
      });
    });

    return Promise.all(jobs).then(function() {
      if (missing.length) {
        renderStatus(
          'Не хватает файлов',
          'Выбери корневую папку проекта, где лежит manifest.json',
          true,
          missing
        );
        return;
      }

      return FileDB.saveFiles('dev', records)
        .then(function() {
          return FileDB.setMeta('manifest_dev', manifest);
        })
        .then(function() {
          setDevSource('local');
          location.reload();
        });
    });
  }

  function renderStatus(title, subtitle, isError, missingList, progress) {
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

    var missingHtml = missingList && missingList.length
      ? '<div style="margin:12px auto;padding:10px;max-width:400px;text-align:left;background:rgba(248,113,113,0.1);border:1px solid #f87171;border-radius:8px;font-size:0.8em">' +
          '<strong>Не найдены:</strong><br>' + missingList.join('<br>') + '</div>'
      : '';

    var actions = '';

    if (CURRENT_ENV === 'dev') {
      actions =
        '<div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;max-width:320px;width:100%">' +
          '<button onclick="App.reloadDevFromGitHub()" style="padding:12px;border-radius:10px;border:1px solid #d4af37;background:transparent;color:#d4af37;font-weight:700">Загрузить из ветки dev</button>' +
        '</div>';
    } else {
      actions =
        '<button onclick="location.reload()" style="margin-top:16px;padding:12px 22px;border-radius:10px;border:none;background:#d4af37;color:#000;font-weight:700">Повторить</button>';
    }

    root.innerHTML =
      '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center">' +
        '<div style="font-size:1.4em;font-weight:800;color:' + (isError ? '#f87171' : '#d4af37') + ';margin-bottom:8px">' + title + '</div>' +
        '<div id="bootSubtitle" style="font-size:0.9em;opacity:0.75;max-width:400px">' + subtitle + '</div>' +
        progressHtml + missingHtml + actions +
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

    renderStatus(
      'Загрузка DEV',
      'Скачивание файлов...',
      false,
      null,
      0
    );

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
        var error = new Error('Не удалось загрузить обязательные файлы');
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
      return FileDB.getMeta('disabled_modules').then(function(disabledModules) {
        var disabled = disabledModules || [];

        modules.forEach(function(module, id) {
          if (!module || typeof module.init !== 'function') return;
          if (disabled.indexOf(id) !== -1) return;

          try {
            module.init();
          } catch (error) {
            console.error('Ошибка инициализации модуля ' + id, error);

            if (window.Shell && Shell.notify) {
              Shell.notify('Модуль "' + id + '" не запустился', true);
            }
          }
        });
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
    var source = getDevSource();

    if (source === 'local') {
      return loadDevFromLocalServer();
    }

    return loadDevFromGitHub();
  }

  function loadDevFromLocalServer() {
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

  function loadDevFromGitHub() {
    renderStatus(
      'Загрузка DEV',
      'Получение manifest.json из ветки dev...',
      false
    );

    return fetchTimeout(DEV_BASE + 'manifest.json?t=' + Date.now())
      .then(function(response) {
        return response.json();
      })
      .then(function(manifest) {
        return downloadFiles(DEV_BASE, manifest).then(function(files) {
          return FileDB.saveFiles('dev', files).then(function() {
            return FileDB.setMeta('manifest_dev', manifest);
          }).then(function() {
            return mountBundle(manifest, files);
          });
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
      null,
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
    renderStatus('FITNESS ELITE', 'Инициализация ядра...', false);

    var startup = CURRENT_ENV === 'dev'
      ? startDev()
      : startProd();

    startup.catch(function(error) {
      console.error('Ошибка запуска', error);

      renderStatus(
        'Ошибка запуска',
        error && error.message ? error.message : 'Не удалось загрузить приложение',
        true,
        error && error.missing ? error.missing : []
      );
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
