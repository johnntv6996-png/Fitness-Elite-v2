// app/shell.js
(function() {
  'use strict';

  var screens = {};
  var navItems = [];
  var currentScreen = 'home';

  function isImageAvatar(a) { return typeof a === 'string' && a.indexOf('data:image') === 0; }
  function isIconAvatar(a) { return typeof a === 'string' && /^ph-[a-z0-9-]+$/.test(a); }

  function renderAvatarHTML(avatar, sizePx) {
    sizePx = sizePx || 52;
    if (isImageAvatar(avatar)) {
      return '<img src="' + Store.esc(avatar) + '" style="width:100%;height:100%;object-fit:cover" alt="avatar">';
    }
    var ic = isIconAvatar(avatar) ? avatar : 'ph-user-circle';
    return '<i class="ph ' + Store.esc(ic) + '" style="font-size:' + Math.round(sizePx * 0.55) + 'px;color:var(--accent-gold)"></i>';
  }

  function buildShell() {
    var root = document.getElementById('app');
    if (!root) return;
    var isDev = window.App && window.App.env === 'dev';

    root.innerHTML =
      '<div id="achievementContainer"></div>' +
      '<div class="achievement-particles" id="achievementParticles"></div>' +
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
                '<div class="profile-ach-hint"><i class="ph ph-trophy"></i><span id="feAchText">до ур. 5: 400 XP</span></div>' +
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
        '<div class="header" id="mainHeader">' +
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
      '<div id="feToastBox" style="position:fixed;top:80px;right:16px;z-index:99999;display:flex;flex-direction:column;align-items:flex-end;gap:10px;pointer-events:none;max-width:calc(100vw - 32px)"></div>';

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
      Events.on('store:user_avatar', updateSidebarStats);
    }

    addNav('home', 'Главная', 'ph-house');
    navigate('home');
  }

  function updateSidebarStats() {
    var nameEl = document.getElementById('feSideName');
    if (nameEl) {
      var nm = Store.get('user_name', '');
      nameEl.innerHTML = '<span>' + Store.esc(nm || 'Гость') + '</span><i class="ph ph-pencil-simple"></i>';
    }
    var avEl = document.getElementById('feSideAvatar');
    if (avEl) avEl.innerHTML = renderAvatarHTML(Store.get('user_avatar', null), 52);

    if (typeof MathCore === 'undefined') return;
    var st = MathCore.getStats();
    var lvl = st.level || 1;
    var xp = st.xp || 0;
    var need = MathCore.xpForLevel(lvl);
    var pct = need > 0 ? Math.min(100, Math.round((xp / need) * 100)) : 0;

    var iconEl = document.getElementById('feLvlIcon');
    if (iconEl) iconEl.className = 'ph ' + MathCore.getLevelIcon(lvl) + ' profile-level-icon';

    var n = document.getElementById('feLvlNum'); if (n) n.textContent = lvl;
    var c = document.getElementById('feXpCur'); if (c) c.textContent = xp;
    var nd = document.getElementById('feXpNeed'); if (nd) nd.textContent = need;
    var fl = document.getElementById('feXpFill'); if (fl) fl.style.width = pct + '%';

    var achText = document.getElementById('feAchText');
    if (achText) {
      var thresholds = new Array(5, 10, 20, 50, 100);
      var nextAch = null;
      for (var i = 0; i < thresholds.length; i++) {
        if (lvl < thresholds[i]) { nextAch = thresholds[i]; break; }
      }
      if (nextAch) {
        var curTot = MathCore.totalXp(st);
        var nextTot = MathCore.totalXp({ level: nextAch, xp: 0 });
        achText.textContent = 'до ур. ' + nextAch + ': ' + Math.max(0, nextTot - curTot) + ' XP';
      } else {
        achText.textContent = 'Максимальный уровень!';
      }
    }
  }
  function toggleSidebar(force) {
    var sb = document.getElementById('feSidebar');
    var ov = document.getElementById('feOverlay');
    var hb = document.getElementById('feMenuBtn');
    if (!sb || !ov) return;
    var open = typeof force === 'boolean' ? force : !sb.classList.contains('active');
    sb.classList.toggle('active', open);
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
    if (typeof fn === 'function') {
      main.innerHTML = '';
      fn(main);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function openStylePicker() {
    var old = document.getElementById('styleQuickPicker');
    if (old) { old.remove(); return; }
    var all = (typeof StyleManager !== 'undefined') ? StyleManager.getAllStyles() : [];
    var cur = (typeof StyleManager !== 'undefined') ? StyleManager.getCurrentStyle() : 'default';

    var overlay = document.createElement('div');
    overlay.id = 'styleQuickPicker';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 0.2s ease-out';
    var rows = all.map(function(s) {
      var act = s.id === cur;
      var dots = s.colors.map(function(c) { return '<div style="width:10px;height:10px;border-radius:50%;background:' + c + '"></div>'; }).join('');
      return '<div data-sid="' + Store.esc(s.id) + '" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:4px;border:1px solid ' + (act ? 'var(--accent-gold)' : 'transparent') + ';background:' + (act ? 'var(--accent-gold-dim)' : 'transparent') + '">' +
        '<div style="display:flex;gap:3px;flex-shrink:0">' + dots + '</div>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:0.9em">' + Store.esc(s.name) + '</div><div style="font-size:0.72em;opacity:0.6">' + Store.esc(s.description || '') + '</div></div>' +
        (act ? '<i class="ph ph-check-circle" style="color:var(--accent-gold);font-size:1.1em"></i>' : '') +
      '</div>';
    }).join('');

    overlay.innerHTML =
      '<div style="background:var(--bg-secondary);border-radius:20px 20px 0 0;border-top:1px solid var(--border-gold);width:100%;max-width:500px;max-height:70vh;overflow-y:auto;padding:16px 16px 24px;animation:slideUp 0.3s ease-out;box-shadow:0 -10px 40px rgba(0,0,0,0.5)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
          '<div style="font-family:var(--font-display);color:var(--accent-gold);font-size:1.2em;font-weight:700"><i class="ph ph-palette"></i> Стиль</div>' +
          '<button id="spClose" style="background:transparent;border:none;color:var(--text-secondary);font-size:1.4em;cursor:pointer"><i class="ph ph-x"></i></button>' +
        '</div>' + rows +
        (screens['styles'] ? '<button id="spAllStyles" class="btn btn-secondary" style="width:100%;margin-top:10px"><i class="ph ph-sliders"></i> Все стили</button>' : '') +
      '</div>';
    document.body.appendChild(overlay);
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    document.getElementById('spClose').onclick = function() { overlay.remove(); };
    var allBtn = document.getElementById('spAllStyles');
    if (allBtn) allBtn.onclick = function() { overlay.remove(); navigate('styles'); };
    overlay.querySelectorAll('[data-sid]').forEach(function(el) {
      el.onclick = function() {
        if (typeof StyleManager !== 'undefined') StyleManager.applyStyle(el.getAttribute('data-sid'));
        overlay.remove();
        notify('Стиль применён');
      };
    });
  }

  function openProfileModal() {
    var name = Store.get('user_name', '');
    var avatar = Store.get('user_avatar', null);
    var hasAv = isImageAvatar(avatar) || isIconAvatar(avatar);
    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'profileModal';
    modal.innerHTML =
      '<div class="ex-modal-content" style="max-width:450px">' +
        '<button id="prCloseX" style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer"><i class="ph ph-x"></i></button>' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0;display:flex;align-items:center;gap:10px"><i class="ph ph-user-circle"></i> Профиль</h2>' +
        '<div style="text-align:center;margin:20px 0">' +
          '<div id="profileAvatarPreview" style="width:100px;height:100px;border-radius:50%;border:3px solid var(--border-gold);overflow:hidden;background:var(--bg-primary);display:inline-flex;align-items:center;justify-content:center">' +
            renderAvatarHTML(avatar, 100) +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:20px;flex-wrap:wrap">' +
          '<button class="btn btn-primary" id="prUploadBtn" style="padding:10px 16px;font-size:0.9em"><i class="ph ph-upload-simple"></i> Фото</button>' +
          '<button class="btn btn-secondary" id="prIconBtn" style="padding:10px 16px;font-size:0.9em"><i class="ph ph-smiley"></i> Иконка</button>' +
          '<button class="btn btn-danger" id="prDelAvBtn" style="padding:10px 16px;font-size:0.9em" ' + (hasAv ? '' : 'disabled') + '><i class="ph ph-trash"></i> Удалить</button>' +
        '</div>' +
        '<div style="margin-bottom:16px"><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Имя:</label>' +
        '<input id="prNameInp" type="text" value="' + Store.esc(name) + '" placeholder="Введи своё имя" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em"></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">' +
          '<button class="btn btn-secondary" id="prCancel">Отмена</button>' +
          '<button class="btn btn-primary" id="prSave"><i class="ph ph-floppy-disk"></i> Сохранить</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    function refreshPreview() {
      var cur = Store.get('user_avatar', null);
      var p = document.getElementById('profileAvatarPreview');
      if (p) p.innerHTML = renderAvatarHTML(cur, 100);
      var del = document.getElementById('prDelAvBtn');
      if (del) del.disabled = !(isImageAvatar(cur) || isIconAvatar(cur));
    }

    document.getElementById('prCloseX').onclick = function() { modal.remove(); };
    document.getElementById('prCancel').onclick = function() { modal.remove(); };
    document.getElementById('prSave').onclick = function() {
      Store.set('user_name', document.getElementById('prNameInp').value.trim());
      modal.remove();
      notify('Профиль сохранён!');
    };
    document.getElementById('prDelAvBtn').onclick = function() {
      if (!confirm('Удалить аватар?')) return;
      Store.remove('user_avatar');
      updateSidebarStats();
      refreshPreview();
    };
    document.getElementById('prUploadBtn').onclick = function() {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function(e) {
        var f = e.target.files && e.target.files.item(0);
        if (!f || f.size > 2 * 1024 * 1024) { notify('Максимум 2 МБ', true); return; }
        var r = new FileReader();
        r.onload = function(ev) {
          var img = new Image();
          img.onload = function() {
            var c = document.createElement('canvas'); c.width = 160; c.height = 160;
            var min = Math.min(img.width, img.height);
            c.getContext('2d').drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, 160, 160);
            Store.set('user_avatar', c.toDataURL('image/jpeg', 0.85));
            refreshPreview();
          };
          img.src = ev.target.result;
        };
        r.readAsDataURL(f);
      };
      inp.click();
    };
    document.getElementById('prIconBtn').onclick = function() {
      var icons = new Array('ph-user-circle','ph-barbell','ph-sword','ph-person-simple-run','ph-flame','ph-lightning','ph-star','ph-crown','ph-diamond','ph-trophy','ph-rocket','ph-target');
      var sub = document.createElement('div');
      sub.className = 'ex-modal'; sub.style.zIndex = '2200';
      sub.innerHTML = '<div class="ex-modal-content" style="max-width:400px"><h3 style="color:var(--accent-gold);margin-bottom:12px">Выбери иконку</h3>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' +
        icons.map(function(ic) { return '<button class="btn btn-secondary" data-ic="' + ic + '" style="padding:12px;font-size:1.5em"><i class="ph ' + ic + '"></i></button>'; }).join('') +
        '</div></div>';
      document.body.appendChild(sub);
      sub.onclick = function(e) { if (e.target === sub) sub.remove(); };
      sub.querySelectorAll('[data-ic]').forEach(function(b) {
        b.onclick = function() { Store.set('user_avatar', b.getAttribute('data-ic')); sub.remove(); refreshPreview(); };
      });
    };
  }

  function showAchievementToast(name, description, icon) {
    var container = document.getElementById('achievementContainer');
    if (!container) return;
    if (container.children.length >= 3) container.firstChild.remove();
    var toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = '<i class="ph-fill ' + Store.esc(icon || 'ph-trophy') + ' ach-icon"></i>' +
      '<div class="ach-text"><div class="ach-title">🏆 Достижение разблокировано!</div>' +
      '<div class="ach-desc"><strong>' + Store.esc(name) + '</strong> — ' + Store.esc(description) + '</div></div>';
    container.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 50);
    setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 600); }, 4000);
  }

  function notify(msg, isError) {
    var box = document.getElementById('feToastBox');
    if (!box) return;
    var el = document.createElement('div');
    el.style.cssText = 'pointer-events:auto;padding:12px 16px;border-radius:12px;background:' + (isError ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#16a34a,#22c55e)') + ';color:#fff;font-weight:500;font-size:0.92em;box-shadow:0 8px 24px rgba(0,0,0,0.35)';
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

  window.Shell = {
    addNav: addNav, registerScreen: registerScreen, navigate: navigate,
    notify: notify, showUpdateToast: showUpdateToast, showAchievementToast: showAchievementToast,
    renderAvatarHTML: renderAvatarHTML
  };
  buildShell();
})();
