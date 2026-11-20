// modules/achievements.js
(function() {
  'use strict';

  var LIST = [
    { id: 'w_1', name: 'Первый шаг', desc: 'Завершить 1 тренировку', icon: 'ph-sneaker-move', check: function(s) { return (s.yes || 0) >= 1; } },
    { id: 'w_5', name: 'Втянулся', desc: 'Завершить 5 тренировок', icon: 'ph-barbell', check: function(s) { return (s.yes || 0) >= 5; } },
    { id: 'w_15', name: 'Атлет', desc: 'Завершить 15 тренировок', icon: 'ph-medal', check: function(s) { return (s.yes || 0) >= 15; } },
    { id: 'w_30', name: 'Железная воля', desc: 'Завершить 30 тренировок', icon: 'ph-trophy', check: function(s) { return (s.yes || 0) >= 30; } },
    { id: 'w_50', name: 'Ветеран зала', desc: 'Завершить 50 тренировок', icon: 'ph-crown', check: function(s) { return (s.yes || 0) >= 50; } },
    { id: 's_3', name: 'Искра', desc: 'Стрик 3 дня подряд', icon: 'ph-flame', check: function(s) { return (s.streak || 0) >= 3; } },
    { id: 's_7', name: 'Неделя огня', desc: 'Стрик 7 дней подряд', icon: 'ph-fire', check: function(s) { return (s.streak || 0) >= 7; } },
    { id: 's_14', name: 'Две недели силы', desc: 'Стрик 14 дней подряд', icon: 'ph-lightning', check: function(s) { return (s.streak || 0) >= 14; } },
    { id: 's_30', name: 'Непобедимый', desc: 'Стрик 30 дней подряд', icon: 'ph-meteor', check: function(s) { return (s.streak || 0) >= 30; } },
    { id: 'l_5', name: 'Новичок+', desc: 'Достичь 5 уровня', icon: 'ph-star', check: function(s) { return (s.level || 1) >= 5; } },
    { id: 'l_10', name: 'Мастер', desc: 'Достичь 10 уровня', icon: 'ph-star-four', check: function(s) { return (s.level || 1) >= 10; } },
    { id: 'db_5', name: 'Архитектор', desc: 'Добавить 5 упражнений в базу', icon: 'ph-books', check: function(s, db) { return db.length >= 5; } }
  ];

  function checkAll(silent) {
    var unlocked = Store.get('achievements', {});
    var stats = MathCore.getStats();
    var db = Store.get('db', []);
    var changed = false;

    for (var i = 0; i < LIST.length; i++) {
      var item = LIST[i];
      if (unlocked[item.id]) continue;
      if (item.check(stats, db)) {
        unlocked[item.id] = { date: MathCore.todayStr(), ts: Date.now() };
        changed = true;
        if (!silent && window.Shell && Shell.showAchievementToast) {
          Shell.showAchievementToast(item.name, item.desc, item.icon);
        }
      }
    }
    if (changed) Store.set('achievements', unlocked);
  }

  function renderAchievements(container) {
    checkAll(true);
    var esc = Store.esc;
    var unlocked = Store.get('achievements', {});
    var doneCount = 0;

    var cardsHtml = LIST.map(function(item) {
      var info = unlocked[item.id];
      if (info) doneCount++;
      return '<div class="ach-card' + (info ? ' unlocked' : '') + '">' +
        '<div class="ach-badge"><i class="' + (info ? 'ph-fill ' : 'ph ') + esc(item.icon) + '"></i></div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;color:' + (info ? 'var(--accent-gold)' : 'var(--text-primary)') + ';font-size:0.95em">' + esc(item.name) + '</div>' +
          '<div style="font-size:0.8em;opacity:0.75;margin-top:2px">' + esc(item.desc) + '</div>' +
          (info ? '<div style="font-size:0.72em;color:var(--accent-success);margin-top:4px"><i class="ph ph-check-circle"></i> Получено ' + esc(info.date) + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    var pct = Math.round((doneCount / LIST.length) * 100);

    container.innerHTML =
      '<div style="padding:4px;max-width:700px;margin:0 auto">' +
        '<h2 style="font-family:var(--font-display);font-size:1.8em;margin-bottom:16px;color:var(--accent-gold);display:flex;align-items:center;gap:12px">' +
          '<i class="ph ph-trophy"></i> Достижения' +
        '</h2>' +
        '<div style="background:var(--bg-card);border:1px solid var(--border-gold);border-radius:14px;padding:16px;margin-bottom:16px">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.9em">' +
            '<span>Открыто наград: <strong>' + doneCount + ' из ' + LIST.length + '</strong></span>' +
            '<span style="color:var(--accent-gold);font-weight:700">' + pct + '%</span>' +
          '</div>' +
          '<div style="height:8px;background:var(--bg-primary);border-radius:4px;overflow:hidden">' +
            '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--accent-gold),var(--accent-gold-light));border-radius:4px"></div>' +
          '</div>' +
        '</div>' +
        '<div class="ach-grid">' + cardsHtml + '</div>' +
      '</div>';
  }

  App.define('achievements', {
    check: checkAll,
    init: function() {
      Shell.addNav('achievements', 'Достижения', 'ph-trophy');
      Shell.registerScreen('achievements', renderAchievements);
      Events.on('store:stats', function() { checkAll(false); });
      Events.on('store:db', function() { checkAll(false); });
      checkAll(true);
    }
  });
})();
