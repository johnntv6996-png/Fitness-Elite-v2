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
      circleHtml = '<button id="wStartBtn" disabled style="width:136px;height:136px;border-radius:50%;border:2px solid var(--success);background:var(--bg-card);color:var(--success);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;opacity:0.75">' +
        '<i class="ph ph-check-circle" style="font-size:2.2em"></i><span style="font-weight:700;font-size:0.85em">ГОТОВО</span><small style="font-size:0.7em">день закрыт</small></button>';
    } else if (daySkipped) {
      circleHtml = '<button id="wStartBtn" style="width:136px;height:136px;border-radius:50%;border:2px solid #fbbf24;background:var(--bg-card);color:#fbbf24;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer">' +
        '<i class="ph ph-arrow-counterclockwise" style="font-size:2.2em"></i><span style="font-weight:700;font-size:0.85em">ВЕРНУТЬСЯ</span><small style="font-size:0.7em">передумал?</small></button>';
    } else if (exCount > 0) {
      circleHtml = '<button id="wStartBtn" style="width:136px;height:136px;border-radius:50%;border:none;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;box-shadow:0 10px 30px rgba(34,197,94,0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer">' +
        '<i class="ph ph-play-circle" style="font-size:2.2em"></i><span style="font-weight:700;font-size:0.85em">НАЧАТЬ</span><small style="font-size:0.7em">' + exCount + ' упр.</small></button>';
    } else {
      circleHtml = '<button id="wPlanBtn" style="width:136px;height:136px;border-radius:50%;border:2px solid var(--border-accent);background:var(--bg-card);color:var(--accent);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer">' +
        '<i class="ph ph-calendar-plus" style="font-size:2.2em"></i><span style="font-weight:700;font-size:0.85em">ПЛАН</span><small style="font-size:0.7em">настроить</small></button>';
    }

    var statusHtml = '';
    if (daySkipped) {
      statusHtml = '<div class="fe-card" style="border-left:3px solid var(--error);background:rgba(248,113,113,0.08);font-size:0.9em">' +
        '<strong style="color:var(--error)">День пропущен</strong><div style="opacity:0.75;font-size:0.85em;margin-top:2px">Нажми «Вернуться», если готов тренироваться</div></div>';
    } else if (dayClosed) {
      statusHtml = '<div class="fe-card" style="border-left:3px solid var(--success);background:rgba(74,222,128,0.08);font-size:0.9em">' +
        '<strong style="color:var(--success)">Тренировка проведена</strong><div style="opacity:0.75;font-size:0.85em;margin-top:2px">Отличная работа сегодня!</div></div>';
    }

    container.innerHTML =
      '<div style="max-width:480px;margin:0 auto">' +
        '<div class="fe-card" style="border-color:var(--border-accent)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            '<div style="display:flex;align-items:center;gap:8px">' +
              '<i class="ph ph-star" style="font-size:1.6em;color:var(--accent)"></i>' +
              '<span style="font-size:1.6em;font-weight:800;color:var(--accent)">' + stats.level + '</span>' +
              '<span style="font-size:0.8em;opacity:0.7">уровень</span>' +
            '</div>' +
            '<div style="font-size:0.9em"><strong>' + stats.xp + '</strong><span style="opacity:0.6"> / ' + xpNeeded + ' XP</span></div>' +
          '</div>' +
          '<div style="height:6px;background:rgba(0,0,0,0.4);border-radius:4px;overflow:hidden">' +
            '<div style="height:100%;width:' + xpPct + '%;background:var(--accent);transition:width 0.4s"></div>' +
          '</div>' +
        '</div>' +

        '<div class="fe-card" style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
          '<div><div style="font-weight:700;color:var(--accent);font-size:1.05em">' + greeting + '</div>' +
          '<div style="font-size:0.85em;opacity:0.75;margin-top:2px">Сегодня <strong>' + esc(dayName) + '</strong></div></div>' +
          '<div style="font-size:0.82em;color:var(--accent)"><i class="ph ph-list-checks"></i> ' + (exCount > 0 ? exCount + ' упр.' : 'нет плана') + '</div>' +
        '</div>' +

        '<div style="display:flex;flex-direction:column;align-items:center;gap:14px;margin:20px 0">' +
          circleHtml +
          '<div style="display:flex;gap:8px;width:100%;max-width:300px">' +
            '<button class="fe-btn fe-btn-sec" id="wLaterBtn" style="flex:1" ' + (dayClosed ? 'disabled' : '') + '><i class="ph ph-clock"></i> Позже</button>' +
            '<button class="fe-btn fe-btn-sec" id="wSkipBtn" style="flex:1" ' + (dayClosed ? 'disabled' : '') + '><i class="ph ph-x"></i> Пропуск</button>' +
          '</div>' +
        '</div>' +

        statusHtml +

        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">' +
          '<div class="fe-card" style="text-align:center;margin:0;padding:12px 6px"><i class="ph ph-flame" style="font-size:1.4em;color:var(--accent)"></i><div style="font-size:1.3em;font-weight:800;color:var(--accent);margin-top:4px">' + stats.streak + '</div><div style="font-size:0.72em;opacity:0.7">стрик</div></div>' +
          '<div class="fe-card" style="text-align:center;margin:0;padding:12px 6px"><i class="ph ph-barbell" style="font-size:1.4em;color:var(--accent)"></i><div style="font-size:1.3em;font-weight:800;color:var(--accent);margin-top:4px">' + (stats.yes || 0) + '</div><div style="font-size:0.72em;opacity:0.7">тренировок</div></div>' +
          '<div class="fe-card" style="text-align:center;margin:0;padding:12px 6px"><i class="ph ph-lightning" style="font-size:1.4em;color:var(--accent)"></i><div style="font-size:1.3em;font-weight:800;color:var(--accent);margin-top:4px">' + totalXp + '</div><div style="font-size:0.72em;opacity:0.7">всего XP</div></div>' +
        '</div>' +

        '<div class="fe-card" style="border-left:3px solid var(--accent);display:flex;align-items:center;gap:10px;font-size:0.9em">' +
          '<i class="ph ' + mot.icon + '" style="font-size:1.3em;color:var(--accent)"></i>' +
          '<strong style="color:var(--accent)">' + esc(mot.text) + '</strong>' +
        '</div>' +
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
