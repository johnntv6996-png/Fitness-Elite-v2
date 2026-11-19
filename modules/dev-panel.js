// modules/dev-panel.js
(function() {
  'use strict';

  var logs = [];
  var origError = console.error;
  var origWarn = console.warn;

  function addLog(level, msg) {
    logs.push({ ts: new Date().toLocaleTimeString(), level: level, msg: String(msg) });
    if (logs.length > 200) logs.shift();
  }

  console.error = function() {
    var msg = Array.prototype.slice.call(arguments).join(' ');
    addLog('error', msg);
    origError.apply(console, arguments);
  };
  console.warn = function() {
    var msg = Array.prototype.slice.call(arguments).join(' ');
    addLog('warn', msg);
    origWarn.apply(console, arguments);
  };
  window.addEventListener('error', function(e) {
    addLog('error', (e.message || 'Error') + ' (' + (e.filename || '') + ':' + (e.lineno || 0) + ')');
  });

  function downloadText(filename, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function renderDev(container) {
    var esc = Store.esc;
    Promise.all([FileDB.getMeta('manifest_dev'), FileDB.getAllFiles('dev')]).then(function(res) {
      var manifest = res.shift() || { version: '1.1.0-dev', files: [] };
      var files = res.shift() || [];

      var filesHtml = files.map(function(f, idx) {
        var loadedMod = f.id ? App.getModule(f.id) : null;
        var stClass = f.type === 'module' ? (loadedMod ? 'loaded' : 'error') : 'loaded';
        var sizeInfo = (f.content && f.content.size) ? f.content.size + ' байт' : ((f.content ? f.content.length : 0) + ' байт');
        return '<div class="module-item ' + stClass + '">' +
          '<div style="min-width:0;flex:1">' +
            '<div style="font-weight:600;font-size:0.9em;overflow:hidden;text-overflow:ellipsis">' + esc(f.path) + '</div>' +
            '<div class="text-small">v' + esc(f.version) + ' · ' + sizeInfo + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px">' +
            (f.type !== 'font' ? '<button class="btn btn-secondary" data-edit="' + idx + '" style="padding:6px 10px" title="Редактировать"><i class="ph ph-pencil-simple"></i></button>' : '') +
            (f.type !== 'font' ? '<button class="btn btn-secondary" data-dl="' + idx + '" style="padding:6px 10px" title="Скачать"><i class="ph ph-download-simple"></i></button>' : '') +
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
            (filesHtml || '<div class="text-small" style="padding:12px 0">Песочница пуста. Нажми «PROD → DEV», чтобы скопировать рабочие файлы.</div>') +
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

      function openEditor(existingFile) {
        var box = document.getElementById('dEditorBox');
        var isNew = !existingFile;
        box.innerHTML =
          '<div class="card card-gold" style="margin-bottom:16px">' +
            '<h4 style="color:var(--accent-gold);margin-bottom:10px">' + (isNew ? 'Новый файл в DEV' : 'Редактирование: ' + esc(existingFile.path)) + '</h4>' +
            '<input id="edPath" class="form-input" placeholder="modules/my-module.js" value="' + esc(isNew ? '' : existingFile.path) + '" ' + (isNew ? '' : 'readonly') + ' style="margin-bottom:8px">' +
            '<input id="edId" class="form-input" placeholder="ID модуля (если module)" value="' + esc(isNew ? '' : (existingFile.id || '')) + '" style="margin-bottom:8px">' +
            '<textarea id="edCode" class="form-textarea" rows="12" style="font-family:monospace;font-size:0.85em">' + esc(isNew ? '' : existingFile.content) + '</textarea>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">' +
              '<button class="btn btn-secondary" id="edCancel">Отмена</button>' +
              '<button class="btn btn-primary" id="edSave">Сохранить в DEV и перезагрузить</button>' +
            '</div>' +
          '</div>';
        document.getElementById('edCancel').onclick = function() { box.innerHTML = ''; };
        document.getElementById('edSave').onclick = function() {
          var path = document.getElementById('edPath').value.trim();
          var modId = document.getElementById('edId').value.trim() || null;
          var code = document.getElementById('edCode').value;
          if (!path || !code.trim()) { Shell.notify('Заполни путь и код', true); return; }
          var type = path.endsWith('.css') ? 'css' : (modId ? 'module' : 'js');
          var rec = { path: path, type: type, id: modId, required: false, content: code, version: manifest.version };
          if (!manifest.files.some(function(x) { return x.path === path; })) manifest.files.push({ path: path, type: type, id: modId, required: false });
          FileDB.saveSingleFile('dev', rec).then(function() { return FileDB.setMeta('manifest_dev', manifest); }).then(function() { location.reload(); });
        };
      }

      document.getElementById('dNewFile').onclick = function() { openEditor(null); };
      document.getElementById('dSwitchProd').onclick = function() { App.switchEnv('prod'); };
      document.getElementById('dCopyFromProd').onclick = function() {
        FileDB.copyProdToDev().then(function() { location.reload(); }).catch(function(e) { Shell.notify(e.message, true); });
      };
      document.getElementById('dPushToProd').onclick = function() {
        if (!confirm('Перенести все файлы из DEV в PROD?')) return;
        FileDB.copyDevToProd().then(function() { Shell.notify('Перенесено в PROD'); }).catch(function(e) { Shell.notify(e.message, true); });
      };
      container.querySelectorAll('[data-edit]').forEach(function(b) { b.onclick = function() { openEditor(files[parseInt(b.getAttribute('data-edit'), 10)]); }; });
      container.querySelectorAll('[data-dl]').forEach(function(b) { b.onclick = function() { var f = files[parseInt(b.getAttribute('data-dl'), 10)]; downloadText(f.path.split('/').pop(), f.content); }; });
      document.getElementById('dClearLogs').onclick = function() { logs = []; renderDev(container); };
      document.getElementById('dCopyReport').onclick = function() {
        var rep = 'FITNESS ELITE v2 REPORT\nENV: ' + App.env + '\nUA: ' + navigator.userAgent + '\n\nLOGS:\n' + logs.map(function(l) { return '[' + l.ts + '] ' + l.level.toUpperCase() + ': ' + l.msg; }).join('\n');
        if (navigator.clipboard) navigator.clipboard.writeText(rep).then(function() { Shell.notify('Отчёт скопирован'); });
      };
    });
  }

  App.define('dev-panel', {
    init: function() { Shell.registerScreen('dev', renderDev); }
  });
})();
