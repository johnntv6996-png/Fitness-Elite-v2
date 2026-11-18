// app/shell.js
(function() {
  'use strict';

  var screens = {};
  var navItems = [];
  var currentScreen = 'home';

  function buildShell() {
    var root = document.getElementById('app');
    if (!root) return;

    var isDev = window.App && window.App.env === 'dev';

    root.innerHTML =
      '<div class="fe-overlay" id="feOverlay"></div>' +
      '<aside class="fe-sidebar" id="feSidebar">' +
        '<div style="font-family:\'Playfair Display\',serif;font-size:1.2em;color:var(--accent);font-weight:700;padding-bottom:14px;border-bottom:1px solid var(--border);margin-bottom:14px;display:flex;align-items:center;gap:8px">' +
          '<i class="ph ph-barbell"></i> FITNESS ELITE' +
        '</div>' +
        '<div id="feNavList" style="flex:1;overflow-y:auto"></div>' +
        (isDev
          ? '<div style="border-top:1px solid var(--border);padding-top:10px">' +
              '<div class="fe-nav-item" id="feDevBtn"><i class="ph ph-code"></i> Панель разработчика</div>' +
            '</div>'
          : '') +
      '</aside>' +
      '<header class="fe-header">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<button class="fe-icon-btn" id="feMenuBtn" aria-label="Меню"><i class="ph ph-list"></i></button>' +
          '<h1 id="feLogoTitle" style="cursor:pointer;user-select:none"><i class="ph ph-barbell"></i> FITNESS ELITE</h1>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          (isDev ? '<span style="font-size:0.75em;padding:3px 8px;border-radius:8px;background:rgba(248,113,113,0.15);color:#f87171;border:1px solid #f87171;font-weight:700">DEV</span>' : '') +
        '</div>' +
      '</header>' +
      '<main class="fe-main" id="feMain"></main>' +
      '<div id="feToastBox" style="position:fixed;top:70px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:90vw"></div>';

    document.getElementById('feMenuBtn').onclick = toggleSidebar;
    document.getElementById('feOverlay').onclick = toggleSidebar;

    // Скрытый вход в DEV/PROD по 5 кликам на заголовок
    var taps = 0, tapTimer = null;
    document.getElementById('feLogoTitle').onclick = function() {
      taps++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(function() { taps = 0; }, 1200);
      if (taps >= 5) {
        taps = 0;
        var next = (window.App.env === 'dev') ? 'prod' : 'dev';
        if (confirm('Переключить контур на ' + next.toUpperCase() + '?')) {
          window.App.switchEnv(next);
        }
      }
    };

    if (isDev) {
      document.getElementById('feDevBtn').onclick = function() {
        toggleSidebar(false);
        navigate('dev');
      };
    }

    registerScreen('home', renderHomeFallback);
    registerScreen('dev', renderDevPanel);
    renderNav();
    navigate('home');
  }

  function toggleSidebar(force) {
    var sb = document.getElementById('feSidebar');
    var ov = document.getElementById('feOverlay');
    if (!sb || !ov) return;
    var open = typeof force === 'boolean' ? force : !sb.classList.contains('open');
    sb.classList.toggle('open', open);
    ov.classList.toggle('open', open);
  }

  function addNav(id, label, iconClass) {
    for (var i = 0; i < navItems.length; i++) {
      if (navItems[i].id === id) return;
    }
    navItems.push({ id: id, label: label, icon: iconClass || 'ph-circle' });
    renderNav();
  }

  function renderNav() {
    var box = document.getElementById('feNavList');
    if (!box) return;
    var html = '';
    for (var i = 0; i < navItems.length; i++) {
      var it = navItems[i];
      var active = it.id === currentScreen ? ' active' : '';
      html += '<div class="fe-nav-item' + active + '" data-screen="' + Store.esc(it.id) + '">' +
        '<i class="ph ' + Store.esc(it.icon) + '"></i> ' + Store.esc(it.label) +
      '</div>';
    }
    box.innerHTML = html;
    box.querySelectorAll('.fe-nav-item').forEach(function(el) {
      el.onclick = function() {
        toggleSidebar(false);
        navigate(el.getAttribute('data-screen'));
      };
    });
  }

  function registerScreen(id, renderFn) {
    screens[id] = renderFn;
    if (currentScreen === id) navigate(id);
  }

  function navigate(id) {
    currentScreen = id;
    renderNav();
    var main = document.getElementById('feMain');
    if (!main) return;
    var fn = screens[id];
    if (typeof fn === 'function') {
      main.innerHTML = '';
      fn(main);
    }
  }

  function renderHomeFallback(container) {
    var env = window.App ? window.App.env.toUpperCase() : 'PROD';
    container.innerHTML =
      '<div class="fe-card">' +
        '<h2 style="color:var(--accent);margin-bottom:8px;font-size:1.2em">Каркас v2 запущен</h2>' +
        '<p style="color:var(--text-secondary);font-size:0.9em;line-height:1.5">' +
          'Активный контур: <strong style="color:var(--accent)">' + env + '</strong>. ' +
          'Хранилище файлов и изолированные данные готовы к подключению модулей.' +
        '</p>' +
      '</div>';
  }

  function renderDevPanel(container) {
    FileDB.getAllFiles(window.App.env).then(function(files) {
      var listHtml = files.map(function(f) {
        return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85em">' +
          '<span>' + Store.esc(f.path) + '</span>' +
          '<span style="color:var(--success)">v' + Store.esc(f.version) + '</span>' +
        '</div>';
      }).join('');

      container.innerHTML =
        '<div class="fe-card">' +
          '<h2 style="color:var(--accent);margin-bottom:12px">Панель разработчика (DEV)</h2>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' +
            '<button class="fe-btn" id="devClearBtn"><i class="ph ph-trash"></i> Сбросить кэш файлов</button>' +
            '<button class="fe-btn fe-btn-sec" id="devToProdBtn"><i class="ph ph-arrow-left"></i> В режим PROD</button>' +
          '</div>' +
          '<div style="font-weight:600;margin-bottom:8px">Файлы в IndexedDB (' + files.length + '):</div>' +
          (listHtml || '<div style="opacity:0.6">Пусто</div>') +
        '</div>';

      document.getElementById('devClearBtn').onclick = function() {
        FileDB.clearEnv(window.App.env).then(function() {
          return FileDB.setMeta('manifest_' + window.App.env, null);
        }).then(function() { location.reload(); });
      };
      document.getElementById('devToProdBtn').onclick = function() {
        window.App.switchEnv('prod');
      };
    });
  }

  function notify(msg, isError) {
    var box = document.getElementById('feToastBox');
    if (!box) return;
    var el = document.createElement('div');
    el.style.cssText = 'padding:12px 16px;border-radius:10px;background:' + (isError ? '#dc2626' : '#16a34a') + ';color:#fff;font-size:0.9em;font-weight:500;box-shadow:0 6px 20px rgba(0,0,0,0.4)';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function() { el.remove(); }, 3000);
  }

  function showUpdateToast(curVer, remoteManifest, onApply) {
    if (document.getElementById('feUpdToast')) return;
    var el = document.createElement('div');
    el.id = 'feUpdToast';
    el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;background:var(--bg-secondary);border:1px solid var(--accent);border-radius:14px;padding:12px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 30px rgba(0,0,0,0.6);max-width:92vw';
    el.innerHTML =
      '<div style="flex:1;font-size:0.88em"><strong style="color:var(--accent)">Доступна v' + Store.esc(remoteManifest.version) + '</strong><br><span style="opacity:0.7">Текущая: ' + Store.esc(curVer) + '</span></div>' +
      '<button class="fe-btn" id="feUpdRun" style="padding:8px 14px;font-size:0.85em">Обновить</button>' +
      '<button id="feUpdClose" style="background:none;border:none;color:var(--text-secondary);font-size:1.3em;cursor:pointer">×</button>';
    document.body.appendChild(el);

    document.getElementById('feUpdClose').onclick = function() { el.remove(); };
    document.getElementById('feUpdRun').onclick = function() {
      this.disabled = true;
      this.textContent = '...';
      onApply().catch(function(e) { notify('Ошибка: ' + e.message, true); el.remove(); });
    };
  }

  window.Shell = {
    addNav: addNav,
    registerScreen: registerScreen,
    navigate: navigate,
    notify: notify,
    showUpdateToast: showUpdateToast
  };

  buildShell();
})();
