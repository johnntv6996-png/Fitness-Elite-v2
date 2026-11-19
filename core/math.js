// core/helpers.js
(function() {
  'use strict';

  function formatLocalDate(d) {
    d = d || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function todayStr() {
    return formatLocalDate(new Date());
  }

  function addDays(dateStr, delta) {
    var p = dateStr.split('-');
    var d = new Date(parseInt(p, 10), parseInt(p, 10) - 1, parseInt(p, 10));
    d.setDate(d.getDate() + delta);
    return formatLocalDate(d);
  }

  function getTodayIndex() {
    return (new Date().getDay() + 6) % 7; // Пн = 0, Вс = 6
  }

  function getDayName(idx) {
    return ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'][idx] || '';
  }

  function xpForLevel(level) {
    return Math.floor(100 * Math.pow(1.2, Math.max(0, (level || 1) - 1)));
  }

  function totalXp(stats) {
    stats = stats || {};
    var lvl = stats.level || 1;
    var sum = stats.xp || 0;
    for (var i = 1; i < lvl; i++) sum += xpForLevel(i);
    return sum;
  }

  // Честный подсчёт стрика по календарным датам
  function calcStreak(history) {
    if (!Array.isArray(history) || history.length === 0) return 0;
    var activeDates = {};
    for (var i = 0; i < history.length; i++) {
      var r = history[i];
      if (r && !r.skipped && Array.isArray(r.exercises) && r.exercises.length > 0) {
        activeDates[r.date] = true;
      }
    }
    var today = todayStr();
    var yesterday = addDays(today, -1);
    var cursor = activeDates[today] ? today : (activeDates[yesterday] ? yesterday : null);
    if (!cursor) return 0;

    var streak = 0;
    while (activeDates[cursor]) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function getStats() {
    var def = { yes: 0, later: 0, no: 0, xp: 0, level: 1, streak: 0, lastLaterDate: null };
    var st = Store.get('stats', {});
    for (var k in def) if (st[k] === undefined) st[k] = def[k];
    st.streak = calcStreak(Store.get('history', []));
    return st;
  }

  function addXP(amount, reason) {
    if (!amount) return getStats();
    var st = getStats();
    st.xp = Math.max(0, (st.xp || 0) + amount);
    var leveledUp = false;
    var need = xpForLevel(st.level);
    while (st.xp >= need) {
      st.xp -= need;
      st.level++;
      leveledUp = true;
      need = xpForLevel(st.level);
    }
    Store.set('stats', st);

    var log = Store.get('xp_log', []);
    log.push({ ts: Date.now(), date: todayStr(), amount: amount, reason: reason || '' });
    if (log.length > 200) log = log.slice(-200);
    Store.set('xp_log', log);

    if (leveledUp && window.Shell) {
      Shell.notify('Новый уровень: ' + st.level + '!');
    }
    return st;
  }

  window.Helpers = {
    formatLocalDate: formatLocalDate,
    todayStr: todayStr,
    addDays: addDays,
    getTodayIndex: getTodayIndex,
    getDayName: getDayName,
    xpForLevel: xpForLevel,
    totalXp: totalXp,
    calcStreak: calcStreak,
    getStats: getStats,
    addXP: addXP
  };
})();
