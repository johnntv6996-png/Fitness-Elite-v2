// modules/stats.js
(function() {
  'use strict';

  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var SHORT_DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  var state = { year: new Date().getFullYear(), month: new Date().getMonth() };

  function getHistoryMap() {
    var hist = Store.get('history', []);
    var map = {};
    for (var i = 0; i < hist.length; i++) {
      if (hist[i] && hist[i].date) map[hist[i].date] = hist[i];
    }
    return map;
  }

  function getDayStatus(rec) {
    if (!rec) return 'none';
    if (rec.skipped) return 'skipped';
    if (rec.xpDayAwarded) return 'done';
    if (Array.isArray(rec.exercises) && rec.exercises.length > 0) return 'partial';
    if (Array.isArray(rec.details)) {
      for (var i = 0; i < rec.details.length; i++) {
        var sets = rec.details[i] && rec.details[i].sets;
        if (Array.isArray(sets) && sets.some(Boolean)) return 'partial';
      }
    }
    return 'none';
  }

  function countCompletedSets(rec) {
    if (!rec || !Array.isArray(rec.details)) return 0;
    var total = 0;
    for (var i = 0; i < rec.details.length; i++) {
      var sets = rec.details[i] && rec.details[i].sets;
      if (!Array.isArray(sets)) continue;
      for (var s = 0; s < sets.length; s++) {
        if (sets[s] === 'done' || sets[s] === 'partial') total++;
      }
    }
    return total;
  }

  function renderWeeklyBars(histMap) {
    var today = MathCore.todayStr();
    var items = [];
    var maxSets = 1;

    for (var i = 6; i >= 0; i--) {
      var dStr = MathCore.addDays(today, -i);
      var parts = dStr.split('-');
      var dt = new Date(parseInt(parts.shift(), 10), parseInt(parts.shift(), 10) - 1, parseInt(parts.shift(), 10));
      var rec = histMap[dStr] || null;
      var sets = countCompletedSets(rec);
      if (sets > maxSets) maxSets = sets;
      items.push({ date: dStr, day: SHORT_DAYS[dt.getDay()], sets: sets, status: getDayStatus(rec) });
    }

    var cols = items.map(function(it) {
      var pct = it.sets > 0 ? Math.max(14, Math.round((it.sets / maxSets) * 100)) : 6;
      var bg = it.status === 'done'
        ? 'linear-gradient(180deg,var(--accent-success),#16a34a)'
        : (it.status === 'partial'
            ? 'linear-gradient(180deg,var(--accent-warning),#d97706)'
            : (it.status === 'skipped' ? 'var(--accent-error)' : 'rgba(255,255,255,0.08)'));
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">' +
        '<div style="font-size:0.72em;opacity:0.75;height:14px">' + (it.sets > 0 ? it.sets : '') + '</div>' +
        '<div style="width:100%;max-width:28px;height:84px;background:var(--bg-primary);border-radius:8px;display:flex;align-items:flex-end;overflow:hidden;border:1px solid var(--border-subtle)">' +
          '<div style="width:100%;height:' + pct + '%;background:' + bg + ';border-radius:6px;transition:height 0.4s"></div>' +
        '</div>' +
        '<div style="font-size:0.75em;font-weight:600;color:' + (it.date === today ? 'var(--accent-gold)' : 'var(--text-secondary)') + '">' + it.day + '</div>' +
      '</div>';
    }).join('');

    return '<div class="cal-card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<div style="font-weight:700;color:var(--accent-gold);font-size:0.95em"><i class="ph ph-chart-bar"></i> Подходы за 7 дней</div>' +
        '<span style="font-size:0.75em;opacity:0.65">объём работы</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:flex-end">' + cols + '</div>' +
    '</div>';
  }
  function renderCalendar(histMap) {
    var y = state.year, m = state.month;
    var firstDay = new Date(y, m, 1);
    var startOffset = (firstDay.getDay() + 6) % 7;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var todayStr = MathCore.todayStr();

    var cells = '';
    for (var e = 0; e < startOffset; e++) cells += '<div class="cal-day empty"></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var st = getDayStatus(histMap[dateStr]);
      var cls = 'cal-day' + (st !== 'none' ? ' ' + st : '') + (dateStr === todayStr ? ' today' : '');
      cells += '<div class="' + cls + '" data-date="' + dateStr + '">' + d + '</div>';
    }

    return '<div class="cal-card">' +
      '<div class="cal-head">' +
        '<button class="btn btn-secondary" id="stPrevMonth" style="padding:6px 12px"><i class="ph ph-caret-left"></i></button>' +
        '<div style="font-weight:700;color:var(--accent-gold)">' + MONTHS[m] + ' ' + y + '</div>' +
        '<button class="btn btn-secondary" id="stNextMonth" style="padding:6px 12px"><i class="ph ph-caret-right"></i></button>' +
      '</div>' +
      '<div class="cal-weekdays"><div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div></div>' +
      '<div class="cal-days">' + cells + '</div>' +
    '</div>';
  }

  function openDayModal(dateStr, rec) {
    var esc = Store.esc;
    var modal = document.createElement('div');
    modal.className = 'calendar-modal';
    var body = '<div style="opacity:0.65;padding:12px 0">Записей за этот день нет</div>';
    if (rec) {
      if (rec.skipped) {
        body = '<div style="color:var(--accent-error);font-weight:600;padding:8px 0"><i class="ph ph-x-circle"></i> День пропущен</div>';
      } else if (Array.isArray(rec.details) && rec.details.length > 0) {
        body = rec.details.map(function(det) {
          var sets = Array.isArray(det.sets) ? det.sets : [];
          var badges = sets.map(function(s, idx) {
            var color = s === 'done' ? 'var(--accent-success)' : (s === 'partial' ? 'var(--accent-warning)' : (s === 'missed' ? 'var(--accent-error)' : 'var(--text-muted)'));
            var icon = s === 'done' ? '✓' : (s === 'partial' ? '~' : (s === 'missed' ? '×' : (idx + 1)));
            return '<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;border:1px solid ' + color + ';color:' + color + ';font-size:0.78em;font-weight:700">' + icon + '</span>';
          }).join('');
          return '<div style="background:var(--bg-primary);padding:10px 12px;border-radius:10px;margin-bottom:8px">' +
            '<div style="font-weight:600;color:var(--accent-gold);margin-bottom:6px">' + esc(det.name || 'Упражнение') + '</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap">' + badges + '</div>' +
          '</div>';
        }).join('');
      }
    }
    modal.innerHTML =
      '<div class="calendar-content" style="max-width:440px">' +
        '<button id="stModalClose" style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer"><i class="ph ph-x"></i></button>' +
        '<h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 4px 0">' + esc(dateStr) + '</h3>' +
        '<div style="font-size:0.85em;opacity:0.7;margin-bottom:12px">' + esc(rec && rec.dayName ? rec.dayName : '') + '</div>' + body +
      '</div>';
    document.body.appendChild(modal);
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
    document.getElementById('stModalClose').onclick = function() { modal.remove(); };
  }

  function renderStats(container) {
    var esc = Store.esc;
    var stats = MathCore.getStats();
    var hist = Store.get('history', []);
    var histMap = getHistoryMap();
    var totalXp = MathCore.totalXp(stats);
    var totalDays = (stats.yes || 0) + (stats.no || 0);
    var regPct = totalDays > 0 ? Math.round(((stats.yes || 0) / totalDays) * 100) : 0;

    var recent = hist.slice().reverse().slice(0, 12);
    var listHtml = recent.length
      ? recent.map(function(rec) {
          var st = getDayStatus(rec);
          var label = st === 'done' ? 'Завершено' : (st === 'skipped' ? 'Пропущено' : 'В процессе');
          var setsDone = countCompletedSets(rec);
          return '<div class="hist-item ' + st + '" data-hdate="' + esc(rec.date) + '">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
              '<div><strong>' + esc(rec.date) + '</strong> <span style="opacity:0.65;font-size:0.85em">· ' + esc(rec.dayName || '') + '</span></div>' +
              '<span style="font-size:0.8em;font-weight:600">' + label + (st !== 'skipped' ? ' · ' + setsDone + ' подх.' : '') + '</span>' +
            '</div>' +
          '</div>';
        }).join('')
      : '<div style="text-align:center;padding:24px;opacity:0.6">История тренировок пока пуста</div>';

    container.innerHTML =
      '<div style="padding:4px;max-width:700px;margin:0 auto">' +
        '<h2 style="font-family:var(--font-display);font-size:1.8em;margin-bottom:16px;color:var(--accent-gold);display:flex;align-items:center;gap:12px">' +
          '<i class="ph ph-chart-line-up"></i> Статистика' +
        '</h2>' +
        '<div class="stats-grid">' +
          '<div class="stat-box"><div class="val">' + (stats.yes || 0) + '</div><div class="lbl">тренировок</div></div>' +
          '<div class="stat-box"><div class="val">' + (stats.streak || 0) + '</div><div class="lbl">стрик</div></div>' +
          '<div class="stat-box"><div class="val">' + regPct + '%</div><div class="lbl">регулярность</div></div>' +
          '<div class="stat-box"><div class="val">' + totalXp + '</div><div class="lbl">всего XP</div></div>' +
        '</div>' +
        renderWeeklyBars(histMap) +
        renderCalendar(histMap) +
        '<h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:18px 0 10px">История тренировок</h3>' +
        listHtml +
      '</div>';

    document.getElementById('stPrevMonth').onclick = function() {
      state.month--; if (state.month < 0) { state.month = 11; state.year--; } renderStats(container);
    };
    document.getElementById('stNextMonth').onclick = function() {
      state.month++; if (state.month > 11) { state.month = 0; state.year++; } renderStats(container);
    };
    container.querySelectorAll('[data-date]').forEach(function(el) {
      el.onclick = function() { var d = el.getAttribute('data-date'); openDayModal(d, histMap[d] || null); };
    });
    container.querySelectorAll('[data-hdate]').forEach(function(el) {
      el.onclick = function() { var d = el.getAttribute('data-hdate'); openDayModal(d, histMap[d] || null); };
    });
  }

  App.define('stats', {
    init: function() {
      Shell.addNav('stats', 'Статистика', 'ph-chart-line-up');
      Shell.registerScreen('stats', renderStats);
      Events.on('store:history', function() {
        if (document.querySelector('.cal-card')) {
          var main = document.getElementById('feMain');
          if (main) renderStats(main);
        }
      });
    }
  });
})();
