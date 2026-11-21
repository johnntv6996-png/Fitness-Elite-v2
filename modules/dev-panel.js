// modules/dev-panel.js
(function() {
  'use strict';

  var openSections = {
    update: true,
    modules: false,
    storage: false,
    info: false
  };

  var currentContainer = null;

  function esc(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getManifest() {
    return FileDB.getMeta('manifest_dev');
  }

  function getDisabledModules() {
    return FileDB.getMeta('disabled_modules').then(function(value) {
      return value || [];
    });
  }

  function saveDisabledModules(list) {
    return FileDB.setMeta('disabled_modules', list);
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
      '<div style="display:flex;align-items:center;gap:10px;' +
        'padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08)">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:600;font-size:0.95em">' + esc(module.id || module.path) + '</div>' +
          '<div style="font-size:0.75em;opacity:0.6">' + esc(module.path) + '</div>' +
        '</div>' +
        (required
          ? '<span style="font-size:0.7em;padding:4px 8px;border-radius:20px;background:rgba(212,175,55,0.15);color:var(--accent-gold)">Обязательный</span>'
          : disabled
            ? '<span style="font-size:0.7em;padding:4px 8px;border-radius:20px;background:rgba(248,113,113,0.15);color:#f87171">Отключён</span>'
            : '<button type="button" data-delete-module="' + esc(module.id) + '" style="padding:6px 10px;border-radius:8px;border:1px solid #f87171;background:transparent;color:#f87171;font-size:0.8em">Удалить</button>') +
      '</div>'
    );
  }

  function render(container) {
    currentContainer = container;

    Promise.all([
      getManifest(),
      getDisabledModules(),
      FileDB.getMeta('manifest_prod')
    ]).then(function(result) {
      var devManifest = result[0] || { version: 'неизвестно', files: [] };
      var disabled = result[1] || [];
      var prodManifest = result[2];

      var modules = (devManifest.files || []).filter(function(file) {
        return file.type === 'module';
      });

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
              'Обновит файлы из ветки <strong>dev</strong>. Существующие файлы будут заменены, отсутствующие — добавлены.' +
            '</div>' +
            '<button type="button" class="btn btn-primary" id="dpUpdateDev" style="width:100%">' +
              '<i class="ph ph-download-simple"></i> Обновить из ветки dev' +
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
            'storage',
            'ph-database',
            'Хранилище',
            '<div style="font-size:0.85em;opacity:0.75;margin-bottom:12px">' +
              'Удаляет скачанные DEV-файлы из кэша приложения. Данные тренировок не удаляются.' +
            '</div>' +
            '<button type="button" class="btn btn-secondary" id="dpClearDev" style="width:100%">' +
              '<i class="ph ph-trash"></i> Очистить DEV-кэш' +
            '</button>',
            openSections.storage
          ) +

          section(
            'info',
            'ph-info',
            'Информация',
            '<div style="font-size:0.9em;line-height:1.7">' +
              '<div>DEV-версия: <strong>' + esc(devManifest.version || 'неизвестно') + '</strong></div>' +
              '<div>PROD-версия: <strong>' + esc(prodManifest && prodManifest.version ? prodManifest.version : 'неизвестно') + '</strong></div>' +
              '<div>Файлов в DEV: <strong>' + (devManifest.files || []).length + '</strong></div>' +
              '<div>Отключено модулей: <strong>' + disabled.length + '</strong></div>' +
            '</div>',
            openSections.info
          ) +
        '</div>';

      container.querySelectorAll('[data-section]').forEach(function(button) {
        button.addEventListener('click', function() {
          toggleSection(button.getAttribute('data-section'));
        });
      });

      var updateButton = container.querySelector('#dpUpdateDev');

      if (updateButton) {
        updateButton.addEventListener('click', updateFromDev);
      }

      var clearButton = container.querySelector('#dpClearDev');

      if (clearButton) {
        clearButton.addEventListener('click', clearDevCache);
      }

      container.querySelectorAll('[data-delete-module]').forEach(function(button) {
        button.addEventListener('click', function() {
          deleteModule(button.getAttribute('data-delete-module'));
        });
      });
    });
  }

  function updateFromDev() {
    if (!confirm('Обновить файлы из ветки dev?')) return;

    Shell.notify('Обновление из ветки dev...', false);

    App.updateDevFromGitHub().then(function() {
      Shell.notify('DEV обновлён', false);
      location.reload();
    }).catch(function(error) {
      Shell.notify(
        error && error.message ? error.message : 'Не удалось обновить DEV',
        true
      );
    });
  }

  function deleteModule(id) {
    if (!id) return;

    if (!confirm('Удалить модуль "' + id + '"?')) return;

    getManifest().then(function(manifest) {
      var entry = (manifest.files || []).find(function(file) {
        return file.id === id;
      });

      if (!entry) {
        Shell.notify('Модуль не найден в manifest', true);
        return;
      }

      return FileDB.deleteFile('dev', entry.path).then(function() {
        return getDisabledModules().then(function(disabled) {
          if (disabled.indexOf(id) === -1) {
            disabled.push(id);
          }

          return saveDisabledModules(disabled);
        });
      }).then(function() {
        Shell.notify('Модуль "' + id + '" удалён', false);

        if (currentContainer) {
          render(currentContainer);
        }
      });
    }).catch(function(error) {
      Shell.notify(
        error && error.message ? error.message : 'Не удалось удалить модуль',
        true
      );
    });
  }

  function clearDevCache() {
    if (!confirm('Очистить DEV-кэш?')) return;

    FileDB.clearEnv('dev').then(function() {
      Shell.notify('DEV-кэш очищен', false);
      location.reload();
    }).catch(function(error) {
      Shell.notify(
        error && error.message ? error.message : 'Не удалось очистить кэш',
        true
      );
    });
  }

  App.define('dev-panel', {
    init: function() {
      Shell.registerScreen('dev', render);
    }
  });
})();
