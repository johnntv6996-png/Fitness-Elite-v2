// modules/exercises.js
(function() {
  'use strict';

  var state = { filter: 'all', search: '' };

  function getDB() {
    return Store.get('db', []);
  }

  function saveDB(list) {
    Store.set('db', list || []);
  }

  function uid() {
    return 'ex_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function findById(id) {
    var list = getDB();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function renderExercises(container) {
    var esc = Store.esc;
    var db = getDB();
    var q = state.search.trim().toLowerCase();

    var filtered = db.filter(function(ex) {
      if (state.filter === 'fav' && !ex.favorite) return false;
      if (q && (ex.name || '').toLowerCase().indexOf(q) === -1 && (ex.group || '').toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    var cardsHtml = filtered.map(function(ex) {
      return '<div class="fe-card" data-open="' + esc(ex.id) + '" style="cursor:pointer;display:flex;justify-content:space-between;align-items:start;gap:10px">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;color:var(--accent);font-size:1.05em;margin-bottom:4px">' + esc(ex.name) + '</div>' +
          '<div style="font-size:0.8em;opacity:0.75;display:flex;gap:10px;flex-wrap:wrap">' +
            '<span><i class="ph ph-tag"></i> ' + esc(ex.group || 'Общее') + '</span>' +
            '<span><i class="ph ph-fire"></i> ' + (ex.difficulty || 3) + '/5</span>' +
            (ex.timer > 0 ? '<span><i class="ph ph-timer"></i> ' + ex.timer + 'с</span>' : '') +
            (ex.restTimer > 0 ? '<span><i class="ph ph-pause-circle"></i> ' + ex.restTimer + 'с</span>' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0">' +
          '<button class="fe-icon-btn" data-fav="' + esc(ex.id) + '" title="Избранное" style="width:34px;height:34px;color:' + (ex.favorite ? 'var(--accent)' : 'var(--text-secondary)') + '">' +
            '<i class="' + (ex.favorite ? 'ph-fill' : 'ph') + ' ph-star"></i>' +
          '</button>' +
          '<button class="fe-icon-btn" data-edit="' + esc(ex.id) + '" title="Изменить" style="width:34px;height:34px"><i class="ph ph-pencil-simple"></i></button>' +
          '<button class="fe-icon-btn" data-del="' + esc(ex.id) + '" title="Удалить" style="width:34px;height:34px;color:var(--error)"><i class="ph ph-trash"></i></button>' +
        '</div>' +
      '</div>';
    }).join('');

    container.innerHTML =
      '<div style="max-width:600px;margin:0 auto">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
          '<h2 style="color:var(--accent);font-size:1.4em;display:flex;align-items:center;gap:8px"><i class="ph ph-books"></i> Упражнения (' + db.length + ')</h2>' +
          '<button class="fe-btn" id="exAddBtn" style="padding:10px 14px;font-size:0.9em"><i class="ph ph-plus"></i> Добавить</button>' +
        '</div>' +
        '<div class="fe-card" style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<input id="exSearch" type="text" value="' + esc(state.search) + '" placeholder="Поиск по названию или группе..." style="flex:1;min-width:160px;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--bg-primary);color:#fff">' +
          '<button class="fe-btn ' + (state.filter === 'all' ? '' : 'fe-btn-sec') + '" id="exFilterAll" style="padding:10px 14px">Все</button>' +
          '<button class="fe-btn ' + (state.filter === 'fav' ? '' : 'fe-btn-sec') + '" id="exFilterFav" style="padding:10px 14px"><i class="ph-fill ph-star"></i></button>' +
        '</div>' +
        (cardsHtml || '<div class="fe-card" style="text-align:center;opacity:0.6;padding:30px">Список пуст. Добавь первое упражнение!</div>') +
      '</div>';

    document.getElementById('exAddBtn').onclick = function() { openForm(null); };
    document.getElementById('exFilterAll').onclick = function() { state.filter = 'all'; renderExercises(container); };
    document.getElementById('exFilterFav').onclick = function() { state.filter = 'fav'; renderExercises(container); };
    document.getElementById('exSearch').oninput = function() { state.search = this.value; renderExercises(container); };

    container.querySelectorAll('[data-fav]').forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-fav');
        var list = getDB();
        for (var i = 0; i < list.length; i++) if (list[i].id === id) list[i].favorite = !list[i].favorite;
        saveDB(list);
        renderExercises(container);
      };
    });

    container.querySelectorAll('[data-edit]').forEach(function(btn) {
      btn.onclick = function(e) { e.stopPropagation(); openForm(btn.getAttribute('data-edit')); };
    });

    container.querySelectorAll('[data-del]').forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        if (!confirm('Удалить упражнение?')) return;
        var id = btn.getAttribute('data-del');
        saveDB(getDB().filter(function(item) { return item.id !== id; }));
        renderExercises(container);
      };
    });

    container.querySelectorAll('[data-open]').forEach(function(card) {
      card.onclick = function() { openDetails(card.getAttribute('data-open')); };
    });
  }
  function openForm(editId) {
    var esc = Store.esc;
    var ex = editId ? findById(editId) : null;
    ex = ex || { name: '', group: '', difficulty: 3, timer: 0, restTimer: 60, inventory: '', description: '' };

    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML =
      '<div class="fe-card" style="width:100%;max-width:460px;max-height:90vh;overflow-y:auto;background:var(--bg-secondary);border-color:var(--border-accent)">' +
        '<h3 style="color:var(--accent);margin-bottom:14px">' + (editId ? 'Редактировать' : 'Новое упражнение') + '</h3>' +
        '<label style="font-size:0.85em;opacity:0.8">Название *</label>' +
        '<input id="fExName" type="text" value="' + esc(ex.name) + '" placeholder="Например: Подтягивания" style="width:100%;padding:10px;margin:4px 0 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);color:#fff">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
          '<div><label style="font-size:0.85em;opacity:0.8">Группа мышц</label>' +
          '<input id="fExGroup" type="text" value="' + esc(ex.group) + '" placeholder="Спина, Грудь..." style="width:100%;padding:10px;margin-top:4px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);color:#fff"></div>' +
          '<div><label style="font-size:0.85em;opacity:0.8">Сложность (1–5)</label>' +
          '<input id="fExDiff" type="number" min="1" max="5" value="' + (ex.difficulty || 3) + '" style="width:100%;padding:10px;margin-top:4px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);color:#fff"></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
          '<div><label style="font-size:0.85em;opacity:0.8">Таймер подхода (сек)</label>' +
          '<input id="fExTimer" type="number" min="0" value="' + (ex.timer || 0) + '" style="width:100%;padding:10px;margin-top:4px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);color:#fff"></div>' +
          '<div><label style="font-size:0.85em;opacity:0.8">Отдых (сек)</label>' +
          '<input id="fExRest" type="number" min="0" value="' + (ex.restTimer || 60) + '" style="width:100%;padding:10px;margin-top:4px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);color:#fff"></div>' +
        '</div>' +
        '<label style="font-size:0.85em;opacity:0.8">Инвентарь</label>' +
        '<input id="fExInv" type="text" value="' + esc(ex.inventory) + '" placeholder="Турник, гантели..." style="width:100%;padding:10px;margin:4px 0 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);color:#fff">' +
        '<label style="font-size:0.85em;opacity:0.8">Техника выполнения</label>' +
        '<textarea id="fExDesc" rows="3" style="width:100%;padding:10px;margin:4px 0 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);color:#fff;resize:vertical">' + esc(ex.description) + '</textarea>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end">' +
          '<button class="fe-btn fe-btn-sec" id="fExCancel">Отмена</button>' +
          '<button class="fe-btn" id="fExSave">Сохранить</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);
    document.getElementById('fExCancel').onclick = function() { modal.remove(); };
    document.getElementById('fExSave').onclick = function() {
      var name = document.getElementById('fExName').value.trim();
      if (!name) { Shell.notify('Введи название', true); return; }
      var item = {
        id: editId || uid(),
        name: name,
        group: document.getElementById('fExGroup').value.trim(),
        difficulty: Math.min(5, Math.max(1, parseInt(document.getElementById('fExDiff').value, 10) || 3)),
        timer: Math.max(0, parseInt(document.getElementById('fExTimer').value, 10) || 0),
        restTimer: Math.max(0, parseInt(document.getElementById('fExRest').value, 10) || 0),
        inventory: document.getElementById('fExInv').value.trim(),
        description: document.getElementById('fExDesc').value.trim(),
        favorite: ex.favorite || false
      };
      var list = getDB();
      if (editId) {
        for (var i = 0; i < list.length; i++) if (list[i].id === editId) list[i] = item;
      } else {
        list.push(item);
      }
      saveDB(list);
      modal.remove();
      Shell.navigate('exercises');
      Shell.notify('Упражнение сохранено');
    };
  }

  function openDetails(id) {
    var esc = Store.esc;
    var ex = findById(id);
    if (!ex) return;
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML =
      '<div class="fe-card" style="width:100%;max-width:440px;background:var(--bg-secondary);border-color:var(--border-accent)">' +
        '<h3 style="color:var(--accent);margin-bottom:8px">' + esc(ex.name) + '</h3>' +
        '<div style="font-size:0.85em;opacity:0.75;margin-bottom:12px">' + esc(ex.group || 'Общее') + ' · Сложность ' + (ex.difficulty || 3) + '/5</div>' +
        (ex.inventory ? '<p style="font-size:0.9em;margin-bottom:8px"><strong>Инвентарь:</strong> ' + esc(ex.inventory) + '</p>' : '') +
        (ex.description ? '<p style="font-size:0.9em;line-height:1.5;white-space:pre-wrap;opacity:0.9;margin-bottom:14px">' + esc(ex.description) + '</p>' : '') +
        '<button class="fe-btn" id="dExClose" style="width:100%">Закрыть</button>' +
      '</div>';
    document.body.appendChild(modal);
    document.getElementById('dExClose').onclick = function() { modal.remove(); };
  }

  App.define('exercises', {
    getDB: getDB,
    getById: findById,
    init: function() {
      Shell.addNav('exercises', 'Упражнения', 'ph-books');
      Shell.registerScreen('exercises', renderExercises);
    }
  });
})();
