// modules/welcome.js
(function() {
  'use strict';

  function getMotivation(streak) {
    if (streak === 0) return { text: 'Начни свой путь сегодня!', icon: 'ph-rocket-launch' };
    if (streak < 3) return { text: 'Хорошее начало! Продолжай', icon: 'ph-flame' };
    if (streak < 7) return { text: 'Отличная серия! Ты на пути', icon: 'ph-target' };
    if (streak < 14) return { text: 'Неделя силы! Ты машина', icon: 'ph-rocket-launch' };
    if (streak < 30) return { text: 'Дисциплина — суперсила', icon: 'ph-lightning' };
    if (streak < 60) return { text: 'Месяц! Ты легенда', icon: 'ph-crown' };
    return { text: 'Ты непобедим', icon: 'ph-trophy' };
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

  function renderAvatar(avatar) {
    var esc = Store.esc;
    if (avatar && typeof avatar === 'string' && avatar.indexOf('data:image') === 0) {
      return '<img src="' + esc(avatar) + '" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid var(--accent-gold)">';
    }
    if (avatar && typeof avatar === 'string' && /^ph-[a-z0-9-]+$/.test(avatar)) {
      return '<i class="ph ' + esc(avatar) + '" style="font-size:2.4em;color:var(--accent-gold)"></i>';
    }
    return '<i class="ph ph-user-circle" style="font-size:2.4em;color:var(--accent-gold)"></i>';
  }

  function renderStatus(rec, exCount) {
    if (!rec) return '';
    if (rec.skipped) {
      return '<div class="w-fade w-delay-4" style="background:rgba(248,113,113,0.1);padding:12px 16px;border-radius:12px;margin-top:12px;border-left:3px solid var(--accent-error);font-size:0.9em;display:flex;align-items:center;gap:10px">' +
        '<i class="ph ph-x-circle" style="font-size:1.3em;color:var(--accent-error)"></i>' +
        '<div><strong style="color:var(--accent-error)">День пропущен</strong>' +
        '<div style="font-size:0.85em;opacity:0.7;margin-top:2px">Можно передумать и начать тренировку</div></div></div>';
    }
    if (rec.xpDayAwarded) {
      var done = Array.isArray(rec.exercises) ? rec.exercises.length : 0;
      var total = exCount > 0 ? exCount : done;
      return '<div class="w-fade w-delay-4" style="background:rgba(74,222,128,0.1);padding:12px 16px;border-radius:12px;margin-top:12px;border-left:3px solid var(--accent-success);font-size:0.9em;display:flex;align-items:center;gap:10px">' +
        '<i class="ph ph-check-circle" style="font-size:1.3em;color:var(--accent-success)"></i>' +
        '<div><strong style="color:var(--accent-success)">Тренировка проведена</strong>' +
        '<div style="font-size:0.85em;opacity:0.7;margin-top:2px">' + done + '/' + total + ' упражнений</div></div></div>';
    }
    var hasProg = false;
    if (Array.isArray(rec.details)) {
      for (var i = 0; i < rec.details.length; i++) {
        var det = rec.details[i];
        if (det && Array.isArray(det.sets)) {
          for (var s = 0; s < det.sets.length; s++) if (det.sets[s]) { hasProg = true; break; }
        }
        if (hasProg) break;
      }
    }
    if (hasProg) {
      return '<div class="w-fade w-delay-4" style="background:rgba(251,191,36,0.1);padding:12px 16px;border-radius:12px;margin-top:12px;border-left:3px solid var(--accent-warning);font-size:0.9em;display:flex;align-items:center;gap:10px">' +
        '<i class="ph ph-hourglass" style="font-size:1.3em;color:var(--accent-warning)"></i>' +
        '<div><strong style="color:var(--accent-warning)">Тренировка в процессе</strong>' +
        '<div style="font-size:0.85em;opacity:0.7;margin-top:2px">Продолжи, чтобы закрыть день</div></div></div>';
    }
    return '';
  }
  function renderWelcome(container) {
    var esc = Store.esc;
    var userName = Store.get('user_name', '');
    var greeting = userName ? 'Приветствую, ' + esc(userName) + '!' : 'Приветствую!';
    var stats = MathCore.getStats();
    var lvl = stats.level || 1;
    var xpNeeded = MathCore.xpForLevel(lvl);
    var xpPct = xpNeeded > 0 ? Math.min(100, Math.round((stats.xp / xpNeeded) * 100)) : 0;
    var totalXp = MathCore.totalXp(stats);
    var todayIdx = MathCore.getTodayIndex();
    var dayName = MathCore.getDayName(todayIdx);
    var todayStr = MathCore.todayStr();
    var todayPlan = (Store.get('plan', []))[todayIdx] || null;
    var exCount = (todayPlan && Array.isArray(todayPlan.exercises)) ? todayPlan.exercises.length : 0;
    var history = Store.get('history', []);
    var todayRec = getTodayRecord(history, todayStr);
    var dayClosed = todayRec && todayRec.xpDayAwarded;
    var daySkipped = todayRec && todayRec.skipped;
    var mot = getMotivation(stats.streak);
    var hints = !(Store.get('settings', {})).disableHints;

    var yesBtn = dayClosed
      ? '<button class="start-circle" disabled style="opacity:0.6;cursor:not-allowed"><i class="ph ph-check-circle"></i><span>Готово</span><small>закрыт</small></button>'
      : daySkipped
        ? '<button class="start-circle" id="btnStartWorkout" style="border-color:var(--accent-warning)"><i class="ph ph-arrow-counterclockwise"></i><span>Вернуться</span><small>передумал?</small></button>'
        : exCount > 0
          ? '<button class="start-circle" id="btnStartWorkout"><i class="ph ph-play-circle"></i><span>Начать</span><small>' + exCount + ' упр.</small></button>'
          : '<button class="start-circle" id="btnGoPlan"><i class="ph ph-calendar-plus"></i><span>План</span></button>';

    var disAttr = dayClosed ? 'disabled style="opacity:0.4;cursor:not-allowed"' : '';

    container.innerHTML =
      '<div style="padding:4px;max-width:500px;margin:0 auto">' +
        '<div class="w-fade w-glow" style="background:var(--bg-card);border-radius:16px;padding:16px 20px;margin-bottom:16px;border:1px solid var(--border-gold)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<i class="ph ' + MathCore.getLevelIcon(lvl) + ' w-icon w-pulse" style="font-size:1.8em"></i>' +
              '<div style="font-size:1.8em;font-weight:bold;color:var(--accent-gold);line-height:1" class="w-anim-level">' + lvl + '</div>' +
              '<div style="font-size:0.75em;opacity:0.7">уровень</div>' +
            '</div>' +
            '<div style="text-align:right"><div style="font-size:0.75em;opacity:0.7">XP</div>' +
              '<div style="font-size:1em;font-weight:bold"><span class="w-anim-xp">' + (stats.xp || 0) + '</span><span style="font-size:0.7em;opacity:0.6">/' + xpNeeded + '</span></div>' +
            '</div>' +
          '</div>' +
          '<div style="height:6px;background:rgba(0,0,0,0.3);border-radius:3px;overflow:hidden;border:1px solid var(--border-subtle)">' +
            '<div class="w-xp-bar" style="height:100%;width:' + xpPct + '%;background:linear-gradient(90deg,var(--accent-gold),var(--accent-gold-light));border-radius:3px"></div>' +
          '</div>' +
        '</div>' +
        '<div class="w-fade w-delay-1" style="background:var(--bg-card);border-radius:16px;padding:16px 20px;border:1px solid var(--border-subtle);margin-bottom:16px">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            renderAvatar(Store.get('user_avatar', null)) +
            '<div style="flex:1;min-width:0"><div style="font-size:1.1em;font-weight:600;color:var(--accent-gold);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + greeting + '</div>' +
              '<div style="font-size:0.85em;opacity:0.7;margin-top:2px">Сегодня <strong>' + esc(dayName) + '</strong></div></div>' +
            '<div style="font-size:0.8em;color:var(--accent-gold);text-align:right;flex-shrink:0"><i class="ph ph-list-checks"></i> ' + (exCount > 0 ? exCount + ' упр.' : 'нет плана') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="w-fade w-delay-2" style="display:flex;flex-direction:column;align-items:center;gap:16px;margin-bottom:16px">' +
          yesBtn +
          '<div class="small-buttons" style="display:flex;gap:8px;width:100%;max-width:320px">' +
            '<button class="btn w-btn btn-secondary" id="wLaterBtn" ' + disAttr + '><i class="ph ph-clock"></i> Позже</button>' +
            '<button class="btn w-btn w-skip" id="wSkipBtn" ' + disAttr + '><i class="ph ph-x"></i> Пропустить</button>' +
          '</div>' +
        '</div>' +
        renderStatus(todayRec, exCount) +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(100px, 1fr));gap:8px;margin:16px 0">' +
          '<div class="w-card w-fade w-delay-2" style="background:var(--bg-card);border-radius:12px;padding:12px 8px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-flame w-pulse w-icon" style="font-size:1.5em"></i><div style="font-size:1.3em;font-weight:bold;color:var(--accent-gold);margin-top:4px"><span class="w-anim-streak">' + (stats.streak || 0) + '</span></div><div style="font-size:0.7em;opacity:0.7">стрик</div></div>' +
          '<div class="w-card w-fade w-delay-3" style="background:var(--bg-card);border-radius:12px;padding:12px 8px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-barbell w-icon" style="font-size:1.5em"></i><div style="font-size:1.3em;font-weight:bold;color:var(--accent-gold);margin-top:4px"><span class="w-anim-workouts">' + (stats.yes || 0) + '</span></div><div style="font-size:0.7em;opacity:0.7">тренировок</div></div>' +
          '<div class="w-card w-fade w-delay-4" style="background:var(--bg-card);border-radius:12px;padding:12px 8px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-lightning w-icon" style="font-size:1.5em"></i><div style="font-size:1.3em;font-weight:bold;color:var(--accent-gold);margin-top:4px"><span class="w-anim-totalxp">' + totalXp + '</span></div><div style="font-size:0.7em;opacity:0.7">всего XP</div></div>' +
        '</div>' +
        '<div class="w-fade w-delay-4" style="background:var(--bg-card);border-radius:12px;padding:12px 16px;margin-bottom:16px;border-left:3px solid var(--accent-gold);font-size:0.9em;display:flex;align-items:center;gap:10px">' +
          '<i class="ph ' + mot.icon + ' w-icon" style="font-size:1.3em"></i>' +
          '<div style="color:var(--accent-gold);font-weight:600">' + esc(mot.text) + '</div>' +
        '</div>' +
        (hints ? '<details class="w-fade w-delay-4" style="background:var(--bg-card);border-radius:12px;padding:12px 16px;font-size:0.8em;opacity:0.85;cursor:pointer;border:1px solid var(--border-subtle)">' +
          '<summary style="font-weight:600;color:var(--accent-gold);margin-bottom:8px;display:flex;align-items:center;gap:8px"><i class="ph ph-info"></i> Как получать XP</summary>' +
          '<div style="margin-top:8px;line-height:1.6"><div><i class="ph ph-check" style="color:var(--accent-success)"></i> Подход: <strong>+5 XP</strong></div><div><i class="ph ph-warning-circle" style="color:var(--accent-warning)"></i> Частично: <strong>+3 XP</strong></div><div><i class="ph ph-flag-checkered" style="color:var(--accent-success)"></i> Упражнение: <strong>+15 XP</strong></div><div><i class="ph ph-trophy" style="color:var(--accent-success)"></i> День: <strong>+20 XP</strong></div><div><i class="ph ph-chart-bar" style="color:var(--accent-success)"></i> Опрос: <strong>+10 XP</strong></div></div>' +
        '</details>' : '') +
      '</div>';

    setTimeout(function() {
      animateValue(document.querySelector('.w-anim-level'), 0, lvl, 800);
      animateValue(document.querySelector('.w-anim-xp'), 0, stats.xp || 0, 1000);
      animateValue(document.querySelector('.w-anim-streak'), 0, stats.streak || 0, 800);
      animateValue(document.querySelector('.w-anim-workouts'), 0, stats.yes || 0, 1000);
      animateValue(document.querySelector('.w-anim-totalxp'), 0, totalXp, 1200);
    }, 300);

    var btnPlan = document.getElementById('btnGoPlan');
    if (btnPlan) btnPlan.onclick = function() { if (App.getModule('plan')) Shell.navigate('plan'); else Shell.notify('Модуль «План» ещё не подключён', true); };

    var btnStart = document.getElementById('btnStartWorkout');
    if (btnStart && !dayClosed) btnStart.onclick = function() {
      if (daySkipped) { if (!confirm('Отменить пропуск и начать тренировку?')) return; todayRec.skipped = false; Store.set('history', history); }
      var wf = App.getModule('workout-flow'), w = App.getModule('workout');
      if (wf && wf.start) wf.start(); else if (w && w.openWorkoutModal) w.openWorkoutModal(); else Shell.notify('Модуль «Тренировка» ещё не подключён', true);
    };

    document.getElementById('wLaterBtn').onclick = function() {
      if (stats.lastLaterDate === todayStr) { Shell.notify('Уже напоминали сегодня'); return; }
      stats.later = (stats.later || 0) + 1; stats.lastLaterDate = todayStr; Store.set('stats', stats); Shell.notify('Напомню через 3 часа ⏰');
    };
    document.getElementById('wSkipBtn').onclick = function() {
      if (daySkipped) { Shell.notify('День уже отмечен как пропущенный'); return; }
      stats.no = (stats.no || 0) + 1; Store.set('stats', stats);
      if (!todayRec) history.push({ date: todayStr, dayName: dayName, exercises: [], details: [], skipped: true });
      else todayRec.skipped = true;
      Store.set('history', history); Shell.notify('День пропущен');
    };
  }

  App.define('welcome', {
    init: function() {
      Shell.registerScreen('home', renderWelcome);
      Events.on('store:stats', function() { Shell.navigate('home'); });
      Events.on('store:history', function() { Shell.navigate('home'); });
      Events.on('store:user_name', function() { Shell.navigate('home'); });
      Events.on('store:user_avatar', function() { Shell.navigate('home'); });
    }
  });
})();
