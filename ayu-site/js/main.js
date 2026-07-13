// ╔══════════════════════════════════════════════════════════╗
// ║          阿鱼小岛 · main.js                              ║
// ║          入口对话 / 音效 / 护照 / 画廊 / 加载动画          ║
// ╚══════════════════════════════════════════════════════════╝


// ============================================================
//  1. 入口对话 & 打字机效果
// ============================================================

const overlay = document.getElementById('entryOverlay');
const penguin = document.getElementById('entryPenguin');
const greeting = document.getElementById('greeting');

var greetings = [
  '欢迎来到<strong>阿鱼的小岛</strong>！你想去哪里看看？',
  '今天天气真好呀！要逛逛吗？',
  '嘿！<strong>好久不见</strong>～想去哪儿？',
  '阿鱼在岛上留了些东西，要看看吗？'
];

var greetingFull = '欢迎来到<strong>阿鱼的小岛</strong>！你想去哪里看看？';
let typewriterTimer = null;

// --- 打字机核心 ---

function countText(root) {
  let n = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) n += walker.currentNode.textContent.length;
  return n;
}

function truncateTextNodes(root, limit) {
  let remaining = limit;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (remaining <= 0) { node.textContent = ''; continue; }
    const len = node.textContent.length;
    if (len <= remaining) { remaining -= len; continue; }
    node.textContent = node.textContent.slice(0, remaining);
    remaining = 0;
  }
}

function renderTruncated(sourceHTML, count) {
  const tmpl = document.createElement('div');
  tmpl.innerHTML = sourceHTML;
  truncateTextNodes(tmpl, count);
  return tmpl.innerHTML;
}

function typewrite(html, el, speed) {
  speed = speed || 90;
  if (typewriterTimer) clearTimeout(typewriterTimer);
  const total = (function() {
    const d = document.createElement('div'); d.innerHTML = html;
    return countText(d);
  })();
  let i = 0;
  el.innerHTML = '';
  function tick() {
    if (i < total) {
      i++;
      el.innerHTML = renderTruncated(html, i);
      const tmp = document.createElement('div'); tmp.innerHTML = renderTruncated(html, i);
      const txt = tmp.textContent || '';
      if (txt) animalese(txt[txt.length - 1]);
      typewriterTimer = setTimeout(tick, speed);
    }
  }
  tick();
}

// --- 入口交互 ---

penguin.addEventListener('click', function() {
  var ctx = getCtx();
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e) {} }
  if (!animaleseLoaded && !animaleseLoading) loadAnimalese();
  if (greetings.length > 0) greetingFull = greetings[Math.floor(Math.random() * greetings.length)];
  penguin.style.animation = 'none';
  penguin.offsetHeight;
  penguin.style.animation = 'float 3s ease-in-out infinite';
  chime(880, 0.12);
  typewrite(greetingFull, greeting, 90);
});

document.querySelectorAll('.dodo-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var target = btn.dataset.target;
    overlay.classList.add('dismissed');
    chime(660, 0.18);
    if (target) {
      var el = document.getElementById(target);
      if (el) setTimeout(function() { el.scrollIntoView({ behavior: 'smooth' }); }, 400);
    }
  });
});

overlay.addEventListener('click', function(e) {
  if (e.target === overlay) overlay.classList.add('dismissed');
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') overlay.classList.add('dismissed');
});


// ============================================================
//  2. 音效系统 (Web Audio)
// ============================================================

var audioCtx = null;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function chime(freq, duration) {
  freq = freq || 800;
  duration = duration || 0.15;
  try {
    var ctx = getCtx();
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e) {} }
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + duration);
  } catch(e) {}
}


// ============================================================
//  3. Animalese 动物语音效
// ============================================================

var ANIMALESE_BUFFERS = {};
var animaleseLoaded = false;
var animaleseLoading = false;

