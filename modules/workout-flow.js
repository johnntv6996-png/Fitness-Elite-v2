// modules/workout-flow.js
(function() {
  'use strict';

  var state = {
    step: 'overview', // overview | exercise | timer | summary
    exIdx: 0,
    setIdx: 0,
    timerMode: 'work', // work | rest
    timerTotal: 0,
    timerLeft: 0,
    timerRunning: false,
    timerId: null,
    sessionXp: 0,
    startedAt: 0
  };

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    state.timerRunning = false;
  }

  function getTodayExercises() {
    var todayIdx = MathCore.getTodayIndex();
    var plan = Store.get('plan', []);
    var dayObj = plan[todayIdx] || { exercises: [] };
    var list = Array.isArray(dayObj.exercises) ? dayObj.exercises : [];
    var db = Store.get('db', []);
    var dbMap = {};
    for (var i = 0; i < db.length; i++) dbMap[db[i].id] = db[i];

    return list.map(function(item) {
      var full = dbMap[item.exId] || {};
      return {
        exId: item.exId,
        name: full.name || item.name || 'Упражнение',
        sets: item.sets || 3,
        reps: item.reps || 10,
        timer: full.timer || (item.isTimer ? (item.reps || 30) : 0),
        restTimer: full.restTimer || 60,
        description: full.description || '',
        imageUrl: full.imageUrl || '',
        inventory: full.inventory || ''
      };
    });
  }

  function ensureTodayRecord(exercises) {
    var todayStr = MathCore.todayStr();
    var dayName = MathCore.getDayName(MathCore.getTodayIndex());
    var history = Store.get('history', []);
    var rec = null;
    for (var i = 0; i < history.length; i++) {
      if (history[i] && history[i].date === todayStr) { rec = history[i]; break; }
    }
    if (!rec) {
      rec = { date: todayStr, dayName: dayName, exercises: [], details: [], skipped: false, xpDayAwarded: false };
      history.push(rec);
    }
    if (!Array.isArray(rec.details)) rec.details = [];
    for (var j = 0; j < exercises.length; j++) {
      if (!rec.details[j]) {
        rec.details[j] = {
          exId: exercises[j].exId,
          name: exercises[j].name,
          sets: new Array(exercises[j].sets).fill(null),
          xpAwarded: false
        };
      }
    }
    Store.set('history', history);
    return { history: history, rec: rec };
  }

  function findFirstIncompleteSet(rec, exIdx) {
    var det = rec.details[exIdx];
    if (!det || !Array.isArray(det.sets)) return 0;
    for (var s = 0; s < det.sets.length; s++) {
      if (!det.sets[s]) return s;
    }
    return det.sets.length;
  }

  function isExerciseDone(rec, exIdx) {
    var det = rec.details[exIdx];
    if (!det || !Array.isArray(det.sets) || !det.sets.length) return false;
    for (var s = 0; s < det.sets.length; s++) {
      if (!det.sets[s]) return false;
    }
    return true;
  }

  function start() {
    var exercises = getTodayExercises();
    if (!exercises.length) {
      Shell.notify('На сегодня нет запланированных упражнений', true);
      if (App.getModule('plan')) Shell.navigate('plan');
      return;
    }
    stopTimer();
    var ctx = ensureTodayRecord(exercises);
    var firstEx = 0;
    for (var i = 0; i < exercises.length; i++) {
      if (!isExerciseDone(ctx.rec, i)) { firstEx = i; break; }
    }
    state.step = 'overview';
    state.exIdx = firstEx;
    state.setIdx = findFirstIncompleteSet(ctx.rec, firstEx);
    state.sessionXp = 0;
    state.startedAt = Date.now();
    renderModal();
  }
  function closeModal() {
    stopTimer();
    var m = document.getElementById('wfModal');
    if (m) m.remove();
  }

  function recordSet(status) {
    var exercises = getTodayExercises();
    var ctx = ensureTodayRecord(exercises);
    var ex = exercises[state.exIdx];
    var det = ctx.rec.details[state.exIdx];
    if (!ex || !det) return;

    det.sets[state.setIdx] = status; // 'done' | 'partial' | 'missed'
    var xpGain = status === 'done' ? 5 : (status === 'partial' ? 3 : 0);
    if (xpGain > 0) {
      MathCore.addXP(xpGain, 'Подход: ' + ex.name);
      state.sessionXp += xpGain;
    }

    if (isExerciseDone(ctx.rec, state.exIdx) && !det.xpAwarded) {
      det.xpAwarded = true;
      if (ctx.rec.exercises.indexOf(ex.exId) === -1) ctx.rec.exercises.push(ex.exId);
      MathCore.addXP(15, 'Упражнение: ' + ex.name);
      state.sessionXp += 15;
    }

    Store.set('history', ctx.history);

    var nextSet = findFirstIncompleteSet(ctx.rec, state.exIdx);
    if (nextSet < ex.sets) {
      state.setIdx = nextSet;
      if (ex.restTimer > 0 && status !== 'missed') {
        startTimer('rest', ex.restTimer);
        return;
      }
      state.step = 'exercise';
      renderModal();
      return;
    }

    var nextEx = -1;
    for (var i = 0; i < exercises.length; i++) {
      if (!isExerciseDone(ctx.rec, i)) { nextEx = i; break; }
    }
    if (nextEx !== -1) {
      state.exIdx = nextEx;
      state.setIdx = findFirstIncompleteSet(ctx.rec, nextEx);
      state.step = 'overview';
      renderModal();
    } else {
      finishDay(ctx);
    }
  }

  function finishDay(ctx) {
    stopTimer();
    if (!ctx.rec.xpDayAwarded) {
      ctx.rec.xpDayAwarded = true;
      ctx.rec.skipped = false;
      Store.set('history', ctx.history);

      var st = MathCore.getStats();
      st.yes = (st.yes || 0) + 1;
      st.lastWorkoutDate = MathCore.todayStr();
      Store.set('stats', st);

      MathCore.addXP(20, 'Тренировка дня завершена');
      state.sessionXp += 20;
    }
    state.step = 'summary';
    renderModal();
  }

  function startTimer(mode, seconds) {
    stopTimer();
    state.step = 'timer';
    state.timerMode = mode;
    state.timerTotal = Math.max(1, seconds);
    state.timerLeft = state.timerTotal;
    state.timerRunning = true;
    renderModal();

    state.timerId = setInterval(function() {
      state.timerLeft--;
      if (state.timerLeft <= 0) {
        stopTimer();
        if (state.timerMode === 'work') {
          recordSet('done');
        } else {
          state.step = 'exercise';
          renderModal();
        }
        return;
      }
      updateTimerDom();
    }, 1000);
  }

  function updateTimerDom() {
    var valEl = document.getElementById('wfTimerVal');
    var ringEl = document.getElementById('wfTimerCircle');
    if (valEl) valEl.textContent = state.timerLeft;
    if (ringEl) {
      var r = 84, c = 2 * Math.PI * r;
      ringEl.style.strokeDashoffset = c * (1 - state.timerLeft / state.timerTotal);
    }
  }

  function renderModal() {
    var esc = Store.esc;
    var modal = document.getElementById('wfModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'workout-modal';
      modal.id = 'wfModal';
      document.body.appendChild(modal);
    }

    var exercises = getTodayExercises();
    var ctx = ensureTodayRecord(exercises);
    var bodyHtml = '';

    if (state.step === 'overview') {
      var listHtml = exercises.map(function(ex, idx) {
        var done = isExerciseDone(ctx.rec, idx);
        var det = ctx.rec.details[idx];
        var doneSets = det ? det.sets.filter(Boolean).length : 0;
        return '<div class="wf-ex-card' + (done ? ' done' : '') + '" data-pick="' + idx + '">' +
          '<div class="wf-ex-row">' +
            '<div class="idx">' + (done ? '<i class="ph-bold ph-check"></i>' : (idx + 1)) + '</div>' +
            '<div class="info"><div class="name">' + esc(ex.name) + '</div>' +
              '<div class="meta">' + doneSets + '/' + ex.sets + ' подх. · ' + (ex.timer > 0 ? ex.timer + ' сек' : ex.reps + ' повт.') + '</div></div>' +
            '<i class="ph ph-caret-right" style="opacity:0.5"></i>' +
          '</div></div>';
      }).join('');

      bodyHtml =
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 12px 0">Тренировка дня</h2>' +
        listHtml +
        '<div style="display:flex;gap:8px;margin-top:14px">' +
          '<button class="wf-btn wf-btn-secondary" id="wfCloseBtn">Закрыть</button>' +
          '<button class="wf-btn wf-btn-primary" id="wfGoExBtn"><i class="ph ph-play"></i> К упражнению</button>' +
        '</div>';
    } else if (state.step === 'exercise') {
      var ex = exercises[state.exIdx];
      var det = ctx.rec.details[state.exIdx];
      var dotsHtml = det.sets.map(function(st, sIdx) {
        var cls = st || (sIdx === state.setIdx ? 'active' : '');
        var inner = st === 'done' ? '<i class="ph-bold ph-check"></i>' : (st === 'partial' ? '~' : (st === 'missed' ? '×' : (sIdx + 1)));
        return '<div class="wf-set-dot ' + cls + '">' + inner + '</div>';
      }).join('');

      bodyHtml =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<span style="font-size:0.8em;opacity:0.7">Упражнение ' + (state.exIdx + 1) + ' из ' + exercises.length + '</span>' +
          '<button class="btn btn-secondary" id="wfBackList" style="padding:4px 10px;font-size:0.8em">Список</button>' +
        '</div>' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 10px 0">' + esc(ex.name) + '</h2>' +
        (ex.imageUrl ? '<div class="wf-media"><img src="' + esc(ex.imageUrl) + '" alt=""></div>' : '') +
        (ex.description ? '<div style="font-size:0.88em;opacity:0.85;margin-bottom:10px;line-height:1.5">' + esc(ex.description) + '</div>' : '') +
        '<div class="wf-meta-line">' +
          '<span><i class="ph ph-repeat"></i> Подход ' + (state.setIdx + 1) + ' / ' + ex.sets + '</span>' +
          '<span><i class="ph ph-target"></i> ' + (ex.timer > 0 ? ex.timer + ' сек' : ex.reps + ' повт.') + '</span>' +
          (ex.inventory ? '<span><i class="ph ph-barbell"></i> ' + esc(ex.inventory) + '</span>' : '') +
        '</div>' +
        '<div class="wf-set-dots">' + dotsHtml + '</div>' +
        (ex.timer > 0 ? '<button class="wf-btn wf-btn-primary" id="wfStartWorkTimer" style="margin-bottom:8px"><i class="ph ph-timer"></i> Запустить таймер (' + ex.timer + ' сек)</button>' : '') +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
          '<button class="wf-btn wf-btn-success" id="wfSetDone"><i class="ph ph-check"></i> Выполнил (+5 XP)</button>' +
          '<button class="wf-btn wf-btn-warning" id="wfSetPart"><i class="ph ph-warning-circle"></i> Частично (+3 XP)</button>' +
        '</div>' +
        '<button class="wf-btn wf-btn-danger" id="wfSetMiss" style="margin-top:8px"><i class="ph ph-x"></i> Пропустить подход</button>';
    } else if (state.step === 'timer') {
      var isRest = state.timerMode === 'rest';
      var r = 84, c = 2 * Math.PI * r;
      var offset = c * (1 - state.timerLeft / state.timerTotal);
      bodyHtml =
        '<h3 style="text-align:center;color:var(--accent-gold);margin-bottom:8px">' + (isRest ? 'Отдых между подходами' : 'Выполнение подхода') + '</h3>' +
        '<div class="wf-big-timer">' +
          '<div class="wf-timer-ring' + (isRest ? ' rest' : '') + '">' +
            '<svg viewBox="0 0 200 200"><circle class="wf-timer-bg" cx="100" cy="100" r="' + r + '"></circle>' +
            '<circle id="wfTimerCircle" class="wf-timer-fill" cx="100" cy="100" r="' + r + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + offset + '"></circle></svg>' +
            '<div class="wf-timer-text"><div id="wfTimerVal" class="val' + (isRest ? ' rest' : '') + '">' + state.timerLeft + '</div><div class="lbl">сек</div></div>' +
          '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">' +
          '<button class="wf-btn wf-btn-secondary" id="wfTimerPlus">+15 сек</button>' +
          '<button class="wf-btn wf-btn-primary" id="wfTimerSkip">Готово</button>' +
        '</div>';
    } else if (state.step === 'summary') {
      var mins = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));
      bodyHtml =
        '<div class="wf-summary-hero">' +
          '<div class="trophy"><i class="ph-fill ph-trophy"></i></div>' +
          '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin:0">Тренировка завершена!</h2>' +
        '</div>' +
        '<div class="wf-summary-stats">' +
          '<div class="wf-summary-stat"><div class="v">+' + state.sessionXp + '</div><div class="l">Получено XP</div></div>' +
          '<div class="wf-summary-stat"><div class="v">' + mins + ' мин</div><div class="l">Время</div></div>' +
        '</div>' +
        '<button class="wf-btn wf-btn-primary" id="wfFinishClose">На главную</button>';
    }

    modal.innerHTML = '<div class="workout-modal-content">' + bodyHtml + '</div>';

    modal.querySelectorAll('[data-pick]').forEach(function(card) {
      card.onclick = function() {
        var idx = parseInt(card.getAttribute('data-pick'), 10);
        state.exIdx = idx;
        state.setIdx = Math.min(exercises[idx].sets - 1, findFirstIncompleteSet(ctx.rec, idx));
        state.step = 'exercise';
        renderModal();
      };
    });

    var bClose = document.getElementById('wfCloseBtn'); if (bClose) bClose.onclick = closeModal;
    var bGo = document.getElementById('wfGoExBtn'); if (bGo) bGo.onclick = function() { state.step = 'exercise'; renderModal(); };
    var bList = document.getElementById('wfBackList'); if (bList) bList.onclick = function() { state.step = 'overview'; renderModal(); };
    var bWork = document.getElementById('wfStartWorkTimer'); if (bWork) bWork.onclick = function() { startTimer('work', exercises[state.exIdx].timer); };
    var bDone = document.getElementById('wfSetDone'); if (bDone) bDone.onclick = function() { recordSet('done'); };
    var bPart = document.getElementById('wfSetPart'); if (bPart) bPart.onclick = function() { recordSet('partial'); };
    var bMiss = document.getElementById('wfSetMiss'); if (bMiss) bMiss.onclick = function() { recordSet('missed'); };
    var bPlus = document.getElementById('wfTimerPlus'); if (bPlus) bPlus.onclick = function() { state.timerLeft += 15; state.timerTotal += 15; updateTimerDom(); };
    var bSkip = document.getElementById('wfTimerSkip'); if (bSkip) bSkip.onclick = function() {
      var m = state.timerMode;
      stopTimer();
      if (m === 'work') recordSet('done');
      else { state.step = 'exercise'; renderModal(); }
    };
    var bFin = document.getElementById('wfFinishClose'); if (bFin) bFin.onclick = closeModal;
  }

  App.define('workout-flow', {
    start: start,
    init: function() {}
  });
})();
