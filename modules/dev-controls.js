// modules/dev-controls.js
(function() {
  'use strict';

  function render(container) {
    var isDev = window.App && App.env === 'dev';
    var source = isDev ? App.getDevSource() : 'online';

    var sourceText = source === 'local'
      ? 'Локальные файлы'
      : 'Ветка dev на GitHub';

    container.innerHTML =
      '<div style="padding:4px;max-width:500px;margin:0 auto">' +
        '<h2 style="font-family:var(--font-display);font-size:1.8em;margin-bottom:16px;color:var(--accent-gold)">' +
          '<i class="ph ph-code"></i> Разработка' +
        '</h2>' +

        '<div class="set-card">' +
          '<h3><i class="ph ph-info"></i> Текущий режим</h3>' +
          '<div style="font-size:0.9em;opacity:0.8">' +
            'Контур: <strong>' + (isDev ? 'DEV' : 'PROD') + '</strong><br>' +
            'Источник DEV: <strong>' + sourceText + '</strong>' +
          '</div>' +
        '</div>' +

        (isDev
          ? '<div class="set-card">' +
              '<h3><i class="ph ph-folder-open"></i> Офлайн-разработка</h3>' +
              '<div style="font-size:0.85em;opacity:0.75;margin-bottom:12px">' +
                'Выбери корневую папку проекта. Приложение сохранит её файлы и будет запускать DEV из них.' +
              '</div>' +
              '<label class="btn btn-primary" style="display:block;text-align:center;margin-bottom:10px">' +
                '<i class="ph ph-upload-simple"></i> Выбрать папку проекта' +
                '<input type="file" webkitdirectory directory multiple style="display:none" onchange="App.importLocalFolder(this.files)">' +
              '</label>' +
              '<button class="btn btn-secondary" style="width:100%" onclick="App.reloadDevFromGitHub()">' +
                '<i class="ph ph-arrow-clockwise"></i> Вернуться к ветке dev' +
              '</button>' +
            '</div>' +

            '<div class="set-card">' +
              '<h3><i class="ph ph-github-logo"></i> Онлайн DEV</h3>' +
              '<button class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="App.reloadDevFromGitHub()">' +
                '<i class="ph ph-arrow-clockwise"></i> Обновить из ветки dev' +
              '</button>' +
              '<button class="btn btn-secondary" style="width:100%" onclick="App.openDevBranch()">' +
                '<i class="ph ph-arrow-up-right"></i> Открыть ветку dev на GitHub' +
              '</button>' +
            '</div>'
          : '') +
      '</div>';
  }

  App.define('dev-controls', {
    init: function() {
      if (window.App.env !== 'dev') return;

      Shell.addNav('dev-controls', 'Разработка', 'ph-code');
      Shell.registerScreen('dev-controls', render);
    }
  });
})();
