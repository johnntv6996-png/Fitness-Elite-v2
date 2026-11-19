// modules/plan.js
(function() {
  'use strict';

  var DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  var openDays = {};

  function getPlan() {
    var raw = Store.get('plan', []);
    var plan = [];
    for (var i = 0; i < 7; i++) {
      var item = (raw && raw[i]) ? raw[i] : {};
      plan.push({
        day: DAYS[i],
        exercises: Array.isArray(item.exercises) ? item.exercises : []
      });
    }
    return plan;
  }

  function savePlan(plan) {
    Store.set('plan', plan);
  }

  function getDBMap() {
    var db = Store.get('db', []);
    var map = {};
    for (var i = 0; i < db.length; i++) map[db[i].id] = db[i];
    return map;
  }

  function renderPlan(container) {
    var esc = Store.esc;
    var plan = getPlan();
    var dbMap = getDBMap();
    var todayIdx = MathCore.getTodayIndex();
    if (openDays[todayIdx] === undefined) openDays[todayIdx] = true;

    var daysHtml = '';
    for (var i = 0; i < 7; i++) {
      var isToday = (i === todayIdx);
      var isOpen = !!openDays[i];
      var list = plan[i].exercises;

      var exHtml = '';
      if (list.length === 0) {
        exHtml = '<div style="text-align:center;padding:16px;opacity:0.6;font-size:0.9em">День отдыха — упражнений нет</div>';
      } else {
        for (var j = 0; j < list.length; j++) {
          var item = list[j];
          var exInfo = dbMap[item.exId];
          var title = exInfo ? exInfo.name : (item.name || 'Удалённое упражнение');
          var isTimer = (exInfo && exInfo.timer > 0) || item.isTimer;
          var unit = isTimer ? 'сек' : 'повт.';
          exHtml +=
            '<div class="plan-ex">' +
              '<div style="flex:1;min-width:160px">' +
                '<div style="font-weight:600;color:var(--accent-gold);font-size:0.95em">' + esc(title) + '</div>' +
                '<div style="font-size:0.8em;opacity:0.75;margin-top:2px">' + (item.sets || 3) + ' подх. × ' + (item.reps || 10) + ' ' + unit + '</div>' +
              '</div>' +
              '<div style="display:flex;gap:4px;align-items:center">' +
                '<button class="btn btn-secondary" data-move="' + i + ':' + j + ':-1" style="padding:6px 8px;font-size:0.8em" ' + (j === 0 ? 'disabled' : '') + '><i class="ph ph-arrow-up"></i></button>' +
                '<button class="btn btn-secondary" data-move="' + i + ':' + j + ':1" style="padding:6px 8px;font-size:0.8em" ' + (j === list.length - 1 ? 'disabled' : '') + '><i class="ph ph-arrow-down"></i></button>' +
                '<button class="btn btn-secondary" data-edit="' + i + ':' + j + '" style="padding:6px 8px;font-size:0.8em"><i class="ph ph-pencil-simple"></i></button>' +
                '<button class="btn btn-danger" data-del="' + i + ':' + j + '" style="padding:6px 8px;font-size:0.8em"><i class="ph ph-trash"></i></button>' +
              '</div>' +
            '</div>';
        }
      }

      daysHtml +=
        '<div class="plan-day-card' + (isToday ? ' today' : '') + '">' +
          '<div class="plan-day-header' + (isOpen ? ' active' : '') + '" data-toggle="' + i + '">' +
            '<div style="font-weight:700;font-size:1.05em;display:flex;align-items:center">' +
              esc(DAYS[i]) +
              (isToday ? '<span class="today-dot" title="Сегодня"></span>' : '') +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px;font-size:0.85em;opacity:0.8">' +
              '<span>' + (list.length ? list.length + ' упр.' : 'Отдых') + '</span>' +
              '<i class="ph ' + (isOpen ? 'ph-caret-up' : 'ph-caret-down') + '"></i>' +
            '</div>' +
          '</div>' +
          '<div class="plan-day-body' + (isOpen ? ' active' : '') + '">' +
            exHtml +
            '<button class="btn btn-primary" data-add="' + i + '" style="width:100%;margin-top:8px;padding:10px;font-size:0.9em">' +
              '<i class="ph ph-plus-circle"></i> Добавить упражнение' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    container.innerHTML =
      '<div style="padding:4px;max-width:700px;margin:0 auto">' +
        '<h2 style="font-family:var(--font-display);font-size:1.8em;margin-bottom:16px;color:var(--accent-gold);display:flex;align-items:center;gap:12px">' +
          '<i class="ph ph-calendar-check"></i> План тренировок' +
        '</h2>' +
        daysHtml +
      '</div>';

    bindPlanEvents(container);
  }
  function bindPlanEvents(container) {
    container.querySelectorAll('[data-toggle]').forEach(function(el) {
      el.onclick = function() {
        var idx = parseInt(el.getAttribute('data-toggle'), 10);
        openDays[idx] = !openDays[idx];
        renderPlan(container);
      };
    });

    container.querySelectorAll('[data-add]').forEach(function(btn) {
      btn.onclick = function() {
        openPlanModal(parseInt(btn.getAttribute('data-add'), 10), null, container);
      };
    });

    container.querySelectorAll('[data-edit]').forEach(function(btn) {
      btn.onclick = function() {
        var p = btn.getAttribute('data-edit').split(':');
        openPlanModal(parseInt(p[0], 10), parseInt(p[1], 10), container);
      };
    });

    container.querySelectorAll('[data-del]').forEach(function(btn) {
      btn.onclick = function() {
        if (!confirm('Убрать упражнение из плана?')) return;
        var p = btn.getAttribute('data-del').split(':');
        var plan = getPlan();
        plan[parseInt(p[0], 10)].exercises.splice(parseInt(p[1], 10), 1);
        savePlan(plan);
        renderPlan(container);
      };
    });

    container.querySelectorAll('[data-move]').forEach(function(btn) {
      btn.onclick = function() {
        var p = btn.getAttribute('data-move').split(':');
        var dIdx = parseInt(p[0], 10), eIdx = parseInt(p[1], 10), dir = parseInt(p[2], 10);
        var plan = getPlan();
        var list = plan[dIdx].exercises;
        var target = eIdx + dir;
        if (target < 0 || target >= list.length) return;
        var tmp = list[eIdx];
        list[eIdx] = list[target];
        list[target] = tmp;
        savePlan(plan);
        renderPlan(container);
      };
    });
  }

  function openPlanModal(dayIdx, exIdx, container) {
    var esc = Store.esc;
    var db = Store.get('db', []);
    if (!db.length) {
      Shell.notify('Сначала добавь упражнения в «Базу упражнений»', true);
      return;
    }

    var plan = getPlan();
    var isEdit = (exIdx !== null && exIdx !== undefined);
    var current = isEdit ? plan[dayIdx].exercises[exIdx] : { exId: db[0].id, sets: 3, reps: db[0].timer > 0 ? db[0].timer : 10 };

    var optionsHtml = db.map(function(ex) {
      var sel = ex.id === current.exId ? 'selected' : '';
      return '<option value="' + esc(ex.id) + '" data-timer="' + (ex.timer || 0) + '" ' + sel + '>' + esc(ex.name) + '</option>';
    }).join('');

    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'planExModal';
    modal.innerHTML =
      '<div class="ex-modal-content" style="max-width:440px">' +
        '<button id="plClose" style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer"><i class="ph ph-x"></i></button>' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0">' + (isEdit ? 'Редактировать' : DAYS[dayIdx]) + '</h2>' +
        '<label style="display:block;margin:12px 0 6px;font-weight:600;font-size:0.9em">Упражнение:</label>' +
        '<select id="plExSelect" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em">' + optionsHtml + '</select>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0">' +
          '<div><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Подходы:</label>' +
            '<input type="number" id="plSets" min="1" max="20" value="' + (current.sets || 3) + '" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)"></div>' +
          '<div><label id="plRepsLabel" style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Повторения / сек:</label>' +
            '<input type="number" id="plReps" min="1" max="999" value="' + (current.reps || 10) + '" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)"></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">' +
          '<button class="btn btn-secondary" id="plCancel">Отмена</button>' +
          '<button class="btn btn-primary" id="plSave"><i class="ph ph-floppy-disk"></i> Сохранить</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    var selEl = document.getElementById('plExSelect');
    var repsEl = document.getElementById('plReps');
    var lblEl = document.getElementById('plRepsLabel');

    function syncUnit() {
      var opt = selEl.options[selEl.selectedIndex];
      var t = opt ? parseInt(opt.getAttribute('data-timer'), 10) : 0;
      lblEl.textContent = t > 0 ? 'Время (сек):' : 'Повторения:';
      if (!isEdit && t > 0) repsEl.value = t;
    }
    syncUnit();
    selEl.onchange = syncUnit;

    document.getElementById('plClose').onclick = function() { modal.remove(); };
    document.getElementById('plCancel').onclick = function() { modal.remove(); };
    document.getElementById('plSave').onclick = function() {
      var exId = selEl.value;
      var opt = selEl.options[selEl.selectedIndex];
      var t = opt ? parseInt(opt.getAttribute('data-timer'), 10) : 0;
      var entry = {
        exId: exId,
        name: opt ? opt.textContent : '',
        sets: Math.max(1, parseInt(document.getElementById('plSets').value, 10) || 3),
        reps: Math.max(1, parseInt(repsEl.value, 10) || 10),
        isTimer: t > 0
      };
      if (isEdit) plan[dayIdx].exercises[exIdx] = entry;
      else plan[dayIdx].exercises.push(entry);
      savePlan(plan);
      modal.remove();
      renderPlan(container);
      Shell.notify('План обновлён');
    };
  }

  App.define('plan', {
    getPlan: getPlan,
    init: function() {
      Shell.addNav('plan', 'План тренировок', 'ph-calendar-check');
      Shell.registerScreen('plan', renderPlan);
    }
  });
})();
