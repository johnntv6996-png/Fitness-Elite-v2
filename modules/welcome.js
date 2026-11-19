// modules/welcome.js
(function() {
  'use strict';

  function getMotivation(streak) {
    if (streak === 0) return { text: 'Начни свой путь сегодня!', icon: 'ph-rocket-launch' };
    if (streak < 3) return { text: 'Хорошее начало! Продолжай', icon: 'ph-flame' };
    if (streak < 7) return { text: 'Отличная серия! Ты на пути', icon: 'ph-target' };
    if (streak < 14) return { text: 'Неделя силы! Ты машина', icon: 'ph-rocket-launch' };
    if (streak < 30) return { text: 'Дисциплина — суперсила', icon: 'ph-lightning' };
    return { text: 'Ты легенда!', icon: 'ph-crown' };
  }

  function animateValue(el, start, end, duration) {
    if (!el || duration <= 0 || start === end) { if (el) el.textContent = end; return; }
    var startTime = null;
    var step = function(ts) {
      if (!startTime) startTime = ts;
      var p = Math.min((ts - startTime) / duration, 1);
      el.textContent = Math.floor(start + (end - start) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function getTodayRecord(history, todayStr) {
    for (var i = 0; i < history.length; i++) if (history[i] && history[i].date === todayStr) return history[i];
    return null;
  }

  function renderWelcome(container) {
    var esc = Store.esc;
    var userName = Store.get('user_name', '');
    var greeting = userName ? 'Приветствую, ' + esc(userName) + '!' : 'Приветствую!';
    var stats = MathCore.getStats();
    var xpNeeded = MathCore.xpForLevel(stats.level);
    var xpPct = xpNeeded > 0 ? Math.min(100, Math.round((stats.xp / xpNeeded) * 100)) : 0;
    var totalXp = MathCore.totalXp(stats);

    var todayIdx = MathCore.getTodayIndex();
    var dayName = MathCore.getDayName(todayIdx);
    var todayStr = MathCore.todayStr();
    var plan = Store.get('plan', []);
    var todayPlan = plan[todayIdx] || null;
    var exCount = (todayPlan && Array.isArray(todayPlan.exercises)) ? todayPlan.exercises.length : 0;

    var history = Store.get('history', []);
    var todayRec = getTodayRecord(history, todayStr);
    var dayClosed = todayRec && todayRec.xpDayAwarded;
    var daySkipped = todayRec && todayRec.skipped;
    var mot = getMotivation(stats.streak);

    var circleHtml = dayClosed
      ? '<button class="start-circle" disabled><i class="ph ph-check-circle"></i><span>Готово</span><small>закрыт</small></button>'
      : daySkipped
        ? '<button class="start-circle" id="btnStartWorkout"><i class="ph ph-arrow-counterclockwise"></i><span>Вернуться</span><small>передумал?</small></button>'
        : exCount > 0
          ? '<button class="start-circle" id="btnStartWorkout"><i class="ph ph-play-circle"></i><span>Начать</span><small>' + exCount + ' упр.</small></button>'
          : '<button class="start-circle" id="btnGoPlan"><i class="ph ph-calendar-plus"></i><span>План</span></button>';

    var statusHtml = daySkipped
      ? '<div class="card card-left-error anim-fade"><strong style="color:var(--accent-error)">День пропущен</strong><div class="text-small">Можно передумать и начать тренировку</div></div>'
      : dayClosed
        ? '<div class="card card-left-success anim-fade"><strong style="color:var(--accent-success)">Тренировка проведена</strong><div class="text-small">Отличная работа!</div></div>'
        : '';

    container.innerHTML =
      '<div class="screen-container narrow">' +
        '<div class="card card-gold anim-fade anim-glow">' +
          '<div class="lvl-header">' +
            '<div class="lvl-badge"><i class="ph ph-star anim-pulse"></i><span class="lvl-num w-anim-lvl">' + stats.level + '</span><span class="text-small">уровень</span></div>' +
            '<div><strong class="w-anim-xp">' + stats.xp + '</strong> <span class="text-small">/ ' + xpNeeded + ' XP</span></div>' +
          '</div>' +
          '<div class="xp-track"><div class="xp-fill" style="width:' + xpPct + '%"></div></div>' +
        '</div>' +

        '<div class="card anim-fade anim-d1" style="display:flex;justify-content:space-between;align-items:center">' +
          '<div><div style="font-weight:600;color:var(--accent-gold);font-size:1.1em">' + greeting + '</div>' +
          '<div class="text-small">Сегодня <strong>' + esc(dayName) + '</strong></div></div>' +
          '<div style="color:var(--accent-gold);font-size:0.85em"><i class="ph ph-list-checks"></i> ' + (exCount > 0 ? exCount + ' упр.' : 'нет плана') + '</div>' +
        '</div>' +

        '<div class="welcome-hero anim-fade anim-d2">' +
          circleHtml +
          '<div class="welcome-sub-btns">' +
            '<button class="btn btn-secondary" id="wLaterBtn" ' + (dayClosed ? 'disabled' : '') + '><i class="ph ph-clock"></i> Позже</button>' +
            '<button class="btn w-skip" id="wSkipBtn" ' + (dayClosed ? 'disabled' : '') + '><i class="ph ph-x"></i> Пропустить</button>' +
          '</div>' +
        '</div>' +

        statusHtml +

        '<div class="stat-grid-3 anim-fade anim-d2">' +
          '<div class="stat-tile"><i class="ph ph-flame anim-pulse"></i><div class="stat-tile-val w-anim-str">' + stats.streak + '</div><div class="stat-tile-lbl">стрик</div></div>' +
          '<div class="stat-tile"><i class="ph ph-barbell"></i><div class="stat-tile-val w-anim-wrk">' + (stats.yes || 0) + '</div><div class="stat-tile-lbl">тренировок</div></div>' +
          '<div class="stat-tile"><i class="ph ph-lightning"></i><div class="stat-tile-val w-anim-tot">' + totalXp + '</div><div class="stat-tile-lbl">всего XP</div></div>' +
        '</div>' +

        '<div class="card card-left-gold anim-fade anim-d3" style="display:flex;align-items:center;gap:10px">' +
          '<i class="ph ' + mot.icon + '" style="font-size:1.3em;color:var(--accent-gold)"></i>' +
          '<strong style="color:var(--accent-gold)">' + esc(mot.text) + '</strong>' +
        '</div>' +
      '</div>';

    setTimeout(function() {
      animateValue(document.querySelector('.w-anim-lvl'), 0, stats.level, 700);
      animateValue(document.querySelector('.w-anim-xp'), 0, stats.xp, 900);
      animateValue(document.querySelector('.w-anim-str'), 0, stats.streak, 700);
      animateValue(document.querySelector('.w-anim-wrk'), 0, stats.yes || 0, 900);
      animateValue(document.querySelector('.w-anim-tot'), 0, totalXp, 1100);
    }, 80);

    var btnPlan = document.getElementById('btnGoPlan');
    if (btnPlan) btnPlan.onclick = function() {
      if (App.getModule('plan')) Shell.navigate('plan');
      else Shell.notify('Модуль «План» ещё не подключён', true);
    };

    var btnStart = document.getElementById('btnStartWorkout');
    if (btnStart && !dayClosed) btnStart.onclick = function() {
      if (daySkipped) {
        if (!confirm('Отменить пропуск и начать тренировку?')) return;
        todayRec.skipped = false;
        Store.set('history', history);
      }
      var w = App.getModule('workout');
      if (w && w.open) w.open();
      else Shell.notify('Модуль «Тренировка» ещё не подключён', true);
    };

    document.getElementById('wLaterBtn').onclick = function() {
      if (stats.lastLaterDate === todayStr) { Shell.notify('Уже напоминали сегодня'); return; }
      stats.later = (stats.later || 0) + 1;
      stats.lastLaterDate = todayStr;
      Store.set('stats', stats);
      Shell.notify('Напомню через 3 часа ⏰');
    };

    document.getElementById('wSkipBtn').onclick = function() {
      if (daySkipped) { Shell.notify('День уже отмечен как пропущенный'); return; }
      stats.no = (stats.no || 0) + 1;
      Store.set('stats', stats);
      if (!todayRec) history.push({ date: todayStr, dayName: dayName, exercises: [], details: [], skipped: true });
      else todayRec.skipped = true;
      Store.set('history', history);
      Shell.notify('День пропущен');
    };
  }

  App.define('welcome', {
    init: function() {
      Shell.registerScreen('home', renderWelcome);
      Events.on('store:stats', function() { Shell.navigate('home'); });
      Events.on('store:history', function() { Shell.navigate('home'); });
    }
  });
})();
