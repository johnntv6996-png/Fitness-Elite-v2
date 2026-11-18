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
      circleHtml = '<button id="wStartBtn" class="start-circle" disabled style="opacity:0.65;cursor:not-allowed">' +
        '<i class="ph ph-check-circle"></i><span>Готово</span><small>день закрыт</small></button>';
    } else if (daySkipped) {
      circleHtml = '<button id="wStartBtn" class="start-circle" style="border-color:var(--accent-warning)">' +
        '<i class="ph ph-arrow-counterclockwise"></i><span>Вернуться</span><small>передумал?</small></button>';
    } else if (exCount > 0) {
      circleHtml = '<button id="wStartBtn" class="start-circle">' +
        '<i class="ph ph-play-circle"></i><span>Начать</span><small>' + exCount + ' упр.</small></button>';
    } else {
      circleHtml = '<button id="wPlanBtn" class="start-circle">' +
        '<i class="ph ph-calendar-plus"></i><span>План</span><small>настроить</small></button>';
    }

    var statusHtml = '';
    if (daySkipped) {
      statusHtml = '<div class="fe-card w-fade" style="border-left:3px solid var(--accent-error);background:rgba(248,113,113,0.08);font-size:0.9em">' +
        '<strong style="color:var(--accent-error)">День пропущен</strong><div style="opacity:0.75;font-size:0.85em;margin-top:2px">Нажми «Вернуться», если готов тренироваться</div></div>';
    } else if (dayClosed) {
      statusHtml = '<div class="fe-card w-fade" style="border-left:3px solid var(--accent-success);background:rgba(74,222,128,0.08);font-size:0.9em">' +
        '<strong style="color:var(--accent-success)">Тренировка проведена</strong><div style="opacity:0.75;font-size:0.85em;margin-top:2px">Отличная работа сегодня!</div></div>';
    }

    container.innerHTML =
      '<div style="padding:4px;max-width:500px;margin:0 auto">' +
        '<div class="fe-card fe-card-gold w-fade w-glow">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<i class="ph ph-star w-pulse" style="font-size:1.8em;color:var(--accent-gold)"></i>' +
              '<span style="font-size:1.8em;font-weight:bold;color:var(--accent-gold);line-height:1">' + stats.level + '</span>' +
              '<span style="font-size:0.75em;opacity:0.7">уровень</span>' +
            '</div>' +
            '<div style="text-align:right"><div style="font-size:0.75em;opacity:0.7">XP</div><div style="font-size:1em;font-weight:bold">' + stats.xp + '<span style="font-size:0.7em;opacity:0.6">/' + xpNeeded + '</span></div></div>' +
          '</div>' +
          '<div style="height:6px;background:rgba(0,0,0,0.25);border-radius:3px;overflow:hidden;border:1px solid var(--border-subtle)">' +
            '<div class="w-xp-bar" style="height:100%;width:' + xpPct + '%;background:linear-gradient(90deg,var(--accent-gold),var(--accent-gold-light));border-radius:3px"></div>' +
          '</div>' +
        '</div>' +
        '<div class="fe-card w-fade w-delay-1" style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
          '<div><div style="font-size:1.1em;font-weight:600;color:var(--accent-gold)">' + greeting + '</div>' +
          '<div style="font-size:0.85em;opacity:0.7;margin-top:2px">Сегодня <strong>' + esc(dayName) + '</strong></div></div>' +
          '<div style="font-size:0.8em;color:var(--accent-gold)"><i class="ph ph-list-checks"></i> ' + (exCount > 0 ? exCount + ' упр.' : 'нет плана') + '</div>' +
        '</div>' +

        '<div class="w-fade w-delay-2" style="display:flex;flex-direction:column;align-items:center;gap:16px;margin:20px 0">' +
          circleHtml +
          '<div style="display:flex;gap:8px;width:100%;max-width:320px">' +
            '<button class="btn btn-secondary" id="wLaterBtn" style="flex:1" ' + (dayClosed ? 'disabled' : '') + '><i class="ph ph-clock"></i> Позже</button>' +
            '<button class="btn w-skip" id="wSkipBtn" style="flex:1" ' + (dayClosed ? 'disabled' : '') + '><i class="ph ph-x"></i> Пропустить</button>' +
          '</div>' +
        '</div>' +

        statusHtml +

        '<div class="fe-grid-3 w-fade w-delay-2" style="margin:16px 0">' +
          '<div class="fe-card fe-card-hover" style="text-align:center;margin:0;padding:12px 8px"><i class="ph ph-flame w-pulse" style="font-size:1.5em;color:var(--accent-gold)"></i><div style="font-size:1.3em;font-weight:bold;color:var(--accent-gold);margin-top:4px">' + stats.streak + '</div><div style="font-size:0.7em;opacity:0.7">стрик</div></div>' +
          '<div class="fe-card fe-card-hover" style="text-align:center;margin:0;padding:12px 8px"><i class="ph ph-barbell" style="font-size:1.5em;color:var(--accent-gold)"></i><div style="font-size:1.3em;font-weight:bold;color:var(--accent-gold);margin-top:4px">' + (stats.yes || 0) + '</div><div style="font-size:0.7em;opacity:0.7">тренировок</div></div>' +
          '<div class="fe-card fe-card-hover" style="text-align:center;margin:0;padding:12px 8px"><i class="ph ph-lightning" style="font-size:1.5em;color:var(--accent-gold)"></i><div style="font-size:1.3em;font-weight:bold;color:var(--accent-gold);margin-top:4px">' + totalXp + '</div><div style="font-size:0.7em;opacity:0.7">всего XP</div></div>' +
        '</div>' +

        '<div class="fe-card w-fade w-delay-3" style="border-left:3px solid var(--accent-gold);font-size:0.9em;display:flex;align-items:center;gap:10px">' +
          '<i class="ph ' + mot.icon + '" style="font-size:1.3em;color:var(--accent-gold)"></i>' +
          '<div style="color:var(--accent-gold);font-weight:600">' + esc(mot.text) + '</div>' +
        '</div>' +

        '<details class="fe-card w-fade w-delay-3" style="font-size:0.82em;cursor:pointer">' +
          '<summary style="font-weight:600;color:var(--accent-gold);display:flex;align-items:center;gap:8px"><i class="ph ph-info"></i> Как получать XP</summary>' +
          '<div style="margin-top:10px;line-height:1.7;opacity:0.85">' +
            '<div><i class="ph ph-check" style="color:var(--accent-success)"></i> Подход: <strong>+5 XP</strong></div>' +
            '<div><i class="ph ph-warning-circle" style="color:var(--accent-warning)"></i> Частично: <strong>+3 XP</strong></div>' +
            '<div><i class="ph ph-flag-checkered" style="color:var(--accent-success)"></i> Упражнение: <strong>+15 XP</strong></div>' +
            '<div><i class="ph ph-trophy" style="color:var(--accent-success)"></i> День: <strong>+20 XP</strong></div>' +
            '<div><i class="ph ph-chart-bar" style="color:var(--accent-success)"></i> Опрос: <strong>+10 XP</strong></div>' +
          '</div>' +
        '</details>' +
      '</div>';

    var planBtn = document.getElementById('wPlanBtn');
    if (planBtn) {
      planBtn.onclick = function() {
        if (App.getModule('plan')) Shell.navigate('plan');
        else Shell.notify('Модуль «План» ещё не подключён', true);
      };
    }

    var startBtn = document.getElementById('wStartBtn');
    if (startBtn && !dayClosed) {
      startBtn.onclick = function() {
        if (daySkipped) {
          if (!confirm('Отменить пропуск и начать тренировку?')) return;
          todayRec.skipped = false;
          Store.set('history', history);
        }
        var workout = App.getModule('workout');
        if (workout && workout.open) workout.open();
        else Shell.notify('Модуль «Тренировка» ещё не подключён', true);
      };
    }

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
      if (!todayRec) {
        history.push({ date: todayStr, dayName: dayName, exercises: [], details: [], skipped: true });
      } else {
        todayRec.skipped = true;
      }
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
