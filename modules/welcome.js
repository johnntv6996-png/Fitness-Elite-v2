// modules/welcome.js
(function() {
  'use strict';

  function getMotivationalMessage(streak) {
    if (streak === 0) return { text: 'Начни свой путь сегодня!', icon: 'ph-rocket-launch' };
    if (streak < 3) return { text: 'Хорошее начало! Продолжай', icon: 'ph-flame' };
    if (streak < 7) return { text: 'Отличная серия! Ты на пути', icon: 'ph-target' };
    if (streak < 14) return { text: 'Неделя силы! Ты машина', icon: 'ph-rocket-launch' };
    if (streak < 30) return { text: 'Дисциплина — суперсила', icon: 'ph-lightning' };
    if (streak < 60) return { text: 'Месяц! Ты легенда', icon: 'ph-crown' };
    return { text: 'Ты непобедим', icon: 'ph-trophy' };
  }

  function animateValue(element, start, end, duration) {
    if (!element || duration <= 0 || start === end) { if (element) element.textContent = end; return; }
    var startTime = null;
    var range = end - start;
    var step = function(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.floor(start + range * eased);
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
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
    var xpPercent = xpNeeded > 0 ? Math.min(100, Math.round((stats.xp / xpNeeded) * 100)) : 0;
    var totalXp = Helpers.totalXp(stats);

    var todayIdx = Helpers.getTodayIndex();
    var dayName = Helpers.getDayName(todayIdx);
    var todayStr = Helpers.todayStr();
    var plan = Store.get('plan', []);
    var todayPlan = plan[todayIdx] || null;
    var exCount = (todayPlan && Array.isArray(todayPlan.exercises)) ? todayPlan.exercises.length : 0;

    var history = Store.get('history', []);
    var todayRecord = getTodayRecord(history, todayStr);
    var dayClosed = todayRecord && todayRecord.xpDayAwarded;
    var daySkipped = todayRecord && todayRecord.skipped;
    var motivation = getMotivationalMessage(stats.streak);

    var yesButton;
    if (dayClosed) {
      yesButton = '<button class="start-circle" disabled style="opacity:0.6;cursor:not-allowed"><i class="ph ph-check-circle"></i><span>Готово</span><small>закрыт</small></button>';
    } else if (daySkipped) {
      yesButton = '<button class="start-circle" id="btnStartWorkout" style="border-color:var(--accent-warning)"><i class="ph ph-arrow-counterclockwise"></i><span>Вернуться</span><small>передумал?</small></button>';
    } else if (exCount > 0) {
      yesButton = '<button class="start-circle" id="btnStartWorkout"><i class="ph ph-play-circle"></i><span>Начать</span><small>' + exCount + ' упр.</small></button>';
    } else {
      yesButton = '<button class="start-circle" id="btnGoPlan"><i class="ph ph-calendar-plus"></i><span>План</span></button>';
    }

    var skipBtnDisabled = dayClosed ? 'disabled style="opacity:0.4;cursor:not-allowed"' : '';

    var statusHtml = '';
    if (daySkipped) {
      statusHtml = '<div class="w-fade w-delay-4" style="background:rgba(248,113,113,0.1);padding:12px 16px;border-radius:12px;margin-top:12px;border-left:3px solid var(--accent-error);font-size:0.9em;display:flex;align-items:center;gap:10px">' +
        '<i class="ph ph-x-circle" style="font-size:1.3em;color:var(--accent-error)"></i>' +
        '<div><strong style="color:var(--accent-error)">День пропущен</strong>' +
        '<div style="font-size:0.85em;opacity:0.7;margin-top:2px">Можно передумать и начать тренировку</div></div></div>';
    } else if (dayClosed) {
      statusHtml = '<div class="w-fade w-delay-4" style="background:rgba(74,222,128,0.1);padding:12px 16px;border-radius:12px;margin-top:12px;border-left:3px solid var(--accent-success);font-size:0.9em;display:flex;align-items:center;gap:10px">' +
        '<i class="ph ph-check-circle" style="font-size:1.3em;color:var(--accent-success)"></i>' +
        '<div><strong style="color:var(--accent-success)">Тренировка проведена</strong>' +
        '<div style="font-size:0.85em;opacity:0.7;margin-top:2px">Отличная работа!</div></div></div>';
    }

    var css = '<style>' +
      '@keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }' +
      '@keyframes fillBar { from { width:0%; } }' +
      '@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.1); } }' +
      '@keyframes glow { 0%,100% { box-shadow:0 0 10px rgba(212,175,55,0.2); } 50% { box-shadow:0 0 25px rgba(212,175,55,0.4); } }' +
      '.w-fade { animation:fadeInUp 0.5s ease-out both; }' +
      '.w-delay-1 { animation-delay:0.1s; } .w-delay-2 { animation-delay:0.2s; }' +
      '.w-delay-3 { animation-delay:0.3s; } .w-delay-4 { animation-delay:0.4s; }' +
      '.w-pulse { animation:pulse 2s ease-in-out infinite; display:inline-block; }' +
      '.w-glow { animation:glow 2s ease-in-out infinite; }' +
      '.w-xp-bar { animation:fillBar 1.2s ease-out both; }' +
      '.w-card { transition:transform 0.2s, box-shadow 0.2s; }' +
      '.w-card:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(0,0,0,0.3); }' +
      '.w-btn { transition:all 0.2s; cursor:pointer; flex:1; min-width:0; }' +
      '.w-btn:hover:not(:disabled) { transform:translateY(-2px); filter:brightness(1.1); }' +
      '.w-icon { color:var(--accent-gold); }' +
    '</style>';
    container.innerHTML = css +
      '<div style="padding:4px;max-width:500px;margin:0 auto">' +
      '<div class="w-fade w-glow" style="background:var(--bg-card);border-radius:16px;padding:16px 20px;margin-bottom:16px;border:1px solid var(--border-gold)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<i class="ph ph-star w-icon w-pulse" style="font-size:1.8em"></i>' +
            '<div style="font-size:1.8em;font-weight:bold;color:var(--accent-gold);line-height:1" class="w-anim-level">' + stats.level + '</div>' +
            '<div style="font-size:0.75em;opacity:0.7">уровень</div>' +
          '</div>' +
          '<div style="text-align:right"><div style="font-size:0.75em;opacity:0.7">XP</div><div style="font-size:1em;font-weight:bold"><span class="w-anim-xp">' + stats.xp + '</span><span style="font-size:0.7em;opacity:0.6">/' + xpNeeded + '</span></div></div>' +
        '</div>' +
        '<div style="height:6px;background:rgba(0,0,0,0.3);border-radius:3px;overflow:hidden;border:1px solid var(--border-subtle)"><div class="w-xp-bar" style="height:100%;width:' + xpPercent + '%;background:linear-gradient(90deg,var(--accent-gold),var(--accent-gold-light));border-radius:3px"></div></div>' +
      '</div>' +
      '<div class="w-fade w-delay-1" style="background:var(--bg-card);border-radius:16px;padding:16px 20px;border:1px solid var(--border-subtle);margin-bottom:16px">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<i class="ph ph-user-circle" style="font-size:2.4em;color:var(--accent-gold)"></i>' +
          '<div style="flex:1;min-width:0"><div style="font-size:1.1em;font-weight:600;color:var(--accent-gold);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + greeting + '</div><div style="font-size:0.85em;opacity:0.7;margin-top:2px">Сегодня <strong>' + esc(dayName) + '</strong></div></div>' +
          '<div style="font-size:0.8em;color:var(--accent-gold);text-align:right;flex-shrink:0"><i class="ph ph-list-checks"></i> ' + (exCount > 0 ? exCount + ' упр.' : 'нет плана') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="w-fade w-delay-2" style="display:flex;flex-direction:column;align-items:center;gap:16px;margin-bottom:16px">' +
        yesButton +
        '<div class="small-buttons" style="display:flex;gap:8px;width:100%;max-width:320px">' +
          '<button class="btn w-btn btn-secondary" id="wLaterBtn" ' + skipBtnDisabled + '><i class="ph ph-clock"></i> Позже</button>' +
          '<button class="btn w-btn w-skip" id="wSkipBtn" ' + skipBtnDisabled + '><i class="ph ph-x"></i> Пропустить</button>' +
        '</div>' +
      '</div>' +
      statusHtml +
      '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin:16px 0">' +
        '<div class="w-card w-fade w-delay-2" style="background:var(--bg-card);border-radius:12px;padding:12px 8px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-flame w-pulse w-icon" style="font-size:1.5em"></i><div style="font-size:1.3em;font-weight:bold;color:var(--accent-gold);line-height:1.2;margin-top:4px"><span class="w-anim-streak">' + stats.streak + '</span></div><div style="font-size:0.7em;opacity:0.7">стрик</div></div>' +
        '<div class="w-card w-fade w-delay-3" style="background:var(--bg-card);border-radius:12px;padding:12px 8px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-barbell w-icon" style="font-size:1.5em"></i><div style="font-size:1.3em;font-weight:bold;color:var(--accent-gold);line-height:1.2;margin-top:4px"><span class="w-anim-workouts">' + (stats.yes || 0) + '</span></div><div style="font-size:0.7em;opacity:0.7">тренировок</div></div>' +
        '<div class="w-card w-fade w-delay-4" style="background:var(--bg-card);border-radius:12px;padding:12px 8px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-lightning w-icon" style="font-size:1.5em"></i><div style="font-size:1.3em;font-weight:bold;color:var(--accent-gold);line-height:1.2;margin-top:4px"><span class="w-anim-totalxp">' + totalXp + '</span></div><div style="font-size:0.7em;opacity:0.7">всего XP</div></div>' +
      '</div>' +
      '<div class="w-fade w-delay-4" style="background:var(--bg-card);border-radius:12px;padding:12px 16px;margin-bottom:16px;border-left:3px solid var(--accent-gold);font-size:0.9em;display:flex;align-items:center;gap:10px">' +
        '<i class="ph ' + motivation.icon + ' w-icon" style="font-size:1.3em"></i>' +
        '<div style="color:var(--accent-gold);font-weight:600">' + esc(motivation.text) + '</div>' +
      '</div>' +
      '<details class="w-fade w-delay-4" style="background:var(--bg-card);border-radius:12px;padding:12px 16px;font-size:0.8em;opacity:0.85;cursor:pointer;border:1px solid var(--border-subtle)">' +
        '<summary style="font-weight:600;color:var(--accent-gold);margin-bottom:8px;display:flex;align-items:center;gap:8px"><i class="ph ph-info"></i> Как получать XP</summary>' +
        '<div style="margin-top:8px;line-height:1.6">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><i class="ph ph-check" style="color:var(--accent-success)"></i> Подход: <strong>+5 XP</strong></div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><i class="ph ph-warning-circle" style="color:var(--accent-warning)"></i> Частично: <strong>+3 XP</strong></div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><i class="ph ph-flag-checkered" style="color:var(--accent-success)"></i> Упражнение: <strong>+15 XP</strong></div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><i class="ph ph-trophy" style="color:var(--accent-success)"></i> День: <strong>+20 XP</strong></div>' +
          '<div style="display:flex;align-items:center;gap:8px"><i class="ph ph-chart-bar" style="color:var(--accent-success)"></i> Опрос: <strong>+10 XP</strong></div>' +
        '</div>' +
      '</details>' +
      '</div>';

    setTimeout(function() {
      animateValue(document.querySelector('.w-anim-level'), 0, stats.level, 800);
      animateValue(document.querySelector('.w-anim-xp'), 0, stats.xp, 1000);
      animateValue(document.querySelector('.w-anim-streak'), 0, stats.streak, 800);
      animateValue(document.querySelector('.w-anim-workouts'), 0, stats.yes || 0, 1000);
      animateValue(document.querySelector('.w-anim-totalxp'), 0, totalXp, 1200);
    }, 100);

    var btnPlan = document.getElementById('btnGoPlan');
    if (btnPlan) btnPlan.onclick = function() {
      if (App.getModule('plan')) Shell.navigate('plan');
      else Shell.notify('Модуль «План» ещё не подключён', true);
    };

    var btnStart = document.getElementById('btnStartWorkout');
    if (btnStart && !dayClosed) btnStart.onclick = function() {
      if (daySkipped) {
        if (!confirm('Отменить пропуск и начать тренировку?')) return;
        todayRecord.skipped = false;
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
      Shell.notify('Напомню через 3 часа ⏰');
    };

    document.getElementById('wSkipBtn').onclick = function() {
      if (daySkipped) { Shell.notify('День уже отмечен как пропущенный'); return; }
      stats.no = (stats.no || 0) + 1;
      Store.set('stats', stats);
      if (!todayRecord) history.push({ date: todayStr, dayName: dayName, exercises: [], details: [], skipped: true });
      else todayRecord.skipped = true;
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
