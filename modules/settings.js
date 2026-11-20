// modules/settings.js
(function() {
  'use strict';

  var BACKUP_KEYS = [
    'user_name', 'user_avatar', 'db', 'categories',
    'plan', 'history', 'stats', 'xp_log', 'achievements', 'settings'
  ];

  function exportAllData() {
    var payload = {
      app: 'FITNESS_ELITE_V2',
      exportedAt: new Date().toISOString(),
      env: (window.App && window.App.env) || 'prod',
      data: {}
    };
    for (var i = 0; i < BACKUP_KEYS.length; i++) {
      var k = BACKUP_KEYS[i];
      var val = Store.get(k, null);
      if (val !== null) payload.data[k] = val;
    }
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'fitness-elite-backup-' + MathCore.todayStr() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    Shell.notify('Резервная копия скачана');
  }

  function importAllData(file, onDone) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var parsed = JSON.parse(e.target.result);
        var src = (parsed && parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;
        if (!src || typeof src !== 'object') throw new Error('Неверный формат файла');

        var count = 0;
        for (var i = 0; i < BACKUP_KEYS.length; i++) {
          var k = BACKUP_KEYS[i];
          if (src[k] !== undefined) {
            Store.set(k, src[k]);
            count++;
          }
        }
        if (count === 0) throw new Error('В файле не найдены данные приложения');
        Shell.notify('Восстановлено разделов: ' + count);
        if (typeof onDone === 'function') onDone();
      } catch (err) {
        Shell.notify('Ошибка импорта: ' + err.message, true);
      }
    };
    reader.onerror = function() { Shell.notify('Не удалось прочитать файл', true); };
    reader.readAsText(file);
  }

  function resetAllData(onDone) {
    if (!confirm('Удалить ВСЕ тренировки, упражнения, план, статистику и достижения в текущем контуре?')) return;
    if (!confirm('Это действие необратимо. Точно очистить данные?')) return;
    for (var i = 0; i < BACKUP_KEYS.length; i++) {
      Store.remove(BACKUP_KEYS[i]);
    }
    Shell.notify('Все данные очищены');
    if (typeof onDone === 'function') onDone();
  }
  function renderSettings(container) {
    var esc = Store.esc;
    var settings = Store.get('settings', {});
    var hintsOn = !settings.disableHints;
    var isDev = window.App && window.App.env === 'dev';

    var styles = (typeof StyleManager !== 'undefined') ? StyleManager.getAllStyles() : [];
    var curStyle = (typeof StyleManager !== 'undefined') ? StyleManager.getCurrentStyle() : 'default';
    var styleOpts = styles.map(function(s) {
      return '<option value="' + esc(s.id) + '" ' + (s.id === curStyle ? 'selected' : '') + '>' + esc(s.name) + '</option>';
    }).join('');

    container.innerHTML =
      '<div style="padding:4px;max-width:600px;margin:0 auto">' +
        '<h2 style="font-family:var(--font-display);font-size:1.8em;margin-bottom:16px;color:var(--accent-gold);display:flex;align-items:center;gap:12px">' +
          '<i class="ph ph-gear"></i> Настройки' +
        '</h2>' +
        '<div class="set-card">' +
          '<h3><i class="ph ph-sliders"></i> Интерфейс</h3>' +
          '<div class="set-row">' +
            '<div><div style="font-weight:600;font-size:0.95em">Тема оформления</div>' +
            '<div style="font-size:0.78em;opacity:0.65">Цветовая схема всего приложения</div></div>' +
            '<select id="setThemeSelect" class="ex-sort" style="min-width:150px">' + styleOpts + '</select>' +
          '</div>' +
          '<div class="set-row">' +
            '<div><div style="font-weight:600;font-size:0.95em">Подсказки на главной</div>' +
            '<div style="font-size:0.78em;opacity:0.65">Блок «Как получать XP» под карточками</div></div>' +
            '<label class="set-switch"><input type="checkbox" id="setHintsToggle" ' + (hintsOn ? 'checked' : '') + '><span class="set-slider"></span></label>' +
          '</div>' +
        '</div>' +
        '<div class="set-card">' +
          '<h3><i class="ph ph-database"></i> Резервное копирование</h3>' +
          '<div style="font-size:0.85em;opacity:0.75;margin-bottom:12px;line-height:1.5">' +
            'Сохрани базу упражнений, план, историю и прогресс в JSON-файл или восстанови из него.' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
            '<button class="btn btn-primary" id="setExportBtn"><i class="ph ph-download-simple"></i> Экспорт JSON</button>' +
            '<label class="btn btn-secondary" style="margin:0">' +
              '<i class="ph ph-upload-simple"></i> Импорт JSON' +
              '<input type="file" id="setImportInp" accept=".json,application/json" style="display:none">' +
            '</label>' +
          '</div>' +
        '</div>' +
        '<div class="set-card">' +
          '<h3><i class="ph ph-wrench"></i> Система</h3>' +
          '<div class="set-row">' +
            '<div><div style="font-weight:600;font-size:0.95em">Контур работы</div>' +
            '<div style="font-size:0.78em;opacity:0.65">Текущий режим: <strong>' + (isDev ? 'DEV (песочница)' : 'PROD (основной)') + '</strong></div></div>' +
            '<button class="btn btn-secondary" id="setToggleEnv" style="padding:8px 14px;font-size:0.85em">' + (isDev ? 'В PROD' : 'В DEV') + '</button>' +
          '</div>' +
          '<div class="set-row">' +
            '<div><div style="font-weight:600;font-size:0.95em;color:var(--accent-error)">Сброс данных</div>' +
            '<div style="font-size:0.78em;opacity:0.65">Очистить прогресс в контуре ' + (isDev ? 'DEV' : 'PROD') + '</div></div>' +
            '<button class="btn btn-danger" id="setResetBtn" style="padding:8px 14px;font-size:0.85em"><i class="ph ph-trash"></i> Очистить</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('setThemeSelect').onchange = function(e) {
      if (typeof StyleManager !== 'undefined') StyleManager.applyStyle(e.target.value);
      Shell.notify('Тема изменена');
    };
    document.getElementById('setHintsToggle').onchange = function(e) {
      var st = Store.get('settings', {});
      st.disableHints = !e.target.checked;
      Store.set('settings', st);
      Shell.notify(e.target.checked ? 'Подсказки включены' : 'Подсказки скрыты');
    };
    document.getElementById('setExportBtn').onclick = exportAllData;
    document.getElementById('setImportInp').onchange = function(e) {
      var f = e.target.files && e.target.files.item(0);
      importAllData(f, function() { renderSettings(container); });
      e.target.value = '';
    };
    document.getElementById('setToggleEnv').onclick = function() {
      var next = isDev ? 'prod' : 'dev';
      if (confirm('Переключить контур на ' + next.toUpperCase() + '?')) App.switchEnv(next);
    };
    document.getElementById('setResetBtn').onclick = function() {
      resetAllData(function() { renderSettings(container); });
    };
  }

  App.define('settings', {
    init: function() {
      Shell.addNav('settings', 'Настройки', 'ph-gear');
      Shell.registerScreen('settings', renderSettings);
    }
  });
})();
