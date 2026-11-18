// modules/exercises.js
(function() {
  'use strict';

  var state = { filter: 'all', search: '' };

  function getDB() { return Store.get('db', []); }
  function saveDB(list) { Store.set('db', list || []); }
  function uid() { return 'ex_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
  function findById(id) {
    var list = getDB();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
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
      var borderLeft = ex.favorite ? 'border-left:3px solid var(--accent-gold);' : '';
      return '<div data-open="' + esc(ex.id) + '" style="background:var(--bg-card);border-radius:var(--radius-sm);padding:16px;margin-bottom:12px;border:1px solid var(--border-subtle);' + borderLeft + 'cursor:pointer;display:flex;justify-content:space-between;align-items:start;gap:10px">' +
        '<div style="flex:1;min-width:0">' +
          '<h4 style="margin:0 0 6px 0;color:var(--accent-gold);font-size:1.05em">' + esc(ex.name) + '</h4>' +
          '<div style="font-size:0.82em;opacity:0.75;display:flex;gap:12px;flex-wrap:wrap">' +
            '<span><i class="ph ph-tag"></i> ' + esc(ex.group || 'Общее') + '</span>' +
            '<span><i class="ph ph-fire" style="color:var(--accent-warning)"></i> ' + (ex.difficulty || 3) + '/5</span>' +
            (ex.timer > 0 ? '<span><i class="ph ph-timer" style="color:var(--accent-gold)"></i> ' + ex.timer + 'с</span>' : '') +
            (ex.restTimer > 0 ? '<span><i class="ph ph-pause-circle"></i> ' + ex.restTimer + 'с</span>' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0">' +
          '<button class="btn btn-secondary" data-fav="' + esc(ex.id) + '" title="Избранное" style="padding:6px 10px;color:' + (ex.favorite ? 'var(--accent-gold)' : 'var(--text-secondary)') + '">' +
            '<i class="' + (ex.favorite ? 'ph-fill' : 'ph') + ' ph-star"></i>' +
          '</button>' +
          '<button class="btn btn-secondary" data-edit="' + esc(ex.id) + '" title="Изменить" style="padding:6px 10px"><i class="ph ph-pencil-simple"></i></button>' +
          '<button class="btn btn-danger" data-del="' + esc(ex.id) + '" title="Удалить" style="padding:6px 10px"><i class="ph ph-trash"></i></button>' +
        '</div>' +
      '</div>';
    }).join('');

    container.innerHTML =
      '<div style="padding:4px;max-width:700px;margin:0 auto">' +
        '<h2 style="font-family:var(--font-display);font-size:1.8em;margin-bottom:16px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-books"></i> База упражнений</h2>' +
        '<div style="background:var(--bg-card);border-radius:var(--radius-md);padding:16px;margin-bottom:16px;border:1px solid var(--border-subtle);display:flex;gap:8px;flex-wrap:wrap">' +
          '<input id="exSearch" type="text" value="' + esc(state.search) + '" placeholder="Поиск по названию, группе..." style="flex:1;min-width:160px;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);background:var(--bg-input);color:var(--text-primary)">' +
          '<button class="btn ' + (state.filter === 'all' ? 'btn-primary' : 'btn-secondary') + '" id="exFilterAll" style="padding:10px 14px">Все (' + db.length + ')</button>' +
          '<button class="btn ' + (state.filter === 'fav' ? 'btn-primary' : 'btn-secondary') + '" id="exFilterFav" style="padding:10px 14px"><i class="ph-fill ph-star"></i></button>' +
        '</div>' +
        '<button class="btn btn-primary" id="exAddBtn" style="width:100%;margin-bottom:16px"><i class="ph ph-plus-circle"></i> Добавить упражнение</button>' +
        (cardsHtml || '<div style="text-align:center;padding:40px;opacity:0.6"><i class="ph ph-books" style="font-size:3em;color:var(--accent-gold);display:block;margin-bottom:10px"></i><p>Список пуст. Добавь первое упражнение!</p></div>') +
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
    modal.className = 'ex-modal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-bottom:16px">' + (editId ? 'Редактирование' : 'Новое упражнение') + '</h2>' +
        '<label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Название *</label>' +
        '<input id="fExName" type="text" value="' + esc(ex.name) + '" placeholder="Например: Подтягивания" style="width:100%;padding:10px;margin-bottom:12px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);background:var(--bg-input);color:var(--text-primary)">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
          '<div><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Группа мышц</label>' +
          '<input id="fExGroup" type="text" value="' + esc(ex.group) + '" placeholder="Спина, Грудь..." style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);background:var(--bg-input);color:var(--text-primary)"></div>' +
          '<div><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Сложность (1–5)</label>' +
          '<input id="fExDiff" type="number" min="1" max="5" value="' + (ex.difficulty || 3) + '" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);background:var(--bg-input);color:var(--text-primary)"></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
          '<div><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Таймер подхода (сек)</label>' +
          '<input id="fExTimer" type="number" min="0" value="' + (ex.timer || 0) + '" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);background:var(--bg-input);color:var(--text-primary)"></div>' +
          '<div><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Отдых (сек)</label>' +
          '<input id="fExRest" type="number" min="0" value="' + (ex.restTimer || 60) + '" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);background:var(--bg-input);color:var(--text-primary)"></div>' +
        '</div>' +
        '<label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Инвентарь</label>' +
        '<input id="fExInv" type="text" value="' + esc(ex.inventory) + '" placeholder="Турник, гантели..." style="width:100%;padding:10px;margin-bottom:12px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);background:var(--bg-input);color:var(--text-primary)">' +
        '<label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Техника выполнения</label>' +
        '<textarea id="fExDesc" rows="3" style="width:100%;padding:10px;margin-bottom:16px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);background:var(--bg-input);color:var(--text-primary);resize:vertical">' + esc(ex.description) + '</textarea>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
          '<button class="btn btn-secondary" id="fExCancel">Отмена</button>' +
          '<button class="btn btn-primary" id="fExSave"><i class="ph ph-floppy-disk"></i> Сохранить</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
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
    modal.className = 'ex-modal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-bottom:8px">' + esc(ex.name) + '</h2>' +
        '<div style="font-size:0.85em;opacity:0.75;margin-bottom:14px">' + esc(ex.group || 'Общее') + ' · Сложность ' + (ex.difficulty || 3) + '/5</div>' +
        (ex.inventory ? '<div style="background:var(--bg-primary);padding:12px;border-radius:var(--radius-sm);margin-bottom:10px"><strong style="color:var(--accent-gold)">Инвентарь:</strong> ' + esc(ex.inventory) + '</div>' : '') +
        (ex.description ? '<div style="background:var(--bg-primary);padding:12px;border-radius:var(--radius-sm);margin-bottom:16px;white-space:pre-wrap;line-height:1.5">' + esc(ex.description) + '</div>' : '') +
        '<button class="btn btn-primary" id="dExClose" style="width:100%">Закрыть</button>' +
      '</div>';
    document.body.appendChild(modal);
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
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
