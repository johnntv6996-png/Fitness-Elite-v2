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

  function getTodayRecord(history, todayStr) {
    for (var i = 0; i < history.length; i++) {
      if (history[i] && history[i].date === todayStr) return history[i];
    }
    return null;
  }

  function renderWelcome(container) {
    var esc = Store.esc;
    var userName = Store.get('user_name', '');
    var greeting = userName ? 'Приветствую, ' + esc(userName) + '!' : 'Приветствую!';
    var stats = Helpers.getStats();
    var xpNeeded = Helpers.xpForLevel(stats.level);
    var xpPct = xpNeeded > 0 ? Math.min(100, Math.round((stats.xp / xpNeeded) * 100)) : 0;
    var totalXp = Helpers.totalXp(stats);

    var todayIdx = Helpers.getTodayIndex();
    var dayName = Helpers.getDayName(todayIdx);
    var todayStr = Helpers.todayStr();
    var plan = Store.get('plan', []);
    var todayPlan = plan[todayIdx] || null;
    var exCount = (todayPlan && Array.isArray(todayPlan.exercises)) ? todayPlan.exercises.length : 0;

    var history = Store.get('history', []);
    var todayRec = getTodayRecord(history, todayStr);
    var dayClosed = todayRec && todayRec.xpDayAwarded;
    var daySkipped = todayRec && todayRec.skipped;
    var mot = getMotivation(stats.streak);

    var circleHtml = '';
    if (dayClosed) {
      circleHtml = '<button id="wStartBtn" class="start-circle" disabled style="opacity:0.65"><i class="ph ph-check-circle"></i><span>Готово</span><small>день закрыт</small></button>';
    } else if (daySkipped) {
      circleHtml = '<button id="wStartBtn" class="start-circle" style="border-color:var(--accent-warning)"><i class="ph ph-arrow-counterclockwise"></i><span>Вернуться</span><small>передумал?</small></button>';
    } else if (exCount > 0) {
      circleHtml = '<button id="wStartBtn" class="start-circle"><i class="ph ph-play-circle"></i><span>Начать</span><small>' + exCount + ' упр.</small></button>';
    } else {
      circleHtml = '<button id="wPlanBtn" class="start-circle"><i class="ph ph-calendar-plus"></i><span>План</span><small>настроить</small></button>';
    }

    var statusHtml = '';
    if (daySkipped) {
      statusHtml = '<div class="card card-error-left"><strong style="color:var(--accent-error)">День пропущен</strong><div class="text-small">Нажми «Вернуться», если готов тренироваться</div></div>';
    } else if (dayClosed) {
      statusHtml = '<div class="card card-success-left"><strong style="color:var(--accent-success)">Тренировка проведена</strong><div class="text-small">Отличная работа сегодня!</div></div>';
    }

    container.innerHTML =
      '<div class="screen-wrap narrow">' +
        '<div class="card card-gold">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<i class="ph ph-star" style="font-size:1.8em;color:var(--accent-gold)"></i>' +
              '<span style="font-size:1.8em;font-weight:bold;color:var(--accent-gold)">' + stats.level + '</span>' +
              '<span class="text-small">уровень</span>' +
            '</div>' +
            '<div><strong>' + stats.xp + '</strong> <span class="text-small">/ ' + xpNeeded + ' XP</span></div>' +
          '</div>' +
          '<div class="xp-bar-track"><div class="xp-bar-fill" style="width:' + xpPct + '%"></div></div>' +
        '</div>' +

        '<div class="card" style="display:flex;justify-content:space-between;align-items:center">' +
          '<div><div style="font-size:1.1em;font-weight:600;color:var(--accent-gold)">' + greeting + '</div>' +
          '<div class="text-small">Сегодня <strong>' + esc(dayName) + '</strong></div></div>' +
          '<div style="font-size:0.85em;color:var(--accent-gold)"><i class="ph ph-list-checks"></i> ' + (exCount > 0 ? exCount + ' упр.' : 'нет плана') + '</div>' +
        '</div>' +

        '<div style="display:flex;flex-direction:column;align-items:center;gap:16px;margin:20px 0">' +
          circleHtml +
          '<div style="display:flex;gap:8px;width:100%;max-width:320px">' +
            '<button class="btn btn-secondary" id="wLaterBtn" style="flex:1" ' + (dayClosed ? 'disabled' : '') + '><i class="ph ph-clock"></i> Позже</button>' +
            '<button class="btn w-skip" id="wSkipBtn" style="flex:1" ' + (dayClosed ? 'disabled' : '') + '><i class="ph ph-x"></i> Пропустить</button>' +
          '</div>' +
        '</div>' +

        statusHtml +

        '<div class="stat-grid-3">' +
          '<div class="stat-mini"><i class="ph ph-flame"></i><div class="val">' + stats.streak + '</div><div class="lbl-s">стрик</div></div>' +
          '<div class="stat-mini"><i class="ph ph-barbell"></i><div class="val">' + (stats.yes || 0) + '</div><div class="lbl-s">тренировок</div></div>' +
          '<div class="stat-mini"><i class="ph ph-lightning"></i><div class="val">' + totalXp + '</div><div class="lbl-s">всего XP</div></div>' +
        '</div>' +

        '<div class="card card-accent-left" style="display:flex;align-items:center;gap:10px">' +
          '<i class="ph ' + mot.icon + '" style="font-size:1.3em;color:var(--accent-gold)"></i>' +
          '<strong style="color:var(--accent-gold)">' + esc(mot.text) + '</strong>' +
        '</div>' +
      '</div>';

    var planBtn = document.getElementById('wPlanBtn');
    if (planBtn) planBtn.onclick = function() {
      if (App.getModule('plan')) Shell.navigate('plan');
      else Shell.notify('Модуль «План» ещё не подключён', true);
    };

    var startBtn = document.getElementById('wStartBtn');
    if (startBtn && !dayClosed) startBtn.onclick = function() {
      if (daySkipped) {
        if (!confirm('Отменить пропуск и начать тренировку?')) return;
        todayRec.skipped = false;
        Store.set('history', history);
      }
      var workout = App.getModule('workout');
      if (workout && workout.open) workout.open();
      else Shell.notify('Модуль «Тренировка» ещё не подключён', true);
    };

    document.getElementById('wLaterBtn').onclick = function() {
      if (stats.lastLaterDate === todayStr) { Shell.notify('Уже напоминали сегодня'); return; }
      stats.later = (stats.later || 0) + 1;
      stats.lastLaterDate = todayStr;
      Store.set('stats', stats);
      Shell.notify('Напомним позже 💪');
    };

    document.getElementById('wSkipBtn').onclick = function() {
      if (daySkipped) { Shell.notify('День уже отмечен как пропущенный'); return; }
      stats.no = (stats.no || 0) + 1;
      Store.set('stats', stats);
      if (!todayRec) history.push({ date: todayStr, dayName: dayName, exercises: [], details: [], skipped: true });
      else todayRec.skipped = true;
      Store.set('history', history);
      Shell.notify('День отмечен как пропущенный');
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
