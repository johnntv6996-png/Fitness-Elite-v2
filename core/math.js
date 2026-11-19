// core/math.js
(function() {
  'use strict';

  function formatLocalDate(d) {
    d = d || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function todayStr() { return formatLocalDate(new Date()); }

  function addDays(dateStr, delta) {
    var p = dateStr.split('-');
    var d = new Date(parseInt(p.shift(), 10), parseInt(p.shift(), 10) - 1, parseInt(p.shift(), 10));
    d.setDate(d.getDate() + delta);
    return formatLocalDate(d);
  }

  function getTodayIndex() { return (new Date().getDay() + 6) % 7; }

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

  function calcStreak(history) {
    if (!Array.isArray(history) || history.length === 0) return 0;
    var activeDates = {};
    for (var i = 0; i < history.length; i++) {
      var r = history[i];
      if (r && !r.skipped && Array.isArray(r.exercises) && r.exercises.length > 0) activeDates[r.date] = true;
    }
    var today = todayStr();
    var yesterday = addDays(today, -1);
    var cursor = activeDates[today] ? today : (activeDates[yesterday] ? yesterday : null);
    if (!cursor) return 0;
    var streak = 0;
    while (activeDates[cursor]) { streak++; cursor = addDays(cursor, -1); }
    return streak;
  }

  function getStats() {
    var def = { yes: 0, later: 0, no: 0, xp: 0, level: 1, streak: 0, lastLaterDate: null, lastWorkoutDate: null };
    var st = Store.get('stats', {});
    for (var k in def) if (st[k] === undefined) st[k] = def[k];
    st.streak = calcStreak(Store.get('history', []));
    return st;
  }

  function addXP(amount, reason, meta) {
    if (!amount) return getStats();
    var st = getStats();
    st.xp = Math.max(0, (st.xp || 0) + amount);
    var leveledUp = false;
    var need = xpForLevel(st.level);
    while (st.xp >= need) { st.xp -= need; st.level++; leveledUp = true; need = xpForLevel(st.level); }
    Store.set('stats', st);

    var log = Store.get('xp_log', []);
    log.push({ timestamp: Date.now(), date: todayStr(), amount: amount, reason: reason || '', meta: meta || null });
    if (log.length > 200) log = log.slice(-200);
    Store.set('xp_log', log);

    if (leveledUp && window.Shell && Shell.showAchievementToast) {
      Shell.showAchievementToast('Новый уровень ' + st.level + '!', 'Ты достиг уровня ' + st.level, 'ph-star');
    }
    return st;
  }

  function renderStars(count) {
    var s = '';
    for (var i = 1; i <= 5; i++) {
      s += i <= count
        ? '<i class="ph-fill ph-star" style="color:var(--accent-gold)"></i>'
        : '<i class="ph ph-star" style="color:var(--text-secondary);opacity:0.3"></i>';
    }
    return s;
  }

  function getLevelIcon(level) {
    if (level >= 50) return 'ph-diamond';
    if (level >= 20) return 'ph-crown';
    if (level >= 10) return 'ph-trophy';
    if (level >= 5) return 'ph-star-four';
    return 'ph-star';
  }

  window.MathCore = {
    formatLocalDate: formatLocalDate, todayStr: todayStr, addDays: addDays,
    getTodayIndex: getTodayIndex, getDayName: getDayName,
    xpForLevel: xpForLevel, totalXp: totalXp, calcStreak: calcStreak,
    getStats: getStats, addXP: addXP, renderStars: renderStars, getLevelIcon: getLevelIcon
  };
})();
