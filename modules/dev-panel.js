// modules/dev-panel.js
(function() {
  'use strict';

  var logs = [];
  var origError = console.error;
  var origWarn = console.warn;

  var openSections = {
    update: true,
    modules: false,
    diagnostics: false,
    info: false
  };

  var currentContainer = null;

  var DEV_ZIP_URL = 'https://github.com/johnntv6996-png/Fitness-Elite-v2/archive/refs/heads/dev.zip';

  function addLog(level, message) {
    logs.push({
      time: new Date().toLocaleTimeString(),
      level: level,
      message: String(message)
    });

    if (logs.length > 200) {
      logs.shift();
    }
  }

  console.error = function() {
    var message = Array.prototype.slice.call(arguments).join(' ');
    addLog('error', message);
    origError.apply(console, arguments);
  };

  console.warn = function() {
    var message = Array.prototype.slice.call(arguments).join(' ');
    addLog('warn', message);
    origWarn.apply(console, arguments);
  };

  window.addEventListener('error', function(event) {
    addLog(
      'error',
      (event.message || 'Ошибка') +
      ' (' + (event.filename || '') + ':' + (event.lineno || 0) + ')'
    );
  });

  function esc(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getDisabledModules() {
    return App.getDisabledModules();
  }

  function saveDisabledModules(list) {
    try {
      localStorage.setItem('fe_disabled_modules', JSON.stringify(list));
    } catch (error) {}
  }

  function toggleSection(name) {
    openSections[name] = !openSections[name];

    if (currentContainer) {
      render(currentContainer);
    }
  }

  function section(id, icon, title, content, isOpen) {
    return (
      '<div class="set-card" style="padding:0;overflow:hidden;margin-bottom:12px">' +
        '<button type="button" data-section="' + esc(id) + '" style="' +
          'width:100%;display:flex;align-items:center;gap:10px;' +
          'padding:16px;background:transparent;border:none;color:inherit;' +
          'font:inherit;text-align:left;cursor:pointer">' +
          '<i class="ph ' + esc(icon) + '" style="font-size:1.3em;color:var(--accent-gold)"></i>' +
          '<span style="flex:1;font-weight:700">' + esc(title) + '</span>' +
          '<i class="ph ' + (isOpen ? 'ph-caret-up' : 'ph-caret-down') + '"></i>' +
        '</button>' +
        (isOpen
          ? '<div style="padding:0 16px 16px">' + content + '</div>'
          : '') +
      '</div>'
    );
  }

  function moduleRow(module, disabled) {
    var required = !!module.required;

    return (
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;' +
        'padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08)">' +
        '<div style="flex:1;min-width:160px">' +
          '<div style="font-weight:600;font-size:0.95em">' + esc(module.id || module.path) + '</div>' +
          '<div style="font-size:0.75em;opacity:0.6">' + esc(module.path) + '</div>' +
        '</div>' +
        (required
          ? '<span style="font-size:0.7em;padding:4px 8px;border-radius:20px;background:rgba(212,175,55,0.15);color:var(--accent-gold)">Обязательный</span>'
          : disabled
            ? '<button type="button" class="btn btn-secondary" data-enable-module="' + esc(module.id) + '" style="padding:6px 10px;font-size:0.8em">Включить</button>'
            : '<button type="button" class="btn btn-secondary" data-disable-module="' + esc(module.id) + '" style="padding:6px 10px;font-size:0.8em">Отключить</button>') +
      '</div>'
    );
  }

  function renderLogs() {
    if (!logs.length) {
      return '<div style="opacity:0.6;font-size:0.85em">Ошибок и предупреждений нет</div>';
    }

    return logs.slice().reverse().map(function(item) {
      var color = item.level === 'error' ? '#f87171' : '#fbbf24';

      return (
        '<div style="margin-bottom:6px;font-size:0.8em;word-break:break-word">' +
          '<span style="color:' + color + ';font-family:monospace">[' + esc(item.time) + ']</span> ' +
          esc(item.message) +
        '</div>'
      );
    }).join('');
  }

  function render(container) {
    currentContainer = container;

    fetch('./manifest.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function(response) {
        return response.json();
      })
      .then(function(manifest) {
        var modules = (manifest.files || []).filter(function(file) {
          return file.type === 'module';
        });

        var disabled = getDisabledModules();

        var moduleList = modules.length
          ? modules.map(function(module) {
              return moduleRow(module, disabled.indexOf(module.id) !== -1);
            }).join('')
          : '<div style="opacity:0.6;font-size:0.9em">Модули не найдены</div>';

        container.innerHTML =
          '<div class="screen-container">' +
            '<h2 class="screen-title">' +
              '<i class="ph ph-gear-six"></i> Панель разработчика' +
            '</h2>' +

            section(
              'update',
              'ph-arrow-clockwise',
              'Обновление',
              '<div style="font-size:0.85em;opacity:0.75;margin-bottom:12px">' +
                'Скачай ZIP ветки dev, распакуй его в папку проекта и перезагрузи приложение.' +
              '</div>' +
              '<button type="button" class="btn btn-primary" onclick="DevPanel.downloadZip()" style="width:100%;margin-bottom:8px">' +
                '<i class="ph ph-download-simple"></i> Скачать ZIP ветки dev' +
              '</button>' +
              '<button type="button" class="btn btn-secondary" onclick="DevPanel.clearDevCache()" style="width:100%">' +
                '<i class="ph ph-trash"></i> Очистить DEV-кэш' +
              '</button>',
              openSections.update
            ) +

            section(
              'modules',
              'ph-puzzle-piece',
              'Модули',
              moduleList,
              openSections.modules
            ) +

            section(
              'diagnostics',
              'ph-bug',
              'Диагностика',
              '<div style="display:flex;gap:8px;margin-bottom:12px">' +
                '<button type="button" class="btn btn-secondary" onclick="DevPanel.copyReport()" style="flex:1">' +
                  '<i class="ph ph-clipboard-text"></i> Отчёт' +
                '</button>' +
                '<button type="button" class="btn btn-secondary" onclick="DevPanel.clearLogs()" style="flex:1">' +
                  '<i class="ph ph-eraser"></i> Очистить' +
                '</button>' +
              '</div>' +
              '<div style="max-height:240px;overflow-y:auto;padding:10px;background:rgba(0,0,0,0.2);border-radius:10px;font-family:monospace">' +
                renderLogs() +
              '</div>',
              openSections.diagnostics
            ) +

            section(
              'info',
              'ph-info',
              'Информация',
              '<div style="font-size:0.9em;line-height:1.8">' +
                '<div>Версия DEV: <strong>' + esc(manifest.version || 'неизвестно') + '</strong></div>' +
                '<div>Файлов в manifest: <strong>' + (manifest.files || []).length + '</strong></div>' +
                '<div>Модулей: <strong>' + modules.length + '</strong></div>' +
                '<div>Отключено: <strong>' + disabled.length + '</strong></div>' +
                '<div>Источник: <strong>локальная папка Acode</strong></div>' +
              '</div>',
              openSections.info
            ) +
          '</div>';

        container.querySelectorAll('[data-section]').forEach(function(button) {
          button.addEventListener('click', function() {
            toggleSection(button.getAttribute('data-section'));
          });
        });

        container.querySelectorAll('[data-disable-module]').forEach(function(button) {
          button.addEventListener('click', function() {
            disableModule(button.getAttribute('data-disable-module'));
          });
        });

        container.querySelectorAll('[data-enable-module]').forEach(function(button) {
          button.addEventListener('click', function() {
            enableModule(button.getAttribute('data-enable-module'));
          });
        });
      })
      .catch(function(error) {
        addLog('error', 'Ошибка панели: ' + (error.message || error));

        container.innerHTML =
          '<div class="screen-container">' +
            '<h2 class="screen-title">Панель разработчика</h2>' +
            '<div class="set-card">Не удалось прочитать manifest.json</div>' +
            '<div style="font-size:0.85em;opacity:0.7">' + esc(error.message || 'Ошибка') + '</div>' +
          '</div>';
      });
  }

  function downloadZip() {
    addLog('info', 'Открываю ZIP ветки dev');
    window.open(DEV_ZIP_URL, '_blank');
  }

  function clearDevCache() {
    if (!confirm('Очистить старый DEV-кэш в IndexedDB? Файлы в папке Acode не будут удалены.')) return;

    addLog('info', 'Очистка DEV-кэша IndexedDB...');

    FileDB.clearEnv('dev').then(function() {
      addLog('info', 'DEV-кэш очищен');
      Shell.notify('DEV-кэш очищен', false);
      location.reload();
    }).catch(function(error) {
      addLog('error', 'Ошибка очистки кэша: ' + (error.message || error));
      Shell.notify(
        error && error.message ? error.message : 'Не удалось очистить кэш',
        true
      );
    });
  }

  function disableModule(id) {
    if (!id) return;

    if (!confirm('Отключить модуль "' + id + '"?')) return;

    var disabled = getDisabledModules();

    if (disabled.indexOf(id) === -1) {
      disabled.push(id);
      saveDisabledModules(disabled);
    }

    Shell.notify('Модуль "' + id + '" будет отключён после перезагрузки', false);

    if (currentContainer) {
      render(currentContainer);
    }
  }

  function enableModule(id) {
    if (!id) return;

    var disabled = getDisabledModules();
    var index = disabled.indexOf(id);

    if (index !== -1) {
      disabled.splice(index, 1);
      saveDisabledModules(disabled);
    }

    Shell.notify('Модуль "' + id + '" будет включён после перезагрузки', false);

    if (currentContainer) {
      render(currentContainer);
    }
  }

  function copyReport() {
    var report =
      'FITNESS ELITE — ОТЧЁТ РАЗРАБОТЧИКА\n' +
      'Дата: ' + new Date().toLocaleString() + '\n' +
      'Контур: ' + App.env + '\n' +
      'User-Agent: ' + navigator.userAgent + '\n\n' +
      'ЛОГИ:\n' +
      logs.map(function(item) {
        return '[' + item.time + '] ' + item.level.toUpperCase() + ': ' + item.message;
      }).join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(report).then(function() {
        Shell.notify('Отчёт скопирован', false);
      }).catch(function() {
        Shell.notify('Не удалось скопировать отчёт', true);
      });
    } else {
      Shell.notify('Буфер обмена недоступен', true);
    }
  }

  function clearLogs() {
    logs = [];

    if (currentContainer) {
      render(currentContainer);
    }
  }

  window.DevPanel = {
    downloadZip: downloadZip,
    clearDevCache: clearDevCache,
    disableModule: disableModule,
    enableModule: enableModule,
    copyReport: copyReport,
    clearLogs: clearLogs
  };

  App.define('dev-panel', {
    init: function() {
      Shell.registerScreen('dev', render);
    }
  });
})();
