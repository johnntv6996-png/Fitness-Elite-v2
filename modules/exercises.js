// modules/exercises.js
const ExercisesModule = {
  _state: { filter: 'all', search: '', sortBy: 'default', sortDir: 'asc', editingId: null, muscleFilter: null, _searchDebounce: null },
  _actionsCloseBound: false,

  init: function() {
    this._migrateCategories();
    this._bindGlobalActionsClose();
    if (typeof Shell !== 'undefined') {
      Shell.addNav('exercises', 'База упражнений', 'ph-books');
      Shell.registerScreen('exercises', function(container) { ExercisesModule.render(container); });
    }
  },

  _bindGlobalActionsClose: function() {
    if (this._actionsCloseBound) return;
    this._actionsCloseBound = true;
    document.addEventListener('click', function(e) {
      if (e.target.closest('.cat-actions-panel') || e.target.closest('.cat-actions-toggle')) return;
      document.querySelectorAll('.cat-actions-panel.open').forEach(function(p) { p.classList.remove('open'); });
    });
  },
  _closeAllActionPanels: function() { document.querySelectorAll('.cat-actions-panel.open').forEach(function(p) { p.classList.remove('open'); }); },
  _migrateCategories: function() {
    var cats = this.getCategories(), validIds = {}, changed = false;
    for (var i = 0; i < cats.length; i++) validIds[cats[i].id] = true;
    for (var j = 0; j < cats.length; j++) if (cats[j].parentId && !validIds[cats[j].parentId]) { cats[j].parentId = null; changed = true; }
    if (changed) this.saveCategories(cats);
  },

  _esc: function(t) { return Store.esc(t); },
  _uid: function(prefix) { return (prefix || 'ex') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); },
  _normalize: function(raw) {
    raw = raw || {};
    return {
      id: raw.id || this._uid('ex'), name: raw.name || '', muscleGroup: raw.muscleGroup || '',
      muscles: Array.isArray(raw.muscles) ? raw.muscles.slice() : [], description: raw.description || '',
      videoUrl: raw.videoUrl || '', imageUrl: raw.imageUrl || '', notes: raw.notes || '', inventory: raw.inventory || '',
      difficulty: raw.difficulty || 3, effectiveness: raw.effectiveness || 3,
      timer: Math.max(0, parseInt(raw.timer, 10) || 0), restTimer: Math.max(0, parseInt(raw.restTimer, 10) || 0),
      favorite: !!raw.favorite, createdAt: raw.createdAt || Date.now(), updatedAt: raw.updatedAt || Date.now()
    };
  },

  getDB: function() { return Store.get('db', []); },
  saveDB: function(db) { Store.set('db', db || []); },
  getDefaultExercise: function() { return this._normalize({}); },
  getExerciseById: function(id) {
    var db = this.getDB();
    for (var i = 0; i < db.length; i++) if (db[i].id === id) return db[i];
    return null;
  },
  getExercisesByMuscle: function(muscleId) {
    if (!muscleId) return [];
    var db = this.getDB(), res = [];
    for (var i = 0; i < db.length; i++) if (db[i].muscles && db[i].muscles.indexOf(muscleId) !== -1) res.push(db[i]);
    return res;
  },
  getMusclesForExercise: function(ex) {
    if (!ex || !ex.muscles || !ex.muscles.length) return [];
    var anat = App.getModule('anatomy');
    if (!anat || !anat.getMuscleById) return [];
    var res = [];
    for (var i = 0; i < ex.muscles.length; i++) { var m = anat.getMuscleById(ex.muscles[i]); if (m) res.push(m); }
    return res;
  },

  getCategories: function() { return Store.get('categories', []); },
  saveCategories: function(c) { Store.set('categories', c || []); },
  getCategoryById: function(id) {
    var cats = this.getCategories();
    for (var i = 0; i < cats.length; i++) if (cats[i].id === id) return cats[i];
    return null;
  },
  getCategoryAndDescendants: function(catId) {
    if (!catId) return [];
    var cats = this.getCategories(), childrenMap = {};
    for (var i = 0; i < cats.length; i++) {
      var pid = cats[i].parentId || '__root__';
      if (!childrenMap[pid]) childrenMap[pid] = [];
      childrenMap[pid].push(cats[i]);
    }
    var result = [], stack = [catId], visited = {};
    while (stack.length) {
      var cur = stack.pop();
      if (visited[cur]) continue;
      visited[cur] = true; result.push(cur);
      var kids = childrenMap[cur] || [];
      for (var k = 0; k < kids.length; k++) stack.push(kids[k].id);
    }
    return result;
  },
  getChildren: function(catId) { return this.getCategories().filter(function(c) { return c.parentId === catId; }); },
  _hasChildren: function(catId) { return this.getChildren(catId).length > 0; },
  _isAncestorOf: function(ancestorId, catId) {
    if (!ancestorId || !catId || ancestorId === catId) return false;
    var cats = this.getCategories(), byId = {};
    for (var i = 0; i < cats.length; i++) byId[cats[i].id] = cats[i];
    var cur = catId, guard = 0;
    while (cur && guard < 100) {
      var cat = byId[cur]; if (!cat) break;
      if (cat.parentId === ancestorId) return true;
      cur = cat.parentId || null; guard++;
    }
    return false;
  },
  _totalPerCatWithDescendants: function(counts) {
    var flat = counts.flatTree, total = {};
    for (var i = 0; i < flat.length; i++) {
      var id = flat[i].id, ids = this.getCategoryAndDescendants(id), sum = 0;
      for (var k = 0; k < ids.length; k++) sum += (counts.perCategory[ids[k]] || 0);
      total[id] = sum;
    }
    return total;
  },
  getCategoryPath: function(catId) {
    var path = [], curId = catId, guard = 0, cats = this.getCategories(), byId = {};
    for (var i = 0; i < cats.length; i++) byId[cats[i].id] = cats[i];
    while (curId && guard < 100) { var cat = byId[curId]; if (!cat) break; path.unshift(cat.name); curId = cat.parentId || null; guard++; }
    return path;
  },
  _getCategoryPathIds: function(catId) {
    var path = [], curId = catId, guard = 0, cats = this.getCategories(), byId = {};
    for (var i = 0; i < cats.length; i++) byId[cats[i].id] = cats[i];
    while (curId && guard < 100) { var cat = byId[curId]; if (!cat) break; path.unshift(cat.id); curId = cat.parentId || null; guard++; }
    return path;
  },
  _flatCategoryTree: function() {
    var cats = this.getCategories(), childrenMap = {};
    for (var i = 0; i < cats.length; i++) {
      var pid = cats[i].parentId || '__root__';
      if (!childrenMap[pid]) childrenMap[pid] = [];
      childrenMap[pid].push(cats[i]);
    }
    var result = [];
    var walk = function(parentId, depth) {
      var list = childrenMap[parentId] || [];
      for (var i = 0; i < list.length; i++) {
        result.push({ id: list[i].id, name: list[i].name, parentId: list[i].parentId || null, depth: depth });
        walk(list[i].id, depth + 1);
      }
    };
    walk('__root__', 0);
    return result;
  },
  _counts: function() {
    var db = this.getDB(), flat = this._flatCategoryTree(), favorites = 0, uncategorized = 0, perCat = {};
    for (var i = 0; i < db.length; i++) {
      if (db[i].favorite) favorites++;
      if (!db[i].muscleGroup) uncategorized++;
      else perCat[db[i].muscleGroup] = (perCat[db[i].muscleGroup] || 0) + 1;
    }
    return { total: db.length, favorites: favorites, uncategorized: uncategorized, perCategory: perCat, flatTree: flat };
  },
  _filtered: function() {
    var db = this.getDB(), filter = this._state.filter, search = (this._state.search || '').trim().toLowerCase();
    var sortBy = this._state.sortBy, sortDir = this._state.sortDir, muscleFilter = this._state.muscleFilter, filtered = db;
    if (filter === 'favorites') filtered = filtered.filter(function(e) { return e.favorite; });
    else if (filter === 'uncategorized') filtered = filtered.filter(function(e) { return !e.muscleGroup; });
    else if (filter !== 'all') {
      var ids = this.getCategoryAndDescendants(filter);
      filtered = filtered.filter(function(e) { return ids.indexOf(e.muscleGroup) !== -1; });
    }
    if (muscleFilter) filtered = filtered.filter(function(e) { return e.muscles && e.muscles.indexOf(muscleFilter) !== -1; });
    if (search) filtered = filtered.filter(function(e) { return (e.name || '').toLowerCase().indexOf(search) !== -1 || (e.description || '').toLowerCase().indexOf(search) !== -1; });
    var dir = sortDir === 'desc' ? -1 : 1;
    if (sortBy === 'name') filtered = filtered.slice().sort(function(a, b) { return dir * (a.name || '').localeCompare(b.name || ''); });
    else if (sortBy === 'difficulty') filtered = filtered.slice().sort(function(a, b) { return dir * ((a.difficulty || 0) - (b.difficulty || 0)); });
    else if (sortBy === 'effectiveness') filtered = filtered.slice().sort(function(a, b) { return dir * ((a.effectiveness || 0) - (b.effectiveness || 0)); });
    else if (sortBy === 'favorite') filtered = filtered.slice().sort(function(a, b) { return dir * ((a.favorite ? 0 : 1) - (b.favorite ? 0 : 1)); });
    return filtered;
  },
  render: function(container) {
    container.innerHTML =
      '<div style="padding:4px;max-width:700px;margin:0 auto">' +
        '<h2 style="font-family:var(--font-display);font-size:1.8em;margin-bottom:16px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-books"></i> База упражнений</h2>' +
        '<div id="exToolbar"></div><div id="exAddBtnWrap"></div><div id="exList"></div>' +
      '</div>';
    this.renderToolbar(); this.renderAddButton(); this.renderExList();
    var self = this; setTimeout(function() { self.initDragScroll(); }, 50);
  },

  renderToolbar: function() {
    var esc = this._esc, host = document.getElementById('exToolbar');
    if (!host) return;
    var opts = [{ id: 'default', label: 'По умолчанию' }, { id: 'name', label: 'По названию' }, { id: 'difficulty', label: 'По сложности' }, { id: 'effectiveness', label: 'По эффективности' }, { id: 'favorite', label: 'Сначала избранные' }];
    var sortHtml = opts.map(function(o) { return '<option value="' + o.id + '" ' + (ExercisesModule._state.sortBy === o.id ? 'selected' : '') + '>' + o.label + '</option>'; }).join('');
    var sortDirHtml = this._state.sortBy !== 'default' ? '<button class="cat-action-btn" onclick="ExercisesModule.toggleSortDir()" style="margin-left:4px"><i class="ph ' + (this._state.sortDir === 'asc' ? 'ph-sort-ascending' : 'ph-sort-descending') + '"></i></button>' : '';
    var muscleFilterHtml = '';
    if (this._state.muscleFilter) {
      var mLabel = this._state.muscleFilter, anat = App.getModule('anatomy');
      if (anat && anat.getMuscleById) { var mm = anat.getMuscleById(this._state.muscleFilter); if (mm) mLabel = mm.name; }
      muscleFilterHtml = '<div style="margin-top:10px;padding:8px 12px;background:var(--accent-gold-dim);border:1px solid var(--border-gold);border-radius:10px;display:flex;align-items:center;gap:8px;font-size:0.85em">' +
        '<i class="ph ph-funnel" style="color:var(--accent-gold)"></i><span>Фильтр по мышце: <strong>' + esc(mLabel) + '</strong></span>' +
        '<button onclick="ExercisesModule.clearMuscleFilter()" style="margin-left:auto;background:transparent;border:none;color:var(--accent-error);cursor:pointer;font-size:1.1em;padding:2px 6px"><i class="ph ph-x"></i></button></div>';
    }
    host.innerHTML =
      '<div style="background:var(--bg-card);border-radius:14px;padding:16px;margin-bottom:16px;border:1px solid var(--border-subtle)">' +
        '<div style="font-weight:600;font-size:0.95em;display:flex;align-items:center;gap:8px;margin-bottom:8px"><i class="ph ph-folder" style="color:var(--accent-gold)"></i> Категории</div>' +
        '<div class="root-row"><div class="cat-row" id="catScrollContainer"></div>' + this._renderRootActions() + '</div>' +
        '<div id="catLevelsContainer" style="display:flex;flex-direction:column"></div>' +
        '<div class="hint" style="margin-top:10px;display:flex;align-items:center;gap:6px"><i class="ph ph-info"></i> Скролль мышкой или пальцем. Кликни на категорию.</div>' +
        muscleFilterHtml +
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center">' +
          '<input id="exSearchInput" class="ex-search" type="text" placeholder="Поиск по названию, описанию..." value="' + esc(this._state.search || '') + '" oninput="ExercisesModule.onSearchInput(this.value)">' +
          '<select id="exSortSelect" class="ex-sort" onchange="ExercisesModule.setSort(this.value)">' + sortHtml + '</select>' + sortDirHtml +
        '</div></div>';
    this.renderCatStrip(); this.renderLevels(); this.initDragScroll();
  },

  _renderRootActions: function() {
    var activeId = this._state.filter, isSys = ['all', 'uncategorized', 'favorites'].indexOf(activeId) !== -1;
    var activeCat = !isSys ? this.getCategoryById(activeId) : null;
    return this._renderActionsBlock({ ownerId: null, activeId: (activeCat && !activeCat.parentId) ? activeId : '', isRootBlock: true });
  },
  _renderLevelActions: function(activeInLevel, ownerId) { return this._renderActionsBlock({ ownerId: ownerId, activeId: activeInLevel || '', isRootBlock: false }); },
  _renderActionsBlock: function(opts) {
    var ownerId = opts.ownerId || '', activeId = opts.activeId || '', disable = !activeId;
    var ownerStr = ownerId ? this._esc(ownerId).replace(/'/g, "\\'") : '', activeStr = activeId ? this._esc(activeId).replace(/'/g, "\\'") : '';
    var addSub = ownerId ? "ExercisesModule.openCategoryForm(null, '" + ownerStr + "')" : "ExercisesModule.openCategoryForm()";
    var dis = disable ? 'disabled' : '';
    return '<div class="' + (opts.isRootBlock ? 'root-actions' : 'level-actions') + '">' +
      '<button class="cat-actions-toggle" onclick="event.stopPropagation(); ExercisesModule.toggleActionsPanel(this)"><i class="ph ph-gear"></i></button>' +
      '<div class="cat-actions-panel">' +
        '<button onclick="' + addSub + '"><i class="ph ph-plus"></i> ' + (ownerId ? 'Создать на этом уровне' : 'Создать корневую категорию') + '</button>' +
        '<button ' + dis + ' onclick="ExercisesModule.openCategoryForm(null, \'' + activeStr + '\')"><i class="ph ph-folder-plus"></i> Создать подкатегорию</button>' +
        '<button ' + dis + ' onclick="ExercisesModule.openCategoryForm(\'' + activeStr + '\')"><i class="ph ph-pencil-simple"></i> Редактировать</button>' +
        '<button class="danger" ' + dis + ' onclick="ExercisesModule.deleteCategory(\'' + activeStr + '\')"><i class="ph ph-trash"></i> Удалить</button>' +
      '</div></div>';
  },
  toggleActionsPanel: function(btn) {
    var panel = btn.closest('.level-actions, .root-actions').querySelector('.cat-actions-panel');
    var isOpen = panel.classList.contains('open'); this._closeAllActionPanels();
    if (!isOpen) panel.classList.add('open');
  },

  renderCatStrip: function() {
    var esc = this._esc, container = document.getElementById('catScrollContainer');
    if (!container) return;
    var counts = this._counts(), filter = this._state.filter, roots = counts.flatTree.filter(function(c) { return !c.parentId; });
    var html = '<button class="cat-btn ' + (filter === 'all' ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'all\')"><i class="ph ph-squares-four"></i> Все (' + counts.total + ')</button>';
    if (counts.favorites > 0) html += '<button class="cat-btn ' + (filter === 'favorites' ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'favorites\')"><i class="ph-fill ph-star"></i> Избранное (' + counts.favorites + ')</button>';
    html += '<button class="cat-btn ' + (filter === 'uncategorized' ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'uncategorized\')"><i class="ph ph-question"></i> Без категории (' + counts.uncategorized + ')</button>';
    var totalForCat = this._totalPerCatWithDescendants(counts);
    for (var i = 0; i < roots.length; i++) {
      var cat = roots[i], safeId = esc(cat.id).replace(/'/g, "\\'");
      var arrow = this._hasChildren(cat.id) ? '<i class="ph ph-caret-down" style="font-size:0.85em;opacity:0.7"></i>' : '';
      var cls = 'cat-btn' + (filter === cat.id ? ' active' : (this._isAncestorOf(cat.id, filter) ? ' ancestor' : ''));
      html += '<button class="' + cls + '" onclick="ExercisesModule.setFilter(\'' + safeId + '\')">' + arrow + '<i class="ph ph-tag"></i> ' + esc(cat.name) + ' (' + (totalForCat[cat.id] || 0) + ')</button>';
    }
    container.innerHTML = html; this._bindDragScroll(container);
  },

  renderLevels: function() {
    var esc = this._esc, host = document.getElementById('catLevelsContainer');
    if (!host) return;
    var activeId = this._state.filter;
    if (['all', 'favorites', 'uncategorized'].indexOf(activeId) !== -1) { host.innerHTML = ''; return; }
    var pathIds = this._getCategoryPathIds(activeId), counts = this._counts(), totalForCat = this._totalPerCatWithDescendants(counts), html = '';
    for (var level = 1; level <= pathIds.length; level++) {
      var ownerId = pathIds[level - 1], children = this.getChildren(ownerId);
      if (!children.length) continue;
      var activeInLevel = '';
      for (var k = 0; k < children.length; k++) if (children[k].id === activeId) activeInLevel = activeId;
      html += '<div class="level-row"><div class="cat-row" id="catLevel' + level + '">';
      for (var k2 = 0; k2 < children.length; k2++) {
        var child = children[k2], safeChild = esc(child.id).replace(/'/g, "\\'");
        var arrow = this._hasChildren(child.id) ? '<i class="ph ph-caret-down" style="font-size:0.85em;opacity:0.7"></i>' : '';
        var cls = 'cat-btn child' + (child.id === activeId ? ' active' : (this._isAncestorOf(child.id, activeId) ? ' ancestor' : ''));
        html += '<button class="' + cls + '" onclick="ExercisesModule.setFilter(\'' + safeChild + '\')">' + arrow + '<i class="ph ph-tag"></i> ' + esc(child.name) + ' (' + (totalForCat[child.id] || 0) + ')</button>';
      }
      html += '</div>' + this._renderLevelActions(activeInLevel, ownerId) + '</div>';
    }
    host.innerHTML = html;
  },

  renderExList: function() {
    var esc = this._esc, host = document.getElementById('exList');
    if (!host) return;
    var filtered = this._filtered();
    if (!filtered.length) {
      host.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.6"><i class="ph ph-books" style="font-size:3em;color:var(--accent-gold);margin-bottom:10px;display:block"></i><p>Ничего не найдено. Добавь первое упражнение!</p></div>';
      return;
    }
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var ex = filtered[i], catPath = ex.muscleGroup ? this.getCategoryPath(ex.muscleGroup).join(' / ') : '';
      var mNames = this.getMusclesForExercise(ex).map(function(m) { return m.name; });
      html += '<div class="ex-card ' + (ex.favorite ? 'favorite' : '') + '" onclick="ExercisesModule.viewExercise(\'' + esc(ex.id) + '\')">' +
        '<div style="display:flex;justify-content:space-between;align-items:start">' +
          '<div style="flex:1">' +
            '<h4 style="margin:0 0 6px 0;color:var(--accent-gold);font-size:1.05em;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' + esc(ex.name) +
              (ex.videoUrl ? ' <i class="ph ph-video-camera" style="color:var(--accent-neon)"></i>' : '') +
              (ex.imageUrl ? ' <i class="ph ph-image" style="color:var(--accent-neon)"></i>' : '') +
              (ex.timer > 0 ? ' <i class="ph ph-timer" style="color:var(--accent-gold)"></i>' : '') +
            '</h4>' +
            '<div style="font-size:0.85em;opacity:0.7;margin-bottom:6px;display:flex;align-items:center;gap:6px"><i class="ph ph-tag"></i> ' + esc(catPath || 'Без категории') + '</div>' +
            (mNames.length ? '<div style="font-size:0.78em;opacity:0.7;margin-bottom:6px"><i class="ph ph-person" style="color:var(--accent-gold)"></i> ' + esc(mNames.join(', ')) + '</div>' : '') +
            '<div style="font-size:0.8em;opacity:0.7;display:flex;gap:16px;flex-wrap:wrap">' +
              '<span style="display:flex;align-items:center;gap:4px"><i class="ph ph-fire" style="color:var(--accent-warning)"></i> ' + MathCore.renderStars(ex.difficulty || 3) + '</span>' +
              '<span style="display:flex;align-items:center;gap:4px"><i class="ph ph-target" style="color:var(--accent-success)"></i> ' + MathCore.renderStars(ex.effectiveness || 3) + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;margin-left:10px;align-items:center">' +
            '<button class="fav-btn ' + (ex.favorite ? 'active' : '') + '" onclick="event.stopPropagation();ExercisesModule.toggleFavorite(\'' + esc(ex.id) + '\')"><i class="' + (ex.favorite ? 'ph-fill' : 'ph') + ' ph-star"></i></button>' +
            '<button class="btn btn-secondary" style="padding:6px 10px;font-size:0.85em" onclick="event.stopPropagation();ExercisesModule.editExercise(\'' + esc(ex.id) + '\')"><i class="ph ph-pencil-simple"></i></button>' +
            '<button class="btn btn-danger" style="padding:6px 10px;font-size:0.85em" onclick="event.stopPropagation();ExercisesModule.deleteExercise(\'' + esc(ex.id) + '\')"><i class="ph ph-trash"></i></button>' +
          '</div>' +
        '</div></div>';
    }
    host.innerHTML = html;
  },

  renderAddButton: function() {
    var esc = this._esc, host = document.getElementById('exAddBtnWrap');
    if (!host) return;
    var filter = this._state.filter, isCustom = filter !== 'all' && filter !== 'uncategorized' && filter !== 'favorites';
    var catName = isCustom ? (this.getCategoryById(filter) || {}).name || '' : '';
    host.innerHTML = '<button class="btn btn-primary" style="width:100%;padding:14px;font-size:1em;font-weight:600;margin-bottom:16px" onclick="ExercisesModule.openExForm(null, \'' + esc(isCustom ? filter : '').replace(/'/g, "\\'") + '\')"><i class="ph ph-plus-circle"></i> ' + (isCustom ? 'Добавить в «' + esc(catName) + '»' : 'Добавить упражнение') + '</button>';
  },

  _bindDragScroll: function(c) {
    if (!c) return;
    c.addEventListener('wheel', function(e) { if (c.scrollWidth > c.clientWidth) { e.preventDefault(); c.scrollLeft += e.deltaY * 1.5; } }, { passive: false });
  },
  initDragScroll: function() { this._bindDragScroll(document.getElementById('catScrollContainer')); },
  setFilter: function(f) { this._state.filter = f; this._closeAllActionPanels(); this.renderToolbar(); this.renderAddButton(); this.renderExList(); },
  setMuscleFilter: function(m) { this._state.muscleFilter = m || null; this.renderToolbar(); this.renderExList(); },
  clearMuscleFilter: function() { this._state.muscleFilter = null; this.renderToolbar(); this.renderExList(); },
  onSearchInput: function(v) { this._state.search = v || ''; clearTimeout(this._state._searchDebounce); var self = this; this._state._searchDebounce = setTimeout(function() { self.renderExList(); }, 150); },
  setSort: function(s) {
    if (this._state.sortBy === s && s !== 'default') this._state.sortDir = this._state.sortDir === 'asc' ? 'desc' : 'asc';
    else { this._state.sortBy = s || 'default'; this._state.sortDir = 'asc'; }
    this.renderToolbar(); this.renderExList();
  },
  toggleSortDir: function() { this._state.sortDir = this._state.sortDir === 'asc' ? 'desc' : 'asc'; this.renderToolbar(); this.renderExList(); },

  openCategoryForm: function(oldId, presetParentId) {
    this._closeAllActionPanels();
    var esc = this._esc, isEdit = !!oldId, current = oldId ? this.getCategoryById(oldId) : null;
    var parentId = isEdit ? (current ? current.parentId : null) : (presetParentId || null);
    var modal = document.createElement('div'); modal.className = 'ex-modal'; modal.id = 'catFormModal';
    modal.innerHTML =
      '<div class="ex-modal-content" style="max-width:450px">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'catFormModal\').remove()"><i class="ph ph-x"></i></button>' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0">' + (isEdit ? 'Редактировать' : 'Новая категория') + '</h2>' +
        '<input type="text" id="catName" value="' + esc(current ? current.name : '') + '" placeholder="Название" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);margin:12px 0">' +
        '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-secondary" onclick="document.getElementById(\'catFormModal\').remove()">Отмена</button><button class="btn btn-primary" onclick="ExercisesModule.saveCategory(\'' + esc(oldId || '') + '\', \'' + esc(parentId || '') + '\')">Сохранить</button></div>' +
      '</div>';
    document.body.appendChild(modal);
  },
  saveCategory: function(oldId, parentId) {
    var name = (document.getElementById('catName').value || '').trim();
    if (!name) return;
    var cats = this.getCategories();
    if (oldId) { for (var i = 0; i < cats.length; i++) if (cats[i].id === oldId) cats[i].name = name; }
    else { var nc = { id: this._uid('cat'), name: name, parentId: parentId || null }; cats.push(nc); this._state.filter = parentId || nc.id; }
    this.saveCategories(cats);
    var m = document.getElementById('catFormModal'); if (m) m.remove();
    this.renderToolbar(); this.renderAddButton(); this.renderExList();
  },
  deleteCategory: function(id) {
    this._closeAllActionPanels();
    var cat = this.getCategoryById(id); if (!cat || !confirm('Удалить категорию?')) return;
    var desc = this.getCategoryAndDescendants(id);
    this.saveCategories(this.getCategories().filter(function(c) { return desc.indexOf(c.id) === -1; }));
    var db = this.getDB(); for (var i = 0; i < db.length; i++) if (desc.indexOf(db[i].muscleGroup) !== -1) db[i].muscleGroup = '';
    this.saveDB(db); this._state.filter = cat.parentId || 'all';
    this.renderToolbar(); this.renderAddButton(); this.renderExList();
  },
  openExForm: function(id, defaultCategory) {
    var esc = this._esc; this._state.editingId = id || null;
    var ex = id ? (this.getExerciseById(id) || this.getDefaultExercise()) : this.getDefaultExercise();
    var flat = this._flatCategoryTree(), optionsHtml = '<option value="">Без категории</option>';
    for (var i = 0; i < flat.length; i++) {
      var cat = flat[i], sel = id ? (ex.muscleGroup === cat.id) : (defaultCategory === cat.id);
      optionsHtml += '<option value="' + esc(cat.id) + '" ' + (sel ? 'selected' : '') + '>' + Array(cat.depth + 1).join('— ') + esc(cat.name) + '</option>';
    }
    var modal = document.createElement('div'); modal.className = 'ex-modal'; modal.id = 'exFormModal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'exFormModal\').remove()"><i class="ph ph-x"></i></button>' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0">' + (id ? 'Редактирование' : 'Новое упражнение') + '</h2>' +
        '<label style="display:block;margin:10px 0 4px">Название *</label><input type="text" id="exName" value="' + esc(ex.name) + '" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)">' +
        '<label style="display:block;margin:10px 0 4px">Категория</label><select id="exMuscleGroup" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)">' + optionsHtml + '</select>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0">' +
          '<div><label style="display:block;margin-bottom:4px">Сложность (1-5)</label><input type="number" id="exDifficulty" min="1" max="5" value="' + (ex.difficulty || 3) + '" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)"></div>' +
          '<div><label style="display:block;margin-bottom:4px">Эффективность (1-5)</label><input type="number" id="exEffectiveness" min="1" max="5" value="' + (ex.effectiveness || 3) + '" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)"></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0">' +
          '<div><label style="display:block;margin-bottom:4px">Таймер (сек)</label><input type="number" id="exTimer" min="0" value="' + (ex.timer || 0) + '" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)"></div>' +
          '<div><label style="display:block;margin-bottom:4px">Отдых (сек)</label><input type="number" id="exRestTimer" min="0" value="' + (ex.restTimer || 0) + '" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)"></div>' +
        '</div>' +
        '<div id="exMuscleSelectorWrap" style="margin:10px 0"></div>' +
        '<label style="display:block;margin:10px 0 4px">Описание</label><textarea id="exDescription" rows="3" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)">' + esc(ex.description) + '</textarea>' +
        '<label style="display:block;margin:10px 0 4px">Картинка (URL)</label><input type="text" id="exImage" value="' + esc(ex.imageUrl) + '" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)">' +
        '<label style="display:block;margin:10px 0 4px">Видео (URL)</label><input type="text" id="exVideo" value="' + esc(ex.videoUrl) + '" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)">' +
        '<label style="display:block;margin:10px 0 4px">Инвентарь</label><input type="text" id="exInventory" value="' + esc(ex.inventory) + '" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)">' +
        '<label style="display:block;margin:10px 0 4px">Заметки</label><textarea id="exNotes" rows="2" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary)">' + esc(ex.notes) + '</textarea>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn btn-secondary" onclick="document.getElementById(\'exFormModal\').remove()">Отмена</button><button class="btn btn-primary" onclick="ExercisesModule.saveExercise()">Сохранить</button></div>' +
      '</div>';
    document.body.appendChild(modal);
    this._renderMuscleSelector(ex.muscles || []);
  },
  _renderMuscleSelector: function(selectedIds) {
    var host = document.getElementById('exMuscleSelectorWrap'), anat = App.getModule('anatomy');
    if (!host || !anat || !anat.getBodyParts) return;
    this._pendingMuscles = selectedIds.slice();
    var parts = anat.getBodyParts(), sel = {};
    for (var i = 0; i < selectedIds.length; i++) sel[selectedIds[i]] = true;
    var html = '<label style="display:block;margin-bottom:4px;font-weight:600">Задействованные мышцы:</label><div class="muscle-selector">';
    for (var p = 0; p < parts.length; p++) {
      var ms = anat.getMusclesByPart(parts[p].id); if (!ms.length) continue;
      html += '<div class="muscle-part-acc"><div class="muscle-part-header" onclick="this.parentElement.classList.toggle(\'open\')"><span>' + this._esc(parts[p].name) + '</span></div><div class="muscle-part-body">';
      for (var m = 0; m < ms.length; m++) {
        html += '<label class="muscle-check-row"><input type="checkbox" value="' + this._esc(ms[m].id) + '" ' + (sel[ms[m].id] ? 'checked' : '') + ' onchange="ExercisesModule._onMuscleCheck(this)"><span>' + this._esc(ms[m].name) + '</span></label>';
      }
      html += '</div></div>';
    }
    html += '</div>'; host.innerHTML = html;
  },
  _onMuscleCheck: function(cb) {
    var id = cb.value, idx = this._pendingMuscles.indexOf(id);
    if (cb.checked && idx === -1) this._pendingMuscles.push(id);
    else if (!cb.checked && idx !== -1) this._pendingMuscles.splice(idx, 1);
  },
  saveExercise: function() {
    var name = (document.getElementById('exName').value || '').trim();
    if (!name) return;
    var db = this.getDB(), data = {
      name: name, muscleGroup: document.getElementById('exMuscleGroup').value,
      muscles: (this._pendingMuscles || []).slice(),
      difficulty: Math.min(5, Math.max(1, parseInt(document.getElementById('exDifficulty').value, 10) || 3)),
      effectiveness: Math.min(5, Math.max(1, parseInt(document.getElementById('exEffectiveness').value, 10) || 3)),
      timer: Math.max(0, parseInt(document.getElementById('exTimer').value, 10) || 0),
      restTimer: Math.max(0, parseInt(document.getElementById('exRestTimer').value, 10) || 0),
      description: document.getElementById('exDescription').value.trim(), imageUrl: document.getElementById('exImage').value.trim(),
      videoUrl: document.getElementById('exVideo').value.trim(), inventory: document.getElementById('exInventory').value.trim(),
      notes: document.getElementById('exNotes').value.trim(), updatedAt: Date.now()
    };
    if (this._state.editingId) { for (var i = 0; i < db.length; i++) if (db[i].id === this._state.editingId) db[i] = Object.assign({}, db[i], data); }
    else { data.id = this._uid('ex'); data.createdAt = Date.now(); data.favorite = false; db.push(data); }
    this.saveDB(db); var m = document.getElementById('exFormModal'); if (m) m.remove();
    this.renderCatStrip(); this.renderAddButton(); this.renderExList(); this.renderLevels();
  },
  editExercise: function(id) { this.openExForm(id); },
  deleteExercise: function(id) { if (!confirm('Удалить?')) return; this.saveDB(this.getDB().filter(function(e) { return e.id !== id; })); this.renderCatStrip(); this.renderExList(); this.renderLevels(); },
  toggleFavorite: function(id) { var db = this.getDB(); for (var i = 0; i < db.length; i++) if (db[i].id === id) db[i].favorite = !db[i].favorite; this.saveDB(db); this.renderCatStrip(); this.renderExList(); this.renderLevels(); },

  viewExercise: function(id) {
    var esc = this._esc, ex = this.getExerciseById(id); if (!ex) return;
    var modal = document.createElement('div'); modal.className = 'ex-modal'; modal.id = 'exViewModal';
    var content = document.createElement('div'); content.className = 'ex-modal-content';
    var catPath = ex.muscleGroup ? this.getCategoryPath(ex.muscleGroup).join(' / ') : '';
    content.innerHTML =
      '<button style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'exViewModal\').remove()"><i class="ph ph-x"></i></button>' +
      '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 12px 0">' + esc(ex.name) + '</h2>' +
      '<div style="font-size:0.9em;opacity:0.7;margin-bottom:12px"><i class="ph ph-tag"></i> ' + esc(catPath || 'Без категории') + '</div>' +
      '<div style="display:flex;gap:20px;margin-bottom:16px;font-size:0.9em;flex-wrap:wrap"><div>Сложность: ' + MathCore.renderStars(ex.difficulty || 3) + '</div><div>Эффективность: ' + MathCore.renderStars(ex.effectiveness || 3) + '</div></div>' +
      (ex.inventory ? '<div class="ex-view-section"><strong>Инвентарь:</strong> ' + esc(ex.inventory) + '</div>' : '') +
      (ex.description ? '<div class="ex-view-section"><h3>Описание</h3><p style="white-space:pre-wrap;margin:0;line-height:1.6">' + esc(ex.description) + '</p></div>' : '') +
      '<div id="exViewMedia"></div>' +
      (ex.notes ? '<div class="ex-view-section" style="border-left:3px solid var(--accent-gold)"><h3>Заметки</h3><p style="white-space:pre-wrap;margin:0">' + esc(ex.notes) + '</p></div>' : '') +
      '<div class="ex-view-actions"><button class="btn btn-secondary" onclick="document.getElementById(\'exViewModal\').remove()">Закрыть</button><button class="btn btn-primary" onclick="document.getElementById(\'exViewModal\').remove();ExercisesModule.editExercise(\'' + esc(ex.id) + '\')">Редактировать</button></div>';
    modal.appendChild(content); document.body.appendChild(modal);
    var box = document.getElementById('exViewMedia');
    if (box && typeof Media !== 'undefined') {
      var img = Media.renderImage(ex.imageUrl, { maxHeight: 300, marginTop: 0 }); if (img) box.appendChild(img);
      var vid = Media.renderVideo(ex.videoUrl, { maxHeight: 300, marginTop: 12 }); if (vid) box.appendChild(vid);
    }
  }
};
window.ExercisesModule = ExercisesModule;
App.define('exercises', ExercisesModule);
