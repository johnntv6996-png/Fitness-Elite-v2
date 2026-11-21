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

  function render(container) {
    currentContainer = container;

    fetch('./manifest.json?t=' + Date.now())
      .then(function(response) {
        return response.json();
      })
      .then(function(manifest) {
        var modules = (manifest.files || []).filter(function(file) {
          return file.type === 'module';
        });

        var moduleList = modules.length
          ? modules.map(function(module) {
              return (
                '<div style="display:flex;align-items:center;gap:10px;' +
                  'padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08)">' +
                  '<div style="flex:1;min-width:0">' +
                    '<div style="font-weight:600;font-size:0.95em">' + esc(module.id || module.path) + '</div>' +
                    '<div style="font-size:0.75em;opacity:0.6">' + esc(module.path) + '</div>' +
                  '</div>' +
                  (module.required
                    ? '<span style="font-size:0.7em;padding:4px 8px;border-radius:20px;background:rgba(212,175,55,0.15);color:var(--accent-gold)">Обязательный</span>'
                    : '<span style="font-size:0.7em;padding:4px 8px;border-radius:20px;background:rgba(255,255,255,0.08);opacity:0.7">Необязательный</span>') +
                '</div>'
              );
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
                'Скачай ZIP ветки dev и распакуй его в папку проекта. После этого перезагрузи приложение.' +
              '</div>' +
              '<button type="button" class="btn btn-primary" id="dpDownloadZip" style="width:100%">' +
                '<i class="ph ph-download-simple"></i> Скачать ZIP ветки dev' +
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
              'info',
              'ph-info',
              'Информация',
              '<div style="font-size:0.9em;line-height:1.7">' +
                '<div>Версия DEV: <strong>' + esc(manifest.version || 'неизвестно') + '</strong></div>' +
                '<div>Файлов в manifest: <strong>' + (manifest.files || []).length + '</strong></div>' +
                '<div>Источник файлов: <strong>локальная папка Acode</strong></div>' +
              '</div>',
              openSections.info
            ) +
          '</div>';

        var zipButton = container.querySelector('#dpDownloadZip');

        if (zipButton) {
          zipButton.addEventListener('click', function() {
            App.downloadDevZip();
          });
        }

        container.querySelectorAll('[data-section]').forEach(function(button) {
          button.addEventListener('click', function() {
            toggleSection(button.getAttribute('data-section'));
          });
        });
      })
      .catch(function(error) {
        container.innerHTML =
          '<div class="screen-container">' +
            '<h2 class="screen-title">Панель разработчика</h2>' +
            '<div class="set-card">Не удалось прочитать manifest.json</div>' +
            '<div style="font-size:0.85em;opacity:0.7">' + esc(error.message || 'Ошибка') + '</div>' +
          '</div>';
      });
  }

  App.define('dev-panel', {
    init: function() {
      Shell.registerScreen('dev', render);
    }
  });
})();
