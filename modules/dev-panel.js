// modules/dev-panel.js
(function() {
  'use strict';

  var logs = [];
  var MAX_LOGS = 80;

  // Перехват консоли для отладки на смартфоне
  function hookConsole() {
    ['log', 'warn', 'error'].forEach(function(level) {
      var orig = console[level];
      console[level] = function() {
        var msg = Array.prototype.slice.call(arguments).map(function(a) {
          if (a instanceof Error) return a.message + '\n' + (a.stack || '');
          if (typeof a === 'object') { try { return JSON.stringify(a); } catch (e) { return String(a); } }
          return String(a);
        }).join(' ');
        logs.push({ ts: new Date().toLocaleTimeString(), level: level, msg: msg });
        if (logs.length > MAX_LOGS) logs.shift();
        if (orig) orig.apply(console, arguments);
      };
    });
    window.addEventListener('error', function(e) {
      logs.push({ ts: new Date().toLocaleTimeString(), level: 'error', msg: (e.message || 'Error') + ' (' + (e.filename || '') + ':' + (e.lineno || 0) + ')' });
      if (logs.length > MAX_LOGS) logs.shift();
    });
  }

  function renderDev(container) {
    var esc = Store.esc;
    Promise.all([FileDB.getMeta('manifest_dev'), FileDB.getAllFiles('dev')]).then(function(res) {
      var manifest = res[0] || { version: '1.0.0-dev', files: [] };
      var files = res[1] || [];

      var filesHtml = files.map(function(f, idx) {
        var loadedMod = f.id ? App.getModule(f.id) : null;
        var stClass = f.type === 'module' ? (loadedMod ? 'loaded' : 'error') : 'loaded';
        return '<div class="module-item ' + stClass + '">' +
          '<div style="min-width:0;flex:1">' +
            '<div style="font-weight:600;font-size:0.9em;overflow:hidden;text-overflow:ellipsis">' + esc(f.path) + '</div>' +
            '<div class="text-small">v' + esc(f.version) + ' · ' + f.content.length + ' байт</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px">' +
            '<button class="btn btn-secondary" data-edit="' + idx + '" style="padding:6px 10px" title="Редактировать"><i class="ph ph-pencil-simple"></i></button>' +
            '<button class="btn btn-secondary" data-dl="' + idx + '" style="padding:6px 10px" title="Скачать"><i class="ph ph-download-simple"></i></button>' +
          '</div>' +
        '</div>';
      }).join('');

      var logsHtml = logs.slice().reverse().map(function(l) {
        return '<div class="' + l.level + '" style="margin-bottom:4px;word-break:break-word">[' + l.ts + '] ' + esc(l.msg) + '</div>';
      }).join('');

      container.innerHTML =
        '<div class="screen-container">' +
          '<h2 class="screen-title"><i class="ph ph-code"></i> Панель разработчика</h2>' +
          '<div class="dev-panel">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
              '<div><strong>Версия DEV:</strong> <span style="color:var(--accent-gold)">' + esc(manifest.version) + '</span></div>' +
              '<div class="text-small">Файлов в IndexedDB: ' + files.length + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' +
              '<button class="btn btn-primary" id="dNewFile"><i class="ph ph-plus"></i> Новый файл</button>' +
              '<button class="btn btn-secondary" id="dCopyFromProd"><i class="ph ph-download"></i> PROD → DEV</button>' +
              '<button class="btn btn-secondary" id="dPushToProd"><i class="ph ph-upload"></i> DEV → PROD</button>' +
              '<button class="btn btn-secondary" id="dSwitchProd"><i class="ph ph-arrow-left"></i> Выйти в PROD</button>' +
            '</div>' +
            '<div id="dEditorBox"></div>' +
            '<h4 style="color:var(--accent-gold);margin:14px 0 8px">Файлы песочницы DEV:</h4>' +
            (filesHtml || '<div class="text-small" style="padding:12px 0">Песочница пуста. Нажми «PROD → DEV», чтобы скопировать рабочие файлы для редактирования.</div>') +
          '</div>' +
          '<div class="dev-panel">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
              '<h4 style="color:var(--accent-gold);margin:0"><i class="ph ph-terminal-window"></i> Консоль логов (' + logs.length + ')</h4>' +
              '<div style="display:flex;gap:6px">' +
                '<button class="btn btn-secondary" id="dCopyReport" style="padding:6px 12px;font-size:0.8em"><i class="ph ph-bug"></i> Отчёт</button>' +
                '<button class="btn btn-danger" id="dClearLogs" style="padding:6px 12px;font-size:0.8em">Очистить</button>' +
              '</div>' +
            '</div>' +
            '<div class="console-log" style="padding:12px;max-height:220px;overflow-y:auto;font-size:0.8em">' +
              (logsHtml || '<div class="info">Ошибок и событий пока нет</div>') +
            '</div>' +
          '</div>' +
        '</div>';
      document.getElementById('dSwitchProd').onclick = function() { App.switchEnv('prod'); };
      document.getElementById('dCopyFromProd').onclick = function() {
        FileDB.copyProdToDev().then(function() { Shell.notify('Скопировано из PROD'); renderDev(container); }).catch(function(e) { Shell.notify(e.message, true); });
      };
      document.getElementById('dPushToProd').onclick = function() {
        if (!confirm('Перенести файлы из DEV в локальный PROD?')) return;
        FileDB.copyDevToProd().then(function() { Shell.notify('Перенесено в PROD!'); }).catch(function(e) { Shell.notify(e.message, true); });
      };
      document.getElementById('dNewFile').onclick = function() { openEditor(container, manifest, null); };
      document.getElementById('dClearLogs').onclick = function() { logs = []; renderDev(container); };
      document.getElementById('dCopyReport').onclick = function() {
        var rep = JSON.stringify({ env: App.env, version: manifest.version, ua: navigator.userAgent, filesCount: files.length, logs: logs }, null, 2);
        if (navigator.clipboard) navigator.clipboard.writeText(rep).then(function() { Shell.notify('Отчёт скопирован в буфер'); });
        else prompt('Скопируй отчёт:', rep);
      };

      container.querySelectorAll('[data-edit]').forEach(function(b) {
        b.onclick = function() { openEditor(container, manifest, files[parseInt(b.getAttribute('data-edit'), 10)]); };
      });
      container.querySelectorAll('[data-dl]').forEach(function(b) {
        b.onclick = function() {
          var f = files[parseInt(b.getAttribute('data-dl'), 10)];
          var a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([f.content], { type: 'text/plain;charset=utf-8' }));
          a.download = f.path.split('/').pop();
          a.click();
        };
      });
    });
  }

  function openEditor(container, manifest, fileObj) {
    var box = document.getElementById('dEditorBox');
    if (!box) return;
    var esc = Store.esc;
    var isNew = !fileObj;
    var pVal = isNew ? 'modules/' : fileObj.path;
    var tVal = isNew ? 'js' : fileObj.type;
    var cVal = isNew ? '' : fileObj.content;

    box.innerHTML =
      '<div class="card card-gold" style="margin-bottom:16px">' +
        '<h4 style="color:var(--accent-gold);margin-bottom:10px">' + (isNew ? 'Создание файла' : 'Редактирование: ' + esc(pVal)) + '</h4>' +
        '<div class="form-row-2 form-field">' +
          '<input id="edPath" class="form-input" type="text" value="' + esc(pVal) + '" ' + (isNew ? '' : 'readonly') + ' placeholder="modules/plan.js">' +
          '<select id="edType" class="form-select" ' + (isNew ? '' : 'disabled') + '>' +
            '<option value="module"' + (tVal === 'module' ? ' selected' : '') + '>Module (JS экран)</option>' +
            '<option value="js"' + (tVal === 'js' ? ' selected' : '') + '>JS (Ядро)</option>' +
            '<option value="css"' + (tVal === 'css' ? ' selected' : '') + '>CSS (Стиль)</option>' +
          '</select>' +
        '</div>' +
        '<textarea id="edCode" class="form-textarea" rows="12" style="font-family:\'JetBrains Mono\',monospace;font-size:0.82em;margin-bottom:10px">' + esc(cVal) + '</textarea>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn btn-primary" id="edSave"><i class="ph ph-floppy-disk"></i> Сохранить и перезагрузить</button>' +
          '<button class="btn btn-secondary" id="edCancel">Отмена</button>' +
        '</div>' +
      '</div>';

    document.getElementById('edCancel').onclick = function() { box.innerHTML = ''; };
    document.getElementById('edSave').onclick = function() {
      var p = document.getElementById('edPath').value.trim();
      var t = document.getElementById('edType').value;
      var code = document.getElementById('edCode').value;
      if (!p) { Shell.notify('Укажи путь', true); return; }
      var modId = (t === 'module') ? p.split('/').pop().replace('.js', '') : null;
      var exists = manifest.files.some(function(i) { return i.path === p; });
      if (!exists) manifest.files.push({ path: p, type: t, id: modId, required: false });
      FileDB.saveSingleFile('dev', { path: p, type: t, id: modId, required: false, content: code, version: manifest.version })
        .then(function() { return FileDB.setMeta('manifest_dev', manifest); })
        .then(function() { location.reload(); });
    };
  }

  hookConsole();

  App.define('dev-panel', {
    init: function() {
      if (App.env !== 'dev') return;
      Shell.registerScreen('dev', renderDev);
    }
  });
})();
