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
      '<div class="sidebar-overlay" id="feOverlay"></div>' +
      '<aside class="sidebar" id="feSidebar">' +
        '<div class="sidebar-header" id="feSideHome" style="cursor:pointer">' +
          '<h2><i class="ph ph-barbell"></i> FITNESS ELITE</h2>' +
        '</div>' +
        '<div class="sidebar-profile" id="feSideProfile">' +
          '<div class="sidebar-profile-top">' +
            '<div class="sidebar-profile-avatar" id="feSideAvatar"><i class="ph ph-user-circle"></i></div>' +
            '<div class="sidebar-profile-info">' +
              '<div class="sidebar-profile-name" id="feSideName"><span>Гость</span><i class="ph ph-pencil-simple"></i></div>' +
              '<div class="sidebar-profile-sub">Нажми для редактирования</div>' +
            '</div>' +
          '</div>' +
          '<div class="profile-level-block">' +
            '<div class="profile-level-top">' +
              '<div class="profile-level-left">' +
                '<i class="ph ph-star profile-level-icon" id="feLvlIcon"></i>' +
                '<div class="profile-level-num"><span id="feLvlNum">1</span><span class="profile-level-label">уровень</span></div>' +
              '</div>' +
              '<div class="profile-xp-block">' +
                '<div class="profile-xp-text"><span>XP</span><span><strong id="feXpCur">0</strong> / <span id="feXpNeed">100</span></span></div>' +
                '<div class="profile-xp-bar"><div class="profile-xp-fill" id="feXpFill" style="width:0%"></div></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-section-title">Навигация</div>' +
          '<div id="feNavList"></div>' +
        '</div>' +
        (isDev
          ? '<div class="sidebar-divider"></div><div class="sidebar-section">' +
              '<div class="sidebar-item" id="feDevBtn"><i class="ph ph-code"></i> Панель разработчика</div>' +
            '</div>'
          : '') +
      '</aside>' +
      '<div class="header-wrapper">' +
        '<div class="header">' +
          '<div class="header-left">' +
            '<button class="hamburger" id="feMenuBtn" aria-label="Меню"><span></span><span></span><span></span></button>' +
            '<h1 id="feLogoTitle" style="user-select:none"><i class="ph ph-barbell"></i> FITNESS ELITE</h1>' +
          '</div>' +
          '<div class="header-right">' +
            (isDev ? '<span style="font-size:0.72em;padding:2px 8px;border:1px solid var(--accent-error);border-radius:10px;color:var(--accent-error);font-weight:700">DEV</span>' : '') +
            '<button class="theme-btn" id="feStyleBtn" title="Сменить стиль"><i class="ph ph-palette"></i></button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="main-content" id="feMain"></div>' +
      '<div id="feToastBox" style="position:fixed;top:76px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:90vw"></div>';

    document.getElementById('feMenuBtn').onclick = function(e) { e.stopPropagation(); toggleSidebar(); };
    document.getElementById('feOverlay').onclick = function() { toggleSidebar(false); };
    document.getElementById('feSideHome').onclick = function() { toggleSidebar(false); navigate('home'); };
    document.getElementById('feStyleBtn').onclick = function(e) { e.stopPropagation(); openStylePicker(); };
    document.getElementById('feSideProfile').onclick = function() { toggleSidebar(false); openProfileModal(); };

    var taps = 0, tapTimer = null;
    document.getElementById('feLogoTitle').onclick = function() {
      taps++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(function() { taps = 0; }, 1200);
      if (taps >= 5) {
        taps = 0;
        var next = (window.App.env === 'dev') ? 'prod' : 'dev';
        if (confirm('Переключить контур на ' + next.toUpperCase() + '?')) window.App.switchEnv(next);
      }
    };

    if (isDev) {
      document.getElementById('feDevBtn').onclick = function() { toggleSidebar(false); navigate('dev'); };
    }

    updateSidebarStats();
    if (window.Events) {
      Events.on('store:stats', updateSidebarStats);
      Events.on('store:user_name', updateSidebarStats);
    }

    addNav('home', 'Главная', 'ph-house');
    registerScreen('dev', renderDevPanel);
    navigate('home');
  }

  function updateSidebarStats() {
    var nameEl = document.getElementById('feSideName');
    if (nameEl) {
      var nm = Store.get('user_name', '');
      nameEl.innerHTML = '<span>' + Store.esc(nm || 'Гость') + '</span><i class="ph ph-pencil-simple"></i>';
    }
    if (typeof MathCore === 'undefined') return;
    var st = MathCore.getStats();
    var need = MathCore.xpForLevel(st.level);
    var pct = need > 0 ? Math.min(100, Math.round((st.xp / need) * 100)) : 0;
    var n = document.getElementById('feLvlNum'); if (n) n.textContent = st.level;
    var c = document.getElementById('feXpCur'); if (c) c.textContent = st.xp;
    var nd = document.getElementById('feXpNeed'); if (nd) nd.textContent = need;
    var fl = document.getElementById('feXpFill'); if (fl) fl.style.width = pct + '%';
  }

  function toggleSidebar(force) {
    var sb = document.getElementById('feSidebar');
    var ov = document.getElementById('feOverlay');
    var hb = document.getElementById('feMenuBtn');
    if (!sb || !ov) return;
    var open = typeof force === 'boolean' ? force : !sb.classList.contains('open');
    sb.classList.toggle('active', open);
    sb.classList.toggle('open', open);
    ov.classList.toggle('active', open);
    if (hb) hb.classList.toggle('active', open);
    document.body.classList.toggle('sidebar-open', open);
  }

  function addNav(id, label, iconClass) {
    for (var i = 0; i < navItems.length; i++) if (navItems[i].id === id) return;
    navItems.push({ id: id, label: label, icon: iconClass || 'ph-circle' });
    renderNav();
  }

  function renderNav() {
    var box = document.getElementById('feNavList');
    if (!box) return;
    box.innerHTML = navItems.map(function(it) {
      var active = it.id === currentScreen ? ' active' : '';
      return '<div class="sidebar-item' + active + '" data-screen="' + Store.esc(it.id) + '">' +
        '<i class="ph ' + Store.esc(it.icon) + '"></i> ' + Store.esc(it.label) + '</div>';
    }).join('');
    box.querySelectorAll('.sidebar-item').forEach(function(el) {
      el.onclick = function() { toggleSidebar(false); navigate(el.getAttribute('data-screen')); };
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
    if (typeof fn === 'function') { main.innerHTML = ''; fn(main); }
  }

  function openStylePicker() {
    var old = document.getElementById('styleQuickPicker');
    if (old) { old.remove(); return; }
    var all = (typeof StyleManager !== 'undefined') ? StyleManager.getAllStyles() : [];
    var cur = (typeof StyleManager !== 'undefined') ? StyleManager.getCurrentStyle() : 'default';

    var overlay = document.createElement('div');
    overlay.id = 'styleQuickPicker';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:2000;display:flex;align-items:flex-end;justify-content:center';
    var rows = all.map(function(s) {
      var act = s.id === cur;
      var dots = s.colors.map(function(c) { return '<span style="width:10px;height:10px;border-radius:50%;background:' + c + ';display:inline-block"></span>'; }).join('');
      return '<div data-sid="' + Store.esc(s.id) + '" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:4px;border:1px solid ' + (act ? 'var(--accent-gold)' : 'transparent') + ';background:' + (act ? 'var(--accent-gold-dim)' : 'transparent') + '">' +
        '<div style="display:flex;gap:3px">' + dots + '</div>' +
        '<div style="flex:1"><div style="font-weight:600;font-size:0.9em">' + Store.esc(s.name) + '</div><div style="font-size:0.75em;opacity:0.65">' + Store.esc(s.description || '') + '</div></div>' +
        (act ? '<i class="ph ph-check-circle" style="color:var(--accent-gold)"></i>' : '') +
      '</div>';
    }).join('');

    overlay.innerHTML =
      '<div style="background:var(--bg-secondary);border-radius:20px 20px 0 0;border-top:1px solid var(--border-gold);width:100%;max-width:480px;max-height:70vh;overflow-y:auto;padding:16px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
          '<strong style="color:var(--accent-gold);font-family:var(--font-display)"><i class="ph ph-palette"></i> Тема оформления</strong>' +
          '<button id="spClose" style="background:none;border:none;color:var(--text-secondary);font-size:1.4em;cursor:pointer"><i class="ph ph-x"></i></button>' +
        '</div>' + rows +
      '</div>';
    document.body.appendChild(overlay);
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    document.getElementById('spClose').onclick = function() { overlay.remove(); };
    overlay.querySelectorAll('[data-sid]').forEach(function(el) {
      el.onclick = function() {
        if (typeof StyleManager !== 'undefined') StyleManager.applyStyle(el.getAttribute('data-sid'));
        overlay.remove();
        notify('Тема применена');
      };
    });
  }

  function openProfileModal() {
    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.innerHTML =
      '<div class="ex-modal-content" style="max-width:400px">' +
        '<h3 style="color:var(--accent-gold);margin-bottom:12px">Профиль</h3>' +
        '<input id="prNameInp" type="text" value="' + Store.esc(Store.get('user_name', '')) + '" placeholder="Твоё имя" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-primary);color:var(--text-primary);margin-bottom:14px">' +
        '<div style="display:flex;gap:8px;justify-content:flex-end">' +
          '<button class="btn btn-secondary" id="prCancel">Отмена</button>' +
          '<button class="btn btn-primary" id="prSave">Сохранить</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    document.getElementById('prCancel').onclick = function() { modal.remove(); };
    document.getElementById('prSave').onclick = function() {
      Store.set('user_name', document.getElementById('prNameInp').value.trim());
      modal.remove();
      notify('Профиль сохранён');
    };
  }

  function renderDevPanel(container) {
    Promise.all([FileDB.getMeta('manifest_dev'), FileDB.getAllFiles('dev')]).then(function(res) {
      var manifest = res || { version: '0.1.4-dev', files: [] };
      var files = res || [];
      var listHtml = files.map(function(f, idx) {
        return '<div class="module-item"><span style="font-size:0.9em">' + Store.esc(f.path) + '</span>' +
          '<div style="display:flex;gap:6px"><button class="btn btn-secondary" data-edit="' + idx + '" style="padding:6px 12px">Править</button></div></div>';
      }).join('');
      container.innerHTML =
        '<div class="dev-panel">' +
          '<h3 style="color:var(--accent-gold);margin-bottom:14px">Панель разработчика (DEV)</h3>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' +
            '<button class="btn btn-primary" id="devCopyProdBtn">Копия из PROD</button>' +
            '<button class="btn btn-secondary" id="devToProdBtn">В режим PROD</button>' +
          '</div>' + listHtml +
        '</div><div id="devEditorWrap"></div>';
      document.getElementById('devToProdBtn').onclick = function() { window.App.switchEnv('prod'); };
      document.getElementById('devCopyProdBtn').onclick = function() {
        FileDB.copyProdToDev().then(function() { notify('Скопировано'); renderDevPanel(container); }).catch(function(e) { notify(e.message, true); });
      };
      container.querySelectorAll('[data-edit]').forEach(function(b) {
        b.onclick = function() {
          var f = files[parseInt(b.getAttribute('data-edit'), 10)];
          document.getElementById('devEditorWrap').innerHTML =
            '<div class="dev-panel"><h4 style="color:var(--accent-gold);margin-bottom:8px">' + Store.esc(f.path) + '</h4>' +
            '<textarea id="edCode" rows="12" style="width:100%;padding:10px;background:#000;color:#4ade80;font-family:monospace">' + Store.esc(f.content) + '</textarea>' +
            '<button class="btn btn-primary" id="edSave" style="margin-top:10px">Сохранить</button></div>';
          document.getElementById('edSave').onclick = function() {
            f.content = document.getElementById('edCode').value;
            FileDB.saveSingleFile('dev', f).then(function() { location.reload(); });
          };
        };
      });
    });
  }

  function notify(msg, isError) {
    var box = document.getElementById('feToastBox');
    if (!box) return;
    var el = document.createElement('div');
    el.style.cssText = 'padding:12px 16px;border-radius:12px;background:' + (isError ? 'var(--accent-error)' : 'var(--accent-success)') + ';color:#000;font-weight:600;font-size:0.9em;box-shadow:var(--shadow-modal)';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function() { el.remove(); }, 3000);
  }

  function showUpdateToast(curVer, remoteManifest, onApply) {
    if (document.getElementById('feUpdToast')) return;
    var el = document.createElement('div');
    el.id = 'feUpdToast';
    el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;background:var(--bg-secondary);border:1px solid var(--accent-gold);border-radius:14px;padding:12px 16px;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow-modal);max-width:92vw';
    el.innerHTML = '<div style="flex:1;font-size:0.88em"><strong style="color:var(--accent-gold)">Доступна v' + Store.esc(remoteManifest.version) + '</strong></div>' +
      '<button class="btn btn-primary" id="feUpdRun" style="padding:8px 14px">Обновить</button>';
    document.body.appendChild(el);
    document.getElementById('feUpdRun').onclick = function() { onApply().catch(function(e) { notify(e.message, true); }); };
  }

  window.Shell = { addNav: addNav, registerScreen: registerScreen, navigate: navigate, notify: notify, showUpdateToast: showUpdateToast };
  buildShell();
})();