function loadAnimalese() {
  if (animaleseLoaded || animaleseLoading) return;
  animaleseLoading = true;
  var ctx = getCtx();
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e) {} }
  var letters = 'abcdefghijklmnopqrstuvwxyz';
  var base = 'animalese/';
  var loaded = 0;
  for (var i = 0; i < letters.length; i++) {
    var l = letters[i];
    var xhr = new XMLHttpRequest();
    xhr.open('GET', base + l + '.aac', true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = (function(letter) {
      return function() {
        if (xhr.status === 200 || xhr.status === 0) {
          ctx.decodeAudioData(xhr.response, function(audio) {
            ANIMALESE_BUFFERS[letter] = audio;
            loaded++;
            if (loaded >= letters.length) animaleseLoaded = true;
          }, function() {});
        }
      };
    })(l);
    xhr.onerror = function() {};
    xhr.send();
  }
}

var animaleseGainNode = null;
var animalesePrevSrc = null;

function animalese(char) {
  try {
    var ctx = getCtx();
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e) {} }
    if (!animaleseLoaded && !animaleseLoading) loadAnimalese();
    var now = ctx.currentTime;

    // 先把增益拉到 0，掐断上一个声音，避免叠音
    if (!animaleseGainNode) {
      animaleseGainNode = ctx.createGain();
      animaleseGainNode.connect(ctx.destination);
    }
    animaleseGainNode.gain.cancelScheduledValues(now);
    animaleseGainNode.gain.setValueAtTime(0, now);

    // 停掉上一个音源
    if (animalesePrevSrc) {
      try { animalesePrevSrc.stop(now); } catch(_) {}
      animalesePrevSrc = null;
    }

    var lower = char.toLowerCase();
    var buffer = ANIMALESE_BUFFERS[lower];
    if (!buffer) {
      var keys = Object.keys(ANIMALESE_BUFFERS);
      if (keys.length) {
        buffer = ANIMALESE_BUFFERS[keys[Math.floor(Math.random() * keys.length)]];
      } else {
        chime(600 + Math.random() * 400, 0.08);
        return;
      }
    }

    var src = ctx.createBufferSource();
    src.buffer = buffer;
    src.detune.value = (Math.random() * 200 - 100);
    src.connect(animaleseGainNode);
    // 比 stop 晚一丁点启动，避免同采样点叠音
    src.start(now + 0.003);
    // 快速淡入，消除 click/pop
    animaleseGainNode.gain.setValueAtTime(0, now + 0.003);
    animaleseGainNode.gain.linearRampToValueAtTime(0.25, now + 0.012);
    animalesePrevSrc = src;
  } catch(e) {}
}


// ============================================================
//  4. 护照留言板
// ============================================================

var STORAGE_KEY = 'ayu-passports-v1';

var VILLAGERS = [
  { id:'dog',     img:'avatars/dog.png' },
  { id:'cat1',    img:'avatars/cat1.png' },
  { id:'rabbit',  img:'avatars/rabbit.png' },
  { id:'bear',    img:'avatars/bear.png' },
  { id:'frog',    img:'avatars/frog.png' },
  { id:'penguin', img:'avatars/penguin.png' },
  { id:'sheep',   img:'avatars/sheep.png' },
  { id:'duck',    img:'avatars/duck.png' },
  { id:'cat2',    img:'avatars/cat2.png' },
  { id:'squirrel',img:'avatars/squirrel.png' },
  { id:'hamster', img:'avatars/hamster.png' },
  { id:'bird',    img:'avatars/bird.png' }
];

var selectedVillager = VILLAGERS[0];

var emojiGrid = document.getElementById('pfEmojiGrid');
VILLAGERS.forEach(function(v, i) {
  var btn = document.createElement('button');
  btn.className = 'pf-villager-btn';
  btn.innerHTML = '<img src="' + v.img + '" alt="' + v.id + '" class="pf-v-thumb">';
  btn.addEventListener('click', function() {
    selectedVillager = v;
    updateAvatarPreview(v);
    emojiGrid.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    chime(1040, 0.08);
  });
  if (i === 0) btn.classList.add('active');
  emojiGrid.appendChild(btn);
});

