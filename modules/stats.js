/* === Статистика и календарь (Stats) === */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 16px; }
.stat-box { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 14px 10px; text-align: center; }
.stat-box .val { font-family: var(--font-display); font-size: 1.6em; font-weight: 800; color: var(--accent-gold); line-height: 1.1; }
.stat-box .lbl { font-size: 0.75em; opacity: 0.7; margin-top: 4px; }

.cal-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 16px; margin-bottom: 16px; }
.cal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; font-size: 0.72em; opacity: 0.6; margin-bottom: 6px; font-weight: 600; }
.cal-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-day { aspect-ratio: 1; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.85em; font-weight: 600; background: var(--bg-primary); border: 1px solid var(--border-subtle); cursor: pointer; transition: all 0.15s; }
.cal-day.empty { background: transparent; border: none; cursor: default; }
.cal-day.done { background: rgba(74, 222, 128, 0.18); border-color: var(--accent-success); color: var(--accent-success); }
.cal-day.partial { background: rgba(251, 191, 36, 0.18); border-color: var(--accent-warning); color: var(--accent-warning); }
.cal-day.skipped { background: rgba(248, 113, 113, 0.15); border-color: var(--accent-error); color: var(--accent-error); }
.cal-day.today { box-shadow: 0 0 0 2px var(--accent-gold); }

.hist-item { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; }
.hist-item:hover { border-color: var(--border-gold); transform: translateY(-1px); }
.hist-item.done { border-left: 3px solid var(--accent-success); }
.hist-item.skipped { border-left: 3px solid var(--accent-error); }
.hist-item.partial { border-left: 3px solid var(--accent-warning); }

  function openDayModal(dateStr, rec) {
    var esc = Store.esc;
    var modal = document.createElement('div');
    modal.className = 'calendar-modal';
    modal.id = 'stDayModal';

    var body = '<div style="opacity:0.65;padding:12px 0">Записей за этот день нет</div>';
    if (rec) {
      if (rec.skipped) {
        body = '<div style="color:var(--accent-error);font-weight:600;padding:8px 0"><i class="ph ph-x-circle"></i> День отмечен как пропущенный</div>';
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
        '<div style="font-size:0.85em;opacity:0.7;margin-bottom:12px">' + esc(rec && rec.dayName ? rec.dayName : '') + '</div>' +
        body +
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

    var recent = hist.slice().reverse().slice(0, 15);
    var listHtml = recent.length
      ? recent.map(function(rec) {
          var st = getDayStatus(rec);
          var statusText = st === 'done' ? 'Завершено' : (st === 'skipped' ? 'Пропущено' : 'В процессе');
          var exCount = Array.isArray(rec.exercises) ? rec.exercises.length : 0;
          return '<div class="hist-item ' + st + '" data-hdate="' + esc(rec.date) + '">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
              '<div><strong>' + esc(rec.date) + '</strong> <span style="opacity:0.65;font-size:0.85em">· ' + esc(rec.dayName || '') + '</span></div>' +
              '<span style="font-size:0.8em;font-weight:600">' + statusText + (st !== 'skipped' ? ' (' + exCount + ' упр.)' : '') + '</span>' +
            '</div>' +
          '</div>';
        }).join('')
      : '<div style="text-align:center;padding:24px;opacity:0.6">История тренировок пока пуста</div>';

    container.innerHTML =
      '<div style="padding:4px;max-width:700px;margin:0 auto">' +
        '<h2 style="font-family:var(--font-display);font-size:1.8em;margin-bottom:16px;color:var(--accent-gold);display:flex;align-items:center;gap:12px">' +
          '<i class="ph ph-chart-line-up"></i> Статистика и история' +
        '</h2>' +
        '<div class="stats-grid">' +
          '<div class="stat-box"><div class="val">' + (stats.yes || 0) + '</div><div class="lbl">тренировок</div></div>' +
          '<div class="stat-box"><div class="val">' + (stats.streak || 0) + '</div><div class="lbl">текущий стрик</div></div>' +
          '<div class="stat-box"><div class="val">' + regPct + '%</div><div class="lbl">регулярность</div></div>' +
          '<div class="stat-box"><div class="val">' + totalXp + '</div><div class="lbl">всего XP</div></div>' +
        '</div>' +
        renderCalendar(histMap) +
        '<h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:18px 0 10px">Последние записи</h3>' +
        listHtml +
      '</div>';

    document.getElementById('stPrevMonth').onclick = function() {
      state.month--;
      if (state.month < 0) { state.month = 11; state.year--; }
      renderStats(container);
    };
    document.getElementById('stNextMonth').onclick = function() {
      state.month++;
      if (state.month > 11) { state.month = 0; state.year++; }
      renderStats(container);
    };

    container.querySelectorAll('.cal-day[data-date]').forEach(function(cell) {
      cell.onclick = function() {
        var d = cell.getAttribute('data-date');
        openDayModal(d, histMap[d] || null);
      };
    });
    container.querySelectorAll('.hist-item[data-hdate]').forEach(function(row) {
      row.onclick = function() {
        var d = row.getAttribute('data-hdate');
        openDayModal(d, histMap[d] || null);
      };
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
