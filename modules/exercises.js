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
      return '<div class="ex-card ' + (ex.favorite ? 'fav' : '') + '" data-open="' + esc(ex.id) + '">' +
        '<div style="flex:1;min-width:0">' +
          '<div class="ex-card-title">' + esc(ex.name) + '</div>' +
          '<div class="ex-card-meta">' +
            '<span><i class="ph ph-tag"></i> ' + esc(ex.group || 'Общее') + '</span>' +
            '<span><i class="ph ph-fire" style="color:var(--accent-warning)"></i> ' + (ex.difficulty || 3) + '/5</span>' +
            (ex.timer > 0 ? '<span><i class="ph ph-timer" style="color:var(--accent-gold)"></i> ' + ex.timer + 'с</span>' : '') +
            (ex.restTimer > 0 ? '<span><i class="ph ph-pause-circle"></i> ' + ex.restTimer + 'с</span>' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0">' +
          '<button class="btn btn-secondary" data-fav="' + esc(ex.id) + '" style="padding:8px 10px;color:' + (ex.favorite ? 'var(--accent-gold)' : 'var(--text-secondary)') + '">' +
            '<i class="' + (ex.favorite ? 'ph-fill' : 'ph') + ' ph-star"></i>' +
          '</button>' +
          '<button class="btn btn-secondary" data-edit="' + esc(ex.id) + '" style="padding:8px 10px"><i class="ph ph-pencil-simple"></i></button>' +
          '<button class="btn btn-danger" data-del="' + esc(ex.id) + '" style="padding:8px 10px"><i class="ph ph-trash"></i></button>' +
        '</div>' +
      '</div>';
    }).join('');

    container.innerHTML =
      '<div class="screen-wrap">' +
        '<h2 class="page-title"><i class="ph ph-books"></i> База упражнений</h2>' +
        '<div class="card" style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<input id="exSearch" class="inp" type="text" value="' + esc(state.search) + '" placeholder="Поиск..." style="flex:1;min-width:160px">' +
          '<button class="btn ' + (state.filter === 'all' ? 'btn-primary' : 'btn-secondary') + '" id="exFilterAll" style="padding:10px 14px">Все (' + db.length + ')</button>' +
          '<button class="btn ' + (state.filter === 'fav' ? 'btn-primary' : 'btn-secondary') + '" id="exFilterFav" style="padding:10px 14px"><i class="ph-fill ph-star"></i></button>' +
        '</div>' +
        '<button class="btn btn-primary" id="exAddBtn" style="width:100%;margin-bottom:16px"><i class="ph ph-plus-circle"></i> Добавить упражнение</button>' +
        (cardsHtml || '<div class="card" style="text-align:center;opacity:0.6;padding:30px">Список пуст. Добавь первое упражнение!</div>') +
      '</div>';

    document.getElementById('exAddBtn').onclick = function() { openForm(null); };
    document.getElementById('exFilterAll').onclick = function() { state.filter = 'all'; renderExercises(container); };
    document.getElementById('exFilterFav').onclick = function() { state.filter = 'fav'; renderExercises(container); };
    document.getElementById('exSearch').oninput = function() { state.search = this.value; renderExercises(container); };

    container.querySelectorAll('[data-fav]').forEach(function(b) {
      b.onclick = function(e) {
        e.stopPropagation();
        var list = getDB();
        for (var i = 0; i < list.length; i++) if (list[i].id === b.getAttribute('data-fav')) list[i].favorite = !list[i].favorite;
        saveDB(list); renderExercises(container);
      };
    });
    container.querySelectorAll('[data-edit]').forEach(function(b) {
      b.onclick = function(e) { e.stopPropagation(); openForm(b.getAttribute('data-edit')); };
    });
    container.querySelectorAll('[data-del]').forEach(function(b) {
      b.onclick = function(e) {
        e.stopPropagation();
        if (!confirm('Удалить упражнение?')) return;
        saveDB(getDB().filter(function(i) { return i.id !== b.getAttribute('data-del'); }));
        renderExercises(container);
      };
    });
    container.querySelectorAll('[data-open]').forEach(function(c) {
      c.onclick = function() { openDetails(c.getAttribute('data-open')); };
    });
  }

  function openForm(editId) {
    var esc = Store.esc;
    var ex = (editId ? findById(editId) : null) || { name: '', group: '', difficulty: 3, timer: 0, restTimer: 60, inventory: '', description: '' };
    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<h2 class="page-title" style="font-size:1.4em">' + (editId ? 'Редактирование' : 'Новое упражнение') + '</h2>' +
        '<label class="lbl">Название *</label><input id="fExName" class="inp" type="text" value="' + esc(ex.name) + '" style="margin-bottom:12px">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
          '<div><label class="lbl">Группа мышц</label><input id="fExGroup" class="inp" type="text" value="' + esc(ex.group) + '"></div>' +
          '<div><label class="lbl">Сложность (1–5)</label><input id="fExDiff" class="inp" type="number" min="1" max="5" value="' + (ex.difficulty || 3) + '"></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
          '<div><label class="lbl">Таймер подхода (с)</label><input id="fExTimer" class="inp" type="number" min="0" value="' + (ex.timer || 0) + '"></div>' +
          '<div><label class="lbl">Отдых (с)</label><input id="fExRest" class="inp" type="number" min="0" value="' + (ex.restTimer || 60) + '"></div>' +
        '</div>' +
        '<label class="lbl">Инвентарь</label><input id="fExInv" class="inp" type="text" value="' + esc(ex.inventory) + '" style="margin-bottom:12px">' +
        '<label class="lbl">Техника выполнения</label><textarea id="fExDesc" class="txt" rows="3" style="margin-bottom:16px">' + esc(ex.description) + '</textarea>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
          '<button class="btn btn-secondary" id="fExCancel">Отмена</button>' +
          '<button class="btn btn-primary" id="fExSave">Сохранить</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
    document.getElementById('fExCancel').onclick = function() { modal.remove(); };
    document.getElementById('fExSave').onclick = function() {
      var name = document.getElementById('fExName').value.trim();
      if (!name) { Shell.notify('Введи название', true); return; }
      var item = {
        id: editId || uid(), name: name,
        group: document.getElementById('fExGroup').value.trim(),
        difficulty: Math.min(5, Math.max(1, parseInt(document.getElementById('fExDiff').value, 10) || 3)),
        timer: Math.max(0, parseInt(document.getElementById('fExTimer').value, 10) || 0),
        restTimer: Math.max(0, parseInt(document.getElementById('fExRest').value, 10) || 0),
        inventory: document.getElementById('fExInv').value.trim(),
        description: document.getElementById('fExDesc').value.trim(),
        favorite: ex.favorite || false
      };
      var list = getDB();
      if (editId) { for (var i = 0; i < list.length; i++) if (list[i].id === editId) list[i] = item; }
      else list.push(item);
      saveDB(list); modal.remove(); Shell.navigate('exercises'); Shell.notify('Сохранено');
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
        '<h2 class="page-title" style="font-size:1.4em">' + esc(ex.name) + '</h2>' +
        '<div class="text-small" style="margin-bottom:14px">' + esc(ex.group || 'Общее') + ' · Сложность ' + (ex.difficulty || 3) + '/5</div>' +
        (ex.inventory ? '<div class="card"><strong>Инвентарь:</strong> ' + esc(ex.inventory) + '</div>' : '') +
        (ex.description ? '<div class="card" style="white-space:pre-wrap;line-height:1.5">' + esc(ex.description) + '</div>' : '') +
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
