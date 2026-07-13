// ======= CONSTANTS =======
var SITE_DATA_KEY = 'ayu-site-data';
var WORKS_KEY = 'ayu-works-admin';

// ======= UTILITIES =======
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2200);
}

function genId(prefix) {
  return (prefix || 'item') + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// ======= SITE DATA =======
function loadSiteData() {
  var stored = localStorage.getItem(SITE_DATA_KEY);
  if (stored) { try { var d = JSON.parse(stored); if (d) return d; } catch(e) {} }
  return null;
}

function saveSiteData(data) {
  try {
    localStorage.setItem(SITE_DATA_KEY, JSON.stringify(data));
  } catch(e) {
    showToast('⚠️ 存储空间不足！请清理部分数据后重试');
  }
}

function getDefaultSiteData() {
  return {
    hero: { hint: '', title: '', subtitle: '', greetings: [] },
    passport: { name: '', island: '', role: '', motto: '' },
    projects: [],
    competitions: [],
    socialLinks: []
  };
}

function seedSiteData(callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'site-data.json', true);
  xhr.onload = function() {
    if (xhr.status === 200 || xhr.status === 0) {
      try {
        var d = JSON.parse(xhr.responseText);
        if (d && d.passport && d.passport.name) {
          // Only seed if site-data.json has real content (not an empty shell)
          saveSiteData(d);
          callback(d);
          return;
        } else if (d) {
          // site-data.json exists but is empty — don't overwrite localStorage
          var existing = loadSiteData();
          if (existing && existing.passport && existing.passport.name) {
            callback(existing);
            return;
          }
        }
      } catch(e) {}
    }
    var def = getDefaultSiteData();
    callback(def);
  };
  xhr.onerror = function() { callback(getDefaultSiteData()); };
  xhr.send();
}

// ======= WORKS DATA (gallery) =======
function loadWorks() {
  try { return JSON.parse(localStorage.getItem(WORKS_KEY) || '[]'); } catch(e) { return []; }
}

function saveWorks(works) {
  try {
    localStorage.setItem(WORKS_KEY, JSON.stringify(works));
  } catch(e) {
    showToast('⚠️ 存储空间不足！请删除一些大图作品后重试');
    throw e;
  }
}

function seedWorks(callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'data.json', true);
  xhr.onload = function() {
    if (xhr.status === 200 || xhr.status === 0) {
      try { var d = JSON.parse(xhr.responseText); if (d && d.length) { saveWorks(d); callback(d); return; } } catch(e) {}
    }
    callback([]);
  };
  xhr.onerror = function() { callback([]); };
  xhr.send();
}

// ======= TABS =======
var currentTab = 'site';

function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(el) { el.classList.remove('active'); });
  var tabEl = document.getElementById('tab-' + tabName);
  if (tabEl) tabEl.classList.add('active');
  var btn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
  if (btn) btn.classList.add('active');
}

document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    switchTab(this.dataset.tab);
  });
});

// ======= POPULATE FORMS FROM SITE DATA =======
function populateSiteForms(data) {
  if (!data) data = getDefaultSiteData();

  // Tab 1: Site info
  var h = data.hero || {};
  document.getElementById('heroHint').value = h.hint || '';
  document.getElementById('heroTitle').value = h.title || '';
  document.getElementById('heroSubtitle').value = h.subtitle || '';
  document.getElementById('heroGreetings').value = (h.greetings || []).join('\n');

  // Tab 2: Passport
  var p = data.passport || {};
  document.getElementById('pfName').value = p.name || '';
  document.getElementById('pfIsland').value = p.island || '';
  document.getElementById('pfRole').value = p.role || '';
  document.getElementById('pfMotto').value = p.motto || '';

  // Tab 3: Workshop
  renderWorkshopList(data.projects || []);

  // Tab 5: Competitions
  renderCompList(data.competitions || []);

  // Tab 6: Social
  renderSocialList(data.socialLinks || []);
}