function updateAvatarPreview(v) {
  var preview = document.getElementById('pfAvatarPreview');
  preview.innerHTML = '<img src="' + v.img + '" alt="' + v.id + '" class="pf-preview-img">';
}

function loadPassports() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch(e) { return []; }
}

function savePassports(passports) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(passports));
}

function esc(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function renderWall() {
  var wall = document.getElementById('passportWall');
  var passports = loadPassports();
  if (!passports.length) {
    wall.innerHTML = '<p style="text-align:center;color:var(--muted);grid-column:1/-1;padding:40px">还没有岛民护照…来做第一个留言的人吧 🐧</p>';
    return;
  }
  wall.innerHTML = passports.map(function(p, i) {
    return '<div class="visitor-passport">' +
      '<div class="vp-avatar"><img src="' + esc(p.img) + '" alt="" class="vp-img"></div>' +
      '<div class="vp-info">' +
        '<div class="vp-name">' + esc(p.name) + '</div>' +
        '<div class="vp-time">' + p.time + '</div>' +
        '<div class="vp-message">' + esc(p.message) + '</div>' +
      '</div>' +
      '<button class="vp-delete" onclick="deletePassport(' + i + ')" title="删除">✕</button>' +
    '</div>';
  }).reverse().join('');
}

window.deletePassport = function(index) {
  if (!confirm('确定要删除这条护照吗？')) return;
  var passports = loadPassports();
  var realIndex = passports.length - 1 - index;
  passports.splice(realIndex, 1);
  savePassports(passports);
  renderWall();
  chime(440, 0.2);
};

document.getElementById('pfSubmit').addEventListener('click', function() {
  var name = document.getElementById('pfName').value.trim();
  var message = document.getElementById('pfMessage').value.trim();
  if (!name) { document.getElementById('pfName').focus(); return; }
  if (!message) { document.getElementById('pfMessage').focus(); return; }

  var now = new Date();
  var time = now.getFullYear() + '.' +
    String(now.getMonth()+1).padStart(2,'0') + '.' +
    String(now.getDate()).padStart(2,'0') + ' ' +
    String(now.getHours()).padStart(2,'0') + ':' +
    String(now.getMinutes()).padStart(2,'0');

  var passports = loadPassports();
  passports.push({ name: name, message: message, img: selectedVillager.img, time: time });
  savePassports(passports);
  renderWall();

  document.getElementById('pfName').value = '';
  document.getElementById('pfMessage').value = '';
  selectedVillager = VILLAGERS[0];
  updateAvatarPreview(VILLAGERS[0]);
  emojiGrid.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
  emojiGrid.querySelector('button').classList.add('active');

  chime(660, 0.2);
  setTimeout(function() { chime(880, 0.15); }, 150);
});

// 护照输入时播放 Animalese
['pfName','pfMessage'].forEach(function(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('keydown', function(e) {
    if (e.key.length === 1) animalese(e.key);
  });
});

// 初始化
updateAvatarPreview(VILLAGERS[0]);
renderWall();


// ============================================================
//  5. 创作画廊
// ============================================================

// --- IndexedDB 图片存储 (admin 后台用) ---

var IMG_DB = null;

function openImgDB(cb) {
  if (IMG_DB) { cb(IMG_DB); return; }
  var req = indexedDB.open('ayu-images', 1);
  req.onupgradeneeded = function(e) { e.target.result.createObjectStore('images'); };
  req.onsuccess = function(e) { IMG_DB = e.target.result; cb(IMG_DB); };
  req.onerror = function() { cb(null); };
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

// --- 从 data.json 加载作品 ---
// 内嵌数据作为兜底，避免网络请求失败时画廊为空

var EMBEDDED_WORKS = [
  {
    "id": "work-1783856077057-572",
    "title": "双子星·刺桐双子星",
    "date": "2025.10",
    "imgMain": "works/image (14)_thumb.jpg",
    "tags": ["非遗", "IP"],
    "summary": "",
    "desc": "",
    "extra": ["works/双子星1_extra.jpg", "works/双子星2_extra.jpg", "works/双子星3_extra.jpg"]
  },
  {
    "id": "work-1783908155067-silk",
    "title": "丝路远航",
    "date": "2025.10",
    "imgMain": "works/silk-voyage_thumb.jpg",
    "tags": ["插画", "非遗", "IP"],
    "summary": "\"丝路远航\"是融合福建深厚海洋文化与现代创意的IP形象。两位角色云澜与远帆分别代表传纺的沉思与当代的创新——云澜如古瓷般精致内敛，承载历史的厚重；远帆似扬帆般热烈开放，连释文化的生命力。",
    "desc": "",
    "extra": ["works/silk-voyage-1.jpg", "works/silk-voyage-2.jpg", "works/silk-voyage-3.jpg"]
  }
];

function loadGalleryFromJSON(callback) {
  // 先尝试 fetch data.json，失败则用内嵌数据兜底
  fetch('data.json?v=c491c97')
    .then(function(res) {
      if (!res.ok) throw new Error('fetch failed');
      return res.json();
    })
    .then(function(data) {
      if (data && data.length) { callback(data); return; }
      throw new Error('empty data');
    })
    .catch(function() {
      // 网络请求失败 → 用内嵌数据
      callback(EMBEDDED_WORKS);
    });
}

// --- 渲染画廊卡片 ---

var PLACEHOLDER_CARD = '<div class="memo-card">' +
  '<div class="memo-img memo-img-empty"><span>📸</span></div>' +
  '<div class="memo-body">' +
    '<h3>更多创作中…</h3>' +
    '<p>新的插画和设计作品正在路上。</p>' +
    '<div class="memo-footer">' +
      '<span class="memo-date">…</span>' +
      '<button class="memo-detail-btn" disabled>敬请期待</button>' +
    '</div>' +
  '</div>' +
'</div>';

function renderGallery(works) {
  var track = document.getElementById('galleryTrack');
  if (!track) return;

  // 构建作品详情用的 map
  if (window._ayuBuildWorksMap) window._ayuBuildWorksMap(works);

  if (!works.length) {
    track.innerHTML = PLACEHOLDER_CARD;
    return;
  }

  var html = '';
  works.forEach(function(w, idx) {
    html += '<div class="memo-card" data-work-id="' + w.id + '">' +
      '<div class="memo-img" id="memoImg' + idx + '"><span>📸</span></div>' +
      '<div class="memo-body">' +
        '<h3>' + (w.title || '') + '</h3>' +
        '<p>' + (w.summary || '') + '</p>' +
        '<div class="memo-footer">' +
          '<span class="memo-date">' + (w.date || '') + '</span>' +
          '<button class="memo-detail-btn">作品详情 ▸</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  });

  // 末尾永远挂一个"更多创作中"占位
  html += PLACEHOLDER_CARD;

  track.innerHTML = html;

  // 异步加载封面图
  works.forEach(function(w, idx) {
    resolveImgSrc(w.imgMain, function(src) {
      if (src) {
        var el = document.getElementById('memoImg' + idx);
        if (el) el.innerHTML = '<img src="' + src + '" alt="' + (w.title || '') + '">';
      }
    });
  });
}

// --- 初始化画廊 ---
(function initGallery() {
  // 确保 DOM 就绪后再加载
  function boot() {
    loadGalleryFromJSON(function(data) {
      renderGallery(data);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

// --- 画廊左右箭头滚动 ---
(function() {
  var track = document.getElementById('galleryTrack');
  var leftBtn = document.querySelector('.gallery-arrow-left');
  var rightBtn = document.querySelector('.gallery-arrow-right');
  if (!track || !leftBtn || !rightBtn) return;
  var scrollAmount = 248;
  leftBtn.addEventListener('click', function() { track.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); });
  rightBtn.addEventListener('click', function() { track.scrollBy({ left: scrollAmount, behavior: 'smooth' }); });
  document.addEventListener('keydown', function(e) {
    var rect = track.getBoundingClientRect();
    var inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); track.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); }
    if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: scrollAmount, behavior: 'smooth' }); }
  });
})();


// ============================================================
//  6. 作品详情弹窗
// ============================================================

(function() {
  var overlay = document.getElementById('workDetailOverlay');
  if (!overlay) return;

  window._ayuWorksMap = {};

  function buildMap(data) {
    window._ayuWorksMap = {};
    data.forEach(function(w) { window._ayuWorksMap[w.id] = w; });
  }

  function open(id) {
    var w = window._ayuWorksMap[id]; if (!w) return;
    document.getElementById('spTitle').textContent = w.title;
    document.getElementById('spDate').textContent = w.date;
    document.getElementById('spTags').innerHTML = (w.tags || []).map(function(t) {
      return '<span class="card-tag">' + t + '</span>';
    }).join('');
    resolveImgSrc(w.imgMain, function(src) {
      document.getElementById('spHeroImg').src = src || '';
    });
    document.getElementById('spDesc').innerHTML = w.desc || '';
    var extra = document.getElementById('spExtra');
    extra.innerHTML = '';
    (w.extra || []).forEach(function(src) {
      resolveImgSrc(src, function(resolved) {
        if (resolved) extra.innerHTML += '<img src="' + resolved + '" alt="">';
      });
    });
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('galleryTrack').addEventListener('click', function(e) {
    var btn = e.target.closest('.memo-detail-btn');
    if (!btn || btn.disabled) return;
    var card = btn.closest('.memo-card');
    if (!card) return;
    var id = card.dataset.workId;
    if (id) open(id);
  });

  document.getElementById('workDetailBack').addEventListener('click', close);
  document.getElementById('workDetailBack2').addEventListener('click', close);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') close(); });

  window._ayuBuildWorksMap = buildMap;
})();


// ============================================================
//  7. 点赞按钮
// ============================================================

var likeCount = 0;
var liked = false;
function toggleLike() {
  var btn = document.getElementById('spLikeBtn');
  var count = document.getElementById('likeCount');
  var heart = btn.querySelector('.like-heart');
  liked = !liked;
  if (liked) {
    likeCount++;
    btn.classList.add('liked');
    heart.textContent = '💗';
    chime(880, 0.15);
  } else {
    likeCount = Math.max(0, likeCount - 1);
    btn.classList.remove('liked');
    heart.textContent = '🤍';
  }
  count.textContent = likeCount;
}


// ============================================================
//  8. 加载动画 (Splash)
// ============================================================

(function() {
  var splash = document.getElementById('loadingSplash');
  var fill = document.getElementById('loadingFill');
  if (!splash) return;
  var dismissed = false;

  function startProgress() {
    var pct = 0;
    var interval = setInterval(function() {
      pct += 2;
      if (pct >= 100) { pct = 100; clearInterval(interval); }
      if (fill) fill.style.width = pct + '%';
    }, 40);
  }
  startProgress();

  function dismiss() {
    if (dismissed || !splash.parentNode) return;
    dismissed = true;
    if (fill) fill.style.width = '100%';
    splash.classList.add('reveal');
    loadAnimalese();
    setTimeout(function() { typewrite(greetingFull, greeting, 90); }, 300);
    setTimeout(function() { if (splash.parentNode) splash.remove(); }, 700);
  }

  if (document.readyState === 'complete') {
    setTimeout(dismiss, 2000);
  } else {
    window.addEventListener('load', function() { setTimeout(dismiss, 2000); });
  }

  setTimeout(function() { if (!dismissed) dismiss(); }, 8000);
})();