// ======= COLLECT SITE DATA FROM FORMS =======
function collectSiteData() {
  // Start from existing data (preserves projects/competitions/socialLinks)
  var data = loadSiteData() || getDefaultSiteData();

  data.hero = {
    hint: document.getElementById('heroHint').value.trim(),
    title: document.getElementById('heroTitle').value.trim(),
    subtitle: document.getElementById('heroSubtitle').value.trim(),
    greetings: document.getElementById('heroGreetings').value.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; })
  };

  data.passport = {
    name: document.getElementById('pfName').value.trim(),
    island: document.getElementById('pfIsland').value.trim(),
    role: document.getElementById('pfRole').value.trim(),
    motto: document.getElementById('pfMotto').value.trim()
  };

  // CRITICAL: preserve list data from the in-memory copies managed by their own tabs
  // These are stored separately in localStorage via setWorkshopProjects/setCompetitions/setSocialLinks
  // but we must not let them get wiped when saving hero+passport
  // (Already preserved via loadSiteData() above since setXxx saves to the same key)
  return data;
}

// ======= TAB 3: WORKSHOP (Projects) =======
var workshopEditingId = null;

function renderWorkshopList(projects) {
  var container = document.getElementById('workshopList');
  if (!projects || !projects.length) {
    container.innerHTML = '<div class="empty-hint">还没有项目，点击上方按钮添加 🛠️</div>';
    return;
  }
  container.innerHTML = projects.map(function(proj, i) {
    var tagsStr = (proj.tags || []).join(' · ');
    return '<div class="list-item">' +
      '<div class="list-item-info">' +
        '<div class="list-item-title">' + (proj.title || '无标题') + '</div>' +
        '<div class="list-item-meta">' + (tagsStr || '无标签') + (proj.link ? ' · ' + proj.link : '') + '</div>' +
      '</div>' +
      '<div class="list-item-actions">' +
        '<button onclick="editWorkshopItem(' + i + ')">编辑</button>' +
        '<button class="btn-del" onclick="deleteWorkshopItem(' + i + ')">删除</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function getWorkshopProjects() {
  var data = loadSiteData();
  return (data && data.projects) ? data.projects.slice() : [];
}

function setWorkshopProjects(projects) {
  var data = loadSiteData() || getDefaultSiteData();
  data.projects = projects;
  saveSiteData(data);
}

document.getElementById('workshopAddToggle').addEventListener('click', function() {
  workshopEditingId = null;
  document.getElementById('workshopFormTitle').textContent = '添加项目';
  document.getElementById('workshopEditId').value = '';
  document.getElementById('workshopTitle').value = '';
  document.getElementById('workshopTags').value = '';
  document.getElementById('workshopDesc').value = '';
  document.getElementById('workshopLink').value = '';
  document.getElementById('workshopLinkText').value = '';
  document.getElementById('workshopAddForm').style.display = 'block';
});

function cancelWorkshopForm() {
  document.getElementById('workshopAddForm').style.display = 'none';
  workshopEditingId = null;
}

function saveWorkshopItem() {
  var title = document.getElementById('workshopTitle').value.trim();
  if (!title) { showToast('请填写项目标题'); return; }

  var item = {
    id: document.getElementById('workshopEditId').value || genId('proj'),
    title: title,
    tags: document.getElementById('workshopTags').value.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; }),
    desc: document.getElementById('workshopDesc').value.trim(),
    link: document.getElementById('workshopLink').value.trim(),
    linkText: document.getElementById('workshopLinkText').value.trim()
  };

  var projects = getWorkshopProjects();
  var editId = document.getElementById('workshopEditId').value;
  if (editId) {
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === editId) { projects[i] = item; break; }
    }
  } else {
    projects.push(item);
  }
  setWorkshopProjects(projects);
  renderWorkshopList(projects);
  cancelWorkshopForm();
  showToast(editId ? '项目已更新' : '项目已添加');
}

function editWorkshopItem(index) {
  var projects = getWorkshopProjects();
  var item = projects[index];
  if (!item) return;
  workshopEditingId = index;
  document.getElementById('workshopFormTitle').textContent = '编辑项目';
  document.getElementById('workshopEditId').value = item.id || '';
  document.getElementById('workshopTitle').value = item.title || '';
  document.getElementById('workshopTags').value = (item.tags || []).join(', ');
  document.getElementById('workshopDesc').value = item.desc || '';
  document.getElementById('workshopLink').value = item.link || '';
  document.getElementById('workshopLinkText').value = item.linkText || '';
  document.getElementById('workshopAddForm').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteWorkshopItem(index) {
  if (!confirm('确定删除这个项目吗？')) return;
  var projects = getWorkshopProjects();
  projects.splice(index, 1);
  setWorkshopProjects(projects);
  renderWorkshopList(projects);
  showToast('项目已删除');
}

// ======= IMAGE STORAGE (IndexedDB — large capacity, no permission needed) =======
var IMG_DB = null;

function openImgDB(callback) {
  if (IMG_DB) { callback(IMG_DB); return; }
  var req = indexedDB.open('ayu-images', 1);
  req.onupgradeneeded = function(e) {
    e.target.result.createObjectStore('images');
  };
  req.onsuccess = function(e) {
    IMG_DB = e.target.result;
    callback(IMG_DB);
  };
  req.onerror = function() { callback(null); };
}

// Store image blob → return key
function storeImage(blob, callback) {
  openImgDB(function(db) {
    if (!db) { callback(null); return; }
    var key = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    var tx = db.transaction('images', 'readwrite');
    tx.objectStore('images').put(blob, key);
    tx.oncomplete = function() { callback(key); };
    tx.onerror = function() { callback(null); };
  });
}

// Load image by key → return object URL
function loadImage(key, callback) {
  openImgDB(function(db) {
    if (!db) { callback(null); return; }
    var tx = db.transaction('images', 'readonly');
    var get = tx.objectStore('images').get(key);
    get.onsuccess = function() {
      if (get.result) {
        callback(URL.createObjectURL(get.result));
      } else { callback(null); }
    };
    get.onerror = function() { callback(null); };
  });
}

// Delete image by key
function deleteImage(key) {
  openImgDB(function(db) {
    if (!db) return;
    var tx = db.transaction('images', 'readwrite');
    tx.objectStore('images').delete(key);
  });
}
var galleryTags = [];
var galleryEditingId = null;
var galleryExtraImages = [];

// Resize image to max width/height before base64 (save localStorage space)
function resizeImage(file, maxW, maxH, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      if (w <= maxW && h <= maxH) { callback(e.target.result); return; }
      var ratio = Math.min(maxW / w, maxH / h);
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function dataURLtoBlob(dataUrl) {
  var parts = dataUrl.split(',');
  var mime = parts[0].match(/:(.*?);/)[1];
  var bytes = atob(parts[1]);
  var arr = new Uint8Array(bytes.length);
  for (var i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function previewMainImage() {
  var file = document.getElementById('workImgFile').files[0];
  if (!file) return;
  resizeImage(file, 800, 800, function(dataUrl) {
    var preview = document.getElementById('imgPreview');
    preview.innerHTML = '<img src="' + dataUrl + '" alt="">';
    preview.classList.add('has-img');
    // Store in IndexedDB
    var blob = dataURLtoBlob(dataUrl);
    storeImage(blob, function(key) {
      if (key) {
        document.getElementById('workImg').value = 'imgdb:' + key;
        showToast('✅ 图片已保存');
      } else {
        showToast('⚠️ 图片存储失败');
      }
    });
  });
}

function addExtraImages() {
  var files = document.getElementById('extraImgInput').files;
  if (!files.length) return;
  var total = files.length;
  var done = 0;
  for (var i = 0; i < files.length; i++) {
    (function(file) {
      resizeImage(file, 800, 800, function(dataUrl) {
        var blob = dataURLtoBlob(dataUrl);
        storeImage(blob, function(key) {
          if (key) galleryExtraImages.push('imgdb:' + key);
          done++;
          if (done >= total) { renderExtraImages(); showToast('✅ ' + total + ' 张图片已保存'); }
        });
      });
    })(files[i]);
  }
  document.getElementById('extraImgInput').value = '';
}

function removeExtraImage(index) {
  galleryExtraImages.splice(index, 1);
  renderExtraImages();
}

function renderExtraImages() {
  var container = document.getElementById('extraImagesList');
  var html = '';
  galleryExtraImages.forEach(function(src, i) {
    var id = 'extraPrev' + i;
    html += '<div class="extra-image-item" id="' + id + '">' +
      '<button class="remove-extra" onclick="removeExtraImage(' + i + ')">✕</button>' +
    '</div>';
  });
  container.innerHTML = html;
  // Load actual images
  galleryExtraImages.forEach(function(src, i) {
    resolveImgSrc(src, function(resolved) {
      if (resolved) {
        var el = document.getElementById('extraPrev' + i);
        if (el) el.innerHTML = '<img src="' + resolved + '" alt="">' + el.innerHTML;
      }
    });
  });
}

function resolveImgSrc(src, callback) {
  if (!src || src.indexOf('imgdb:') !== 0) { callback(src); return; }
  var key = src.slice(6);
  openImgDB(function(db) {
    if (!db) { callback(''); return; }
    var tx = db.transaction('images', 'readonly');
    var get = tx.objectStore('images').get(key);
    get.onsuccess = function() {
      callback(get.result ? URL.createObjectURL(get.result) : '');
    };
    get.onerror = function() { callback(''); };
  });
}

function renderGalleryList() {
  var container = document.getElementById('workListContainer');
  var works = loadWorks();
  if (!works.length) {
    container.innerHTML = '<div class="empty-hint">还没有作品，填写上方表单添加第一个吧 🐧</div>';
    return;
  }
  container.innerHTML = works.map(function(w) {
    var thumb = w.imgMain ? '<img src="' + w.imgMain + '" alt="">' : '';
    var tagStr = (w.tags || []).join(' · ');
    return '<div class="work-item">' +
      '<div class="work-item-thumb">' + thumb + '</div>' +
      '<div class="work-item-info">' +
        '<div class="work-item-title">' + (w.title || '无标题') + '</div>' +
        '<div class="work-item-meta">' + (w.date || '') + (tagStr ? ' · ' + tagStr : '') + '</div>' +
      '</div>' +
      '<div class="work-item-actions">' +
        '<button onclick="editWork(\'' + w.id + '\')">编辑</button>' +
        '<button class="btn-del" onclick="deleteWork(\'' + w.id + '\')">删除</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

document.getElementById('tagInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    var val = this.value.trim();
    if (val && galleryTags.indexOf(val) === -1) {
      galleryTags.push(val);
      this.value = '';
      renderGalleryTags();
    }
  }
});

function renderGalleryTags() {
  var container = document.getElementById('tagContainer');
  var input = document.getElementById('tagInput');
  var badges = container.querySelectorAll('.tag-badge');
  badges.forEach(function(b) { b.remove(); });
  galleryTags.forEach(function(tag) {
    var badge = document.createElement('span');
    badge.className = 'tag-badge';
    badge.innerHTML = tag + ' <span class="tag-remove" onclick="removeGalleryTag(\'' + tag + '\')">✕</span>';
    container.insertBefore(badge, input);
  });
}

function removeGalleryTag(tag) {
  galleryTags = galleryTags.filter(function(t) { return t !== tag; });
  renderGalleryTags();
}

function resetGalleryForm() {
  galleryEditingId = null;
  galleryExtraImages = [];
  document.getElementById('galleryFormTitle').textContent = '添加新作品';
  document.getElementById('workTitle').value = '';
  document.getElementById('workDate').value = '';
  document.getElementById('workImg').value = '';
  document.getElementById('workImgFile').value = '';
  document.getElementById('workSummary').value = '';
  document.getElementById('workDesc').value = '';
  document.getElementById('extraImgInput').value = '';
  var preview = document.getElementById('imgPreview');
  preview.innerHTML = '预览';
  preview.classList.remove('has-img');
  document.getElementById('extraImagesList').innerHTML = '';
  galleryTags = [];
  renderGalleryTags();
}

function saveWork() {
  var title = document.getElementById('workTitle').value.trim();
  if (!title) { showToast('请填写作品名称'); return; }

  var work = {
    id: galleryEditingId || genId('work'),
    title: title,
    date: document.getElementById('workDate').value.trim() || '2026',
    imgMain: document.getElementById('workImg').value.trim() || 'ayu-penguin.png',
    tags: galleryTags.slice(),
    summary: document.getElementById('workSummary').value.trim(),
    desc: document.getElementById('workDesc').value.trim(),
    extra: galleryExtraImages.slice()
  };

  var works = loadWorks();
  if (galleryEditingId) {
    var idx = works.findIndex(function(w) { return w.id === galleryEditingId; });
    if (idx >= 0) works[idx] = work;
  } else {
    works.push(work);
  }
  saveWorks(works);
  resetGalleryForm();
  renderGalleryList();
  showToast(galleryEditingId ? '作品已更新' : '作品已添加');
}

function editWork(id) {
  var works = loadWorks();
  var w = works.find(function(x) { return x.id === id; });
  if (!w) return;
  galleryEditingId = id;
  document.getElementById('galleryFormTitle').textContent = '编辑作品';
  document.getElementById('workTitle').value = w.title || '';
  document.getElementById('workDate').value = w.date || '';
  document.getElementById('workImg').value = w.imgMain || '';
  // Show preview (works for both base64 and regular paths)
  var preview = document.getElementById('imgPreview');
  resolveImgSrc(w.imgMain, function(resolved) {
    if (resolved) {
      preview.innerHTML = '<img src="' + resolved + '" alt="">';
      preview.classList.add('has-img');
    } else {
      preview.innerHTML = '预览';
      preview.classList.remove('has-img');
    }
  });
  document.getElementById('workSummary').value = w.summary || '';
  document.getElementById('workDesc').value = w.desc || '';
  galleryTags = (w.tags || []).slice();
  renderGalleryTags();
  galleryExtraImages = (w.extra || []).slice();
  renderExtraImages();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteWork(id) {
  if (!confirm('确定删除这个作品吗？')) return;
  var works = loadWorks();
  works = works.filter(function(w) { return w.id !== id; });
  saveWorks(works);
  renderGalleryList();
  showToast('作品已删除');
}

// ======= TAB 5: COMPETITIONS =======
var compEditingId = null;

function renderCompList(competitions) {
  var container = document.getElementById('compList');
  if (!competitions || !competitions.length) {
    container.innerHTML = '<div class="empty-hint">还没有竞赛，点击上方按钮添加 🏆</div>';
    return;
  }
  container.innerHTML = competitions.map(function(comp, i) {
    var tagsStr = (comp.tags || []).join(' · ');
    return '<div class="list-item">' +
      '<div class="list-item-info">' +
        '<div class="list-item-title">' + (comp.title || '无标题') + '</div>' +
        '<div class="list-item-meta">' + (tagsStr || '无标签') + ' · ' + (comp.status || '') + '</div>' +
      '</div>' +
      '<div class="list-item-actions">' +
        '<button onclick="editCompItem(' + i + ')">编辑</button>' +
        '<button class="btn-del" onclick="deleteCompItem(' + i + ')">删除</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function getCompetitions() {
  var data = loadSiteData();
  return (data && data.competitions) ? data.competitions.slice() : [];
}

function setCompetitions(competitions) {
  var data = loadSiteData() || getDefaultSiteData();
  data.competitions = competitions;
  saveSiteData(data);
}

document.getElementById('compAddToggle').addEventListener('click', function() {
  compEditingId = null;
  document.getElementById('compFormTitle').textContent = '添加竞赛';
  document.getElementById('compEditId').value = '';
  document.getElementById('compTitle').value = '';
  document.getElementById('compTags').value = '';
  document.getElementById('compDesc').value = '';
  document.getElementById('compStatus').value = '';
  document.getElementById('compAddForm').style.display = 'block';
});

function cancelCompForm() {
  document.getElementById('compAddForm').style.display = 'none';
  compEditingId = null;
}

function saveCompItem() {
  var title = document.getElementById('compTitle').value.trim();
  if (!title) { showToast('请填写竞赛标题'); return; }

  var item = {
    id: document.getElementById('compEditId').value || genId('comp'),
    title: title,
    tags: document.getElementById('compTags').value.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; }),
    desc: document.getElementById('compDesc').value.trim(),
    status: document.getElementById('compStatus').value.trim()
  };

  var competitions = getCompetitions();
  var editId = document.getElementById('compEditId').value;
  if (editId) {
    for (var i = 0; i < competitions.length; i++) {
      if (competitions[i].id === editId) { competitions[i] = item; break; }
    }
  } else {
    competitions.push(item);
  }
  setCompetitions(competitions);
  renderCompList(competitions);
  cancelCompForm();
  showToast(editId ? '竞赛已更新' : '竞赛已添加');
}

function editCompItem(index) {
  var competitions = getCompetitions();
  var item = competitions[index];
  if (!item) return;
  compEditingId = index;
  document.getElementById('compFormTitle').textContent = '编辑竞赛';
  document.getElementById('compEditId').value = item.id || '';
  document.getElementById('compTitle').value = item.title || '';
  document.getElementById('compTags').value = (item.tags || []).join(', ');
  document.getElementById('compDesc').value = item.desc || '';
  document.getElementById('compStatus').value = item.status || '';
  document.getElementById('compAddForm').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteCompItem(index) {
  if (!confirm('确定删除这个竞赛吗？')) return;
  var competitions = getCompetitions();
  competitions.splice(index, 1);
  setCompetitions(competitions);
  renderCompList(competitions);
  showToast('竞赛已删除');
}

// ======= TAB 6: SOCIAL =======
var socialEditingId = null;

function renderSocialList(links) {
  var container = document.getElementById('socialList');
  if (!links || !links.length) {
    container.innerHTML = '<div class="empty-hint">还没有社交链接，点击上方按钮添加 🔗</div>';
    return;
  }
  container.innerHTML = links.map(function(link, i) {
    return '<div class="list-item">' +
      '<div class="list-item-info">' +
        '<div class="list-item-title">' + (link.icon || '🔗') + ' ' + (link.platform || '未命名') + '</div>' +
        '<div class="list-item-meta">' + (link.url || '') + (link.hint ? ' · ' + link.hint : '') + '</div>' +
      '</div>' +
      '<div class="list-item-actions">' +
        '<button onclick="editSocialItem(' + i + ')">编辑</button>' +
        '<button class="btn-del" onclick="deleteSocialItem(' + i + ')">删除</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function getSocialLinks() {
  var data = loadSiteData();
  return (data && data.socialLinks) ? data.socialLinks.slice() : [];
}

function setSocialLinks(links) {
  var data = loadSiteData() || getDefaultSiteData();
  data.socialLinks = links;
  saveSiteData(data);
}

document.getElementById('socialAddToggle').addEventListener('click', function() {
  socialEditingId = null;
  document.getElementById('socialFormTitle').textContent = '添加社交链接';
  document.getElementById('socialEditId').value = '';
  document.getElementById('socialPlatform').value = '';
  document.getElementById('socialUrl').value = '';
  document.getElementById('socialIcon').value = '';
  document.getElementById('socialHint').value = '';
  document.getElementById('socialAddForm').style.display = 'block';
});

function cancelSocialForm() {
  document.getElementById('socialAddForm').style.display = 'none';
  socialEditingId = null;
}

function saveSocialItem() {
  var platform = document.getElementById('socialPlatform').value.trim();
  var url = document.getElementById('socialUrl').value.trim();
  if (!platform || !url) { showToast('请填写平台名称和链接'); return; }

  var item = {
    id: document.getElementById('socialEditId').value || genId('social'),
    platform: platform,
    url: url,
    icon: document.getElementById('socialIcon').value.trim() || '🔗',
    hint: document.getElementById('socialHint').value.trim()
  };

  var links = getSocialLinks();
  var editId = document.getElementById('socialEditId').value;
  if (editId) {
    for (var i = 0; i < links.length; i++) {
      if (links[i].id === editId) { links[i] = item; break; }
    }
  } else {
    links.push(item);
  }
  setSocialLinks(links);
  renderSocialList(links);
  cancelSocialForm();
  showToast(editId ? '链接已更新' : '链接已添加');
}

function editSocialItem(index) {
  var links = getSocialLinks();
  var item = links[index];
  if (!item) return;
  socialEditingId = index;
  document.getElementById('socialFormTitle').textContent = '编辑社交链接';
  document.getElementById('socialEditId').value = item.id || '';
  document.getElementById('socialPlatform').value = item.platform || '';
  document.getElementById('socialUrl').value = item.url || '';
  document.getElementById('socialIcon').value = item.icon || '';
  document.getElementById('socialHint').value = item.hint || '';
  document.getElementById('socialAddForm').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteSocialItem(index) {
  if (!confirm('确定删除这个链接吗？')) return;
  var links = getSocialLinks();
  links.splice(index, 1);
  setSocialLinks(links);
  renderSocialList(links);
  showToast('链接已删除');
}

// ======= SAVE ALL =======
function saveAll() {
  // Collect site data (hero + passport) and save
  var data = collectSiteData();
  saveSiteData(data);
  // Works are already saved via saveWorks()
  showToast('✅ 全部数据已保存到浏览器');
}

// ======= EXPORT ALL =======
function exportAll() {
  var works = loadWorks();
  if (!works.length) { doExport(null, works); return; }

  // Collect all imgdb keys
  var keys = [];
  works.forEach(function(w) {
    if (w.imgMain && w.imgMain.indexOf('imgdb:') === 0) keys.push(w.imgMain);
    (w.extra || []).forEach(function(s) {
      if (s && s.indexOf('imgdb:') === 0) keys.push(s);
    });
  });
  keys = keys.filter(function(k, i, a) { return a.indexOf(k) === i; });

  if (!keys.length) { doExport(null, works); return; }

  showToast('⏳ 正在导出图片（' + keys.length + ' 张）…');

  // Load all images from IndexedDB
  openImgDB(function(db) {
    var tx = db.transaction('images', 'readonly');
    var store = tx.objectStore('images');
    var imgMap = {};
    var loaded = 0;

    keys.forEach(function(key) {
      var k = key.slice(6);
      var get = store.get(k);
      get.onsuccess = function() {
        if (get.result) imgMap[key] = get.result;
        loaded++;
        if (loaded >= keys.length) doExport(imgMap, works);
      };
      get.onerror = function() { loaded++; if (loaded >= keys.length) doExport(imgMap, works); };
    });
  });
}

function doExport(imgMap, works) {
  // Download images and build path map
  var pathMap = {};
  var dlCount = 0;
  if (imgMap) {
    Object.keys(imgMap).forEach(function(key) {
      var blob = imgMap[key];
      var filename = key.slice(6) + '.jpg';
      pathMap[key] = 'works/' + filename;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      dlCount++;
    });
  }

  // Replace imgdb: paths with file paths
  var exportWorks = JSON.parse(JSON.stringify(works));
  exportWorks.forEach(function(w) {
    if (pathMap[w.imgMain]) w.imgMain = pathMap[w.imgMain];
    if (w.extra) {
      w.extra = w.extra.map(function(s) { return pathMap[s] || s; });
    }
  });

  // Export site-data.json
  var siteData = loadSiteData() || getDefaultSiteData();
  var siteBlob = new Blob([JSON.stringify(siteData, null, 2)], { type: 'application/json' });
  var a1 = document.createElement('a');
  a1.href = URL.createObjectURL(siteBlob); a1.download = 'site-data.json'; a1.click();

  // Export data.json (with resolved paths)
  var worksBlob = new Blob([JSON.stringify(exportWorks, null, 2)], { type: 'application/json' });
  var a2 = document.createElement('a');
  a2.href = URL.createObjectURL(worksBlob); a2.download = 'data.json'; a2.click();

  var msg = '📦 已导出 site-data.json 和 data.json';
  if (dlCount) msg += ' + ' + dlCount + ' 张图片';
  showToast(msg);
  if (dlCount) {
    setTimeout(function() {
      showToast('📥 请把下载的图片放入 F:\\ayu-site\\works\\ 再部署');
    }, 2000);
  }
}

// ======= DEPLOY =======
function deployInfo() {
  var works = loadWorks();
  var keys = [];
  works.forEach(function(w) {
    if (w.imgMain && w.imgMain.indexOf('imgdb:') === 0) keys.push(w.imgMain);
    (w.extra || []).forEach(function(s) {
      if (s && s.indexOf('imgdb:') === 0) keys.push(s);
    });
  });
  keys = keys.filter(function(k, i, a) { return a.indexOf(k) === i; });

  function finish(imgMap) {
    var pathMap = {};
    var dlCount = 0;
    if (imgMap) {
      Object.keys(imgMap).forEach(function(key) {
        var blob = imgMap[key];
        var filename = key.slice(6) + '.jpg';
        pathMap[key] = 'works/' + filename;
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        dlCount++;
      });
    }
    var exportWorks = JSON.parse(JSON.stringify(works));
    exportWorks.forEach(function(w) {
      if (pathMap[w.imgMain]) w.imgMain = pathMap[w.imgMain];
      if (w.extra) w.extra = w.extra.map(function(s) { return pathMap[s] || s; });
    });

    var siteData = loadSiteData() || getDefaultSiteData();
    var siteBlob = new Blob([JSON.stringify(siteData, null, 2)], { type: 'application/json' });
    var a1 = document.createElement('a');
    a1.href = URL.createObjectURL(siteBlob); a1.download = 'site-data.json'; a1.click();
    var worksBlob = new Blob([JSON.stringify(exportWorks, null, 2)], { type: 'application/json' });
    var a2 = document.createElement('a');
    a2.href = URL.createObjectURL(worksBlob); a2.download = 'data.json'; a2.click();

    showToast('📦 已导出数据' + (dlCount ? ' + ' + dlCount + ' 张图片' : ''));

    var steps = '1. 将下载的 site-data.json 和 data.json 覆盖到 F:\\ayu-site\\ 目录';
    if (dlCount) steps += '\n2. 将下载的图片放入 F:\\ayu-site\\works\\ 文件夹';
    steps += '\n' + (dlCount ? '3' : '2') + '. 回到 Cola 说 「deploy」即可部署';

    setTimeout(function() { alert('🚀 部署准备\n\n' + steps + '\n\n替换完成后刷新线上页面即可看到更新 ✨'); }, 500);
  }

  if (!keys.length) { finish(null); return; }

  showToast('⏳ 正在导出图片…');
  openImgDB(function(db) {
    var tx = db.transaction('images', 'readonly');
    var store = tx.objectStore('images');
    var imgMap = {};
    var loaded = 0;
    keys.forEach(function(key) {
      var k = key.slice(6);
      var get = store.get(k);
      get.onsuccess = function() { if (get.result) imgMap[key] = get.result; loaded++; if (loaded >= keys.length) finish(imgMap); };
      get.onerror = function() { loaded++; if (loaded >= keys.length) finish(imgMap); };
    });
  });
}

// ======= INIT =======
(function initAdmin() {
  // Load site data
  var siteData = loadSiteData();
  if (siteData) {
    populateSiteForms(siteData);
  } else {
    seedSiteData(function(data) {
      populateSiteForms(data);
    });
  }

  // Load works
  var works = loadWorks();
  if (works.length) {
    renderGalleryList();
    renderGalleryTags();
  } else {
    seedWorks(function(data) {
      renderGalleryList();
      renderGalleryTags();
    });
  }
})();