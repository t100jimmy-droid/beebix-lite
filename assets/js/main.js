/* ═══════════════════════════════════════════════════════════
   BeeBix Landing — 互動與動效 v2
   零依賴、純原生。所有動畫只動 transform / opacity / clip-path。
   捲動事件統一走單一 rAF 迴圈，避免多個 listener 互相搶幀。
   ═══════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE  = matchMedia('(pointer: coarse)').matches;
const ARW = '<i class="card-arw"></i>';

/* ═════ 單一捲動迴圈：所有需要逐幀更新的東西掛在這 ═════ */
const onFrame = [];
let ticking = false, lastY = scrollY, velocity = 0;
const tick = () => {
  ticking = false;
  const y = scrollY;
  velocity = lerp(velocity, y - lastY, .25);
  lastY = y;
  for (const fn of onFrame) fn(y, velocity);
};
addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(tick); }
}, { passive:true });
// 速度需要持續衰減，否則停止捲動後殘留
setInterval(() => { if (Math.abs(velocity) > .1) { velocity *= .85; tick(); } }, 60);

let relabelCells = () => {};   // 由 cellGrid() 指派
let arcGoTo   = () => {};      // 由 arc() 指派：把第 i 張卡轉到正中央
let offerShow = () => {};      // 由 offer() 指派：切到第 i 個方案

/* ═════ 可重建區塊的清理登記 ═════
   切語系會重跑 arc()/soon()，舊的計時器／監聽器／onFrame 必須先收掉，否則每切一次疊一組。 */
const disposers = {};
const dispose  = k => { (disposers[k] || []).forEach(fn => fn()); disposers[k] = []; };
const onDispose= (k, fn) => { (disposers[k] = disposers[k] || []).push(fn); };
const frame    = (k, fn) => { onFrame.push(fn);
  onDispose(k, () => { const i = onFrame.indexOf(fn); if (i > -1) onFrame.splice(i, 1); }); };
const listen   = (k, tgt, ev, fn, opt) => { tgt.addEventListener(ev, fn, opt);
  onDispose(k, () => tgt.removeEventListener(ev, fn, opt)); };
const every    = (k, ms, fn) => { const id = setInterval(fn, ms); onDispose(k, () => clearInterval(id)); };

/* ═════ 0 · 多語系 ═════ */
const STORE_KEY = 'beebix-lang';
let LANG = 'en';

// 找不到 key 就原字串回傳，方便漸進導入
const t = k => (I18N[k] && I18N[k][LANG]) || (I18N[k] && I18N[k].en) || k;

const pickInitialLang = () => {
  try { const saved = localStorage.getItem(STORE_KEY);
        if (saved && LANGS.some(l => l.code === saved)) return saved; } catch(e){}
  const nav = (navigator.language || 'en').toLowerCase();
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('th')) return 'th';
  return 'en';
};

const applyI18n = () => {
  $$('[data-i18n]').forEach(el => {
    const v = t(el.dataset.i18n);
    if (el.textContent !== v) el.textContent = v;
  });
  const meta = LANGS.find(l => l.code === LANG);
  document.documentElement.lang = meta ? meta.htmlLang : LANG;
  document.documentElement.dataset.lang = LANG;
  const cur = $('.lang-cur');
  if (cur) cur.textContent = meta ? meta.short : LANG.toUpperCase();
  $$('.lang-menu button').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.lang === LANG)));
  $$('.nav-lang-btns button').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
  const tt = $('.to-top'); if (tt) tt.setAttribute('aria-label', t('ui.toTop'));
  const bg = $('.burger');  if (bg) bg.setAttribute('aria-label', t('ui.menu'));
  const cx = $('.cm-x');    if (cx) cx.setAttribute('aria-label', t('cm.close'));
  const hint = $('.drag-hint'); if (hint) hint.textContent = t(COARSE ? 'ui.swipe' : 'ui.drag');
};

// 切換語系：先更新靜態文字，再重建由 JS 產生的區塊
let rebuilders = [];
const setLang = code => {
  if (code === LANG) return;
  LANG = code;
  try { localStorage.setItem(STORE_KEY, code); } catch(e){}
  const root = document.documentElement;
  const swap = () => {
    applyI18n();
    rebuilders.forEach(fn => fn());
    applyI18n();
    // 換完把視窗內的大標重播一次，新語言的字才是「被拉出來」而不是硬換
    if (!REDUCED) requestAnimationFrame(() => {
      root.classList.remove('lang-swap');
      $$('.rv-line.in').forEach(l => {
        const r = l.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        l.classList.remove('in'); void l.offsetWidth;
        setTimeout(() => l.classList.add('in'), 40);
      });
    });
  };
  if (REDUCED) return swap();
  root.classList.add('lang-swap');
  setTimeout(swap, 170);
};

function langSwitcher(){
  const wrap = $('.lang-wrap'); if (!wrap) return;
  const btn = $('.lang', wrap), menu = $('.lang-menu', wrap);
  menu.innerHTML = LANGS.map(l =>
    `<button type="button" role="option" data-lang="${l.code}"
             aria-selected="${l.code===LANG}">${l.label}</button>`).join('');
  const close = () => { wrap.classList.remove('open'); btn.setAttribute('aria-expanded','false'); };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = wrap.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', e => {
    const b = e.target.closest('button[data-lang]');
    if (!b) return;
    setLang(b.dataset.lang); close();
  });
  addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  /* ≤1024px 時 .lang 被 display:none，手機使用者完全找不到語言切換。
     在漢堡抽屜底部補一列，跟桌機下拉共用同一份 LANGS 與 setLang。 */
  const row = $('.nav-lang-btns');
  if (row){
    const paint = () => {
      row.innerHTML = LANGS.map(l =>
        `<button type="button" data-lang="${l.code}" lang="${l.htmlLang}"
                 aria-pressed="${l.code === LANG}">${l.short}</button>`).join('');
    };
    paint();
    row.addEventListener('click', e => {
      const b = e.target.closest('button[data-lang]');
      if (!b) return;
      setLang(b.dataset.lang);
      paint();
    });
    langSwitcher.repaint = paint;
  }
}

/* ═════ 1 · 導覽列（隱藏／展開／scrollspy）═════ */
function nav(){
  const h = $('#header');
  let last = 0, dir = 0, acc = 0, hidden = false, backT = 0;
  /* 原本用 `y > last + 2` 判斷方向，但速度衰減用的 60ms tick 會在 y===last 時觸發，
     條件立刻變假 → 標頭反覆收起又彈回。改成累積位移的方向狀態機，加遲滯。 */
  onFrame.push(y => {
    h.classList.toggle('is-scrolled', y > 40);
    const d = y - last; last = y;
    if (d === 0 || document.body.classList.contains('nav-open')) return;
    if (Math.sign(d) !== dir){ dir = Math.sign(d); acc = 0; }
    acc += Math.abs(d);
    if (dir > 0 && acc > 48 && y > 240 && !hidden){ hidden = true; h.classList.add('is-hidden'); }
    else if (((dir < 0 && acc > 24) || y <= 120) && hidden){
      hidden = false; h.classList.remove('is-hidden'); h.classList.add('is-back');
      clearTimeout(backT); backT = setTimeout(() => h.classList.remove('is-back'), 700);
    }
  });

  /* 抽屜打開要鎖住背景捲動，否則選單會浮在一直跑的內容上面 */
  let lockY = 0;
  const setNav = open => {
    const was = document.body.classList.contains('nav-open');
    if (open === was) return;
    if (open){
      lockY = scrollY;
      document.body.classList.add('nav-open');
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lockY}px`;
      document.body.style.width = '100%';
    } else {
      document.body.classList.remove('nav-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      scrollTo(0, lockY);
    }
    $('.burger').setAttribute('aria-expanded', String(open));
  };
  // 遮罩層：點它關選單，也讓抽屜後面的內容確實被壓暗
  const scrim = document.createElement('div');
  scrim.className = 'nav-scrim';
  scrim.addEventListener('click', () => setNav(false));
  document.body.appendChild(scrim);
  const burger = $('.burger');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-controls', 'navLinks');
  burger.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')){ setNav(false); burger.focus(); } });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => setNav(false)));

  /* 原本桌機直接 return，只靠 CSS :hover 開下拉 → 鍵盤使用者永遠到不了 7 個子連結。
     現在桌機也能用 Enter/Space 開合，開著時才把子項放進焦點順序。 */
  const menus = $$('.has-menu');
  const setMenu = (li, open) => {
    li.classList.toggle('open', open);
    $('button', li).setAttribute('aria-expanded', String(open));
    $$('.submenu a', li).forEach(a => a.tabIndex = open ? 0 : -1);
  };
  menus.forEach(li => {
    const b = $('button', li);
    setMenu(li, false);
    b.addEventListener('click', e => {
      e.stopPropagation();
      const open = b.getAttribute('aria-expanded') === 'true';
      menus.forEach(o => { if (o !== li) setMenu(o, false); });
      setMenu(li, !open);
    });
    // 滑鼠移開就收起，但別把鍵盤開的那個收掉
    li.addEventListener('pointerleave', () => { if (!li.contains(document.activeElement)) setMenu(li, false); });
    li.addEventListener('focusout', () => setTimeout(() => {
      if (!li.contains(document.activeElement)) setMenu(li, false);
    }, 0));
  });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = menus.find(li => li.classList.contains('open'));
    if (open){ setMenu(open, false); $('button', open).focus(); }
  });
  document.addEventListener('click', e => {
    if (e.target.closest('.has-menu')) return;
    menus.forEach(li => setMenu(li, false));
  });

  const HEADER_GAP = 96;                       // 固定導覽列高度 + 呼吸空間
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id === '#'){
      e.preventDefault();
      if (a.dataset.nolink != null){            // 明確告知「尚未開放」，而不是點了沒事
        a.classList.remove('is-soon'); void a.offsetWidth; a.classList.add('is-soon');
        a.setAttribute('data-soon', t('ui.soon'));
        setTimeout(() => a.classList.remove('is-soon'), 2200);
      }
      return;
    }
    const target = $(id);          // 不能叫 t：會遮蔽模組層的翻譯函式 t()
    if (!target) return;
    e.preventDefault();
    scrollTo({ top: target.getBoundingClientRect().top + scrollY - HEADER_GAP, behavior: REDUCED ? 'auto' : 'smooth' });
    if (location.hash !== id) history.pushState(null, '', id);   // 讓上一頁／分享網址有意義
    // 深連結：捲到區塊後，把對應的卡片／方案帶到前面
    if (a.dataset.arc   !== undefined) arcGoTo(+a.dataset.arc);
    if (a.dataset.offer !== undefined) offerShow(+a.dataset.offer);
  });
  // 用上一頁／下一頁回到某個 hash 時也對齊到導覽列下方
  addEventListener('popstate', () => {
    const h = location.hash && $(location.hash);
    if (h) scrollTo({ top: h.getBoundingClientRect().top + scrollY - HEADER_GAP, behavior:'auto' });
  });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.body.classList.remove('nav-open');
    $$('.has-menu.open').forEach(li => { li.classList.remove('open'); $('button', li).setAttribute('aria-expanded', 'false'); });
  });
  addEventListener('click', e => {
    if (!e.target.closest('.has-menu')) $$('.has-menu.open').forEach(li => {
      li.classList.remove('open'); $('button', li).setAttribute('aria-expanded', 'false'); });
  });

  /* scrollspy：標示目前所在區塊 */
  const links = $$('.nav-links a[href^="#"]');
  const sections = $$('main > section[id]');
  const parents  = $$('.nav-links .has-menu > button');
  /* 單一滑動指示器：目前區塊由一顆六角形滑過去標記，取代每個連結各自的底線硬跳 */
  const list = $('.nav-links'); let ind = null;
  if (list){ ind = document.createElement('i'); ind.className = 'nav-ind'; list.appendChild(ind); }
  const moveInd = el => {
    if (!ind) return;
    const top = el && (el.closest('.has-menu') || el);
    if (!top || !list.contains(top)){ ind.style.opacity = '0'; return; }
    const r = top.getBoundingClientRect(), lr = list.getBoundingClientRect();
    ind.style.opacity = '1';
    ind.style.transform = `translateX(${r.left - lr.left + r.width / 2 - 5}px)`;
  };
  let curEl = null;
  /* 每幀讀 7 個區塊的 rect 只是為了知道位置；位置只有版面變動時才會變 → 改成快取 */
  let tops = [];
  const measureTops = () => { tops = sections.map(s => s.getBoundingClientRect().top + scrollY); };
  addEventListener('resize', measureTops, { passive:true });
  addEventListener('load', measureTops, { passive:true });
  requestAnimationFrame(measureTops);
  setTimeout(measureTops, 1400);                 // 圖片載入後版面高度才穩定
  if (sections.length) onFrame.push(y => {
    const mid = y + innerHeight * .35;
    let sec = null;
    for (let i = 0; i < sections.length; i++){ if (tops[i] <= mid) sec = sections[i]; }
    const id = sec ? '#' + sec.id : null;
    const hit = id ? links.find(a => a.getAttribute('href') === id) : null;
    links.forEach(a => a.classList.toggle('current', a === hit));
    // 子選單裡的連結命中時，點亮它的父按鈕（Games / Discover）
    parents.forEach(b => b.classList.toggle('current', !!hit && b.parentElement.contains(hit)));
    if (hit !== curEl){ curEl = hit; moveInd(hit); }
  });
  addEventListener('resize', () => moveInd(curEl), { passive:true });
}

/* ═════ 2 · 進場：區塊淡入 + 標題逐行遮罩揭示 ═════ */
function reveals(){
  /* 顯示層級的大標，逐行用 clip-path 揭開 */
  const LINE_SEL = '.ghost .gl, .split-title span, .split-title em, .cta-title span, .hero-title span';
  $$(LINE_SEL).forEach(el => el.classList.add('rv-line'));

  /* 依區塊給序號 → CSS 用 --rd 錯開，區塊內才有節奏而不是同一拍全亮 */
  $$('main > section, .site-footer').forEach(sec =>
    $$('[data-reveal]', sec).forEach((el, i) => el.style.setProperty('--rd', Math.min(i, 7) * 70 + 'ms')));

  /* 捲得快就把揭示時間縮短，捲得慢就慢慢揭。
     ⚠ 這個值一定要寫在「即將進場的那一個元素」上。
     早期版本寫在 documentElement 當繼承變數，結果每改一次就讓整份文件
     （含首屏 418 個六角格）重算樣式：實測慢幀 42%、p50 25ms；
     改成逐元素之後回到 0% / 8ms。 */
  const play = el => {
    if (el.classList.contains('in')) return;
    if (!REDUCED){
      const k = clamp(1 - Math.abs(velocity) / 90, .45, 1);
      el.style.transitionDuration = k < .99 ? (0.8 * k).toFixed(2) + 's' : '';
    }
    const lines = $$('.rv-line', el);
    lines.forEach((l, i) => setTimeout(() => l.classList.add('in'), REDUCED ? 0 : i * 110));
    el.classList.add('in');
  };
  const reset = el => { el.classList.remove('in'); $$('.rv-line', el).forEach(l => l.classList.remove('in')); };

  /* #hero 的元素由 playHero() 全權掌控時序，不能讓這裡搶先點亮 */
  const owned = el => !REDUCED && el.closest('#hero');
  const pending = new Set();

  const io = new IntersectionObserver(es => es.forEach(e => {
    const el = e.target;
    if (e.isIntersecting){
      // 點導覽跳區時會飛越好幾個區塊，半路點亮等於沒人看到 → 記下來等停穩再播
      if (!REDUCED && Math.abs(velocity) > 60){ pending.add(el); return; }
      pending.delete(el); play(el);
    } else if (e.boundingClientRect.top > innerHeight){
      // 只在「從視窗下方離開」時重置：往回捲會重播，往下讀不會閃
      pending.delete(el); reset(el);
    }
  }), { threshold:.01, rootMargin:'0px 0px -40px 0px' });

  $$('[data-reveal]').forEach(el => { if (owned(el)) return; io.observe(el); });

  // 沒有被 data-reveal 包住的獨立行
  const lineIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('in');
    else if (e.boundingClientRect.top > innerHeight) e.target.classList.remove('in');
  }), { threshold:.01, rootMargin:'0px 0px -40px 0px' });
  $$('.rv-line').forEach(l => { if (!l.closest('[data-reveal]') && !owned(l)) lineIO.observe(l); });

  // 停穩後補播飛越途中略過的區塊。
  // 條件刻意不要求「還在視窗內」：快速捲過去的區塊如果留在 opacity:0，
  // 使用者往回捲之前那一段就是空的。只要不再位於視窗下方就補播。
  onFrame.push(() => {
    if (!pending.size || Math.abs(velocity) > 8) return;
    [...pending].forEach(el => {
      if (el.getBoundingClientRect().top < innerHeight - 40){ pending.delete(el); play(el); }
    });
  });

  if (REDUCED){ $$('[data-reveal], .rv-line').forEach(el => el.classList.add('in')); return; }

  /* 守門員：內容的可見性不可以「只」依賴 JS 加 class。
     只要元素的上緣已經進到視窗底下，1.2 秒內一定要看得到，
     不管是被 pending 卡住、observer 沒觸發、還是任何我沒想到的路徑。
     Owner 看到的空白就是缺了這一層保險。 */
  const sweep = () => {
    if (document.hidden) return;
    $$('[data-reveal]').forEach(el => {
      if (el.classList.contains('in') || owned(el)) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight - 20 && r.bottom > -200){ pending.delete(el); play(el); }
    });
    $$('.rv-line').forEach(l => {
      if (l.classList.contains('in') || owned(l)) return;
      const r = l.getBoundingClientRect();
      if (r.top < innerHeight - 20 && r.bottom > -200) l.classList.add('in');
    });
  };
  setInterval(sweep, 1200);
  addEventListener('load', () => setTimeout(sweep, 400), { once:true });
}

/* ═════ 3 · HERO 進場編排（依序而非同時）═════ */
/* 首屏進場：可重複播放（定時重播用），卡片滑入只在第一次 */
/* 首屏時序：大標先落地，閃電把品牌板「劈」出來，副標與數字最後充能。
   ≤1180px 蜜蜂在版面最上方，所以它要先降落再由大標接手。 */
const HERO_SEQ = [
  ['.hero .eyebrow',      0], ['.hero-title .l1',   120], ['.hero-title .l2',   300],
  ['.bolt-streak',      520], ['.brand-plate',      640], ['.hero-sub',         820],
  ['.hero-stats',       920], ['.hero-lockup',        0]
];
const HERO_SEQ_M = [
  ['.hero-bee',           0], ['.hero .eyebrow',   640], ['.hero-title .l1',   720],
  ['.hero-title .l2',   880], ['.bolt-streak',    1060], ['.brand-plate',     1200],
  ['.hero-sub',        1400], ['.hero-stats',     1500], ['.hero-lockup',      640]
];
const heroSeq = () => (innerWidth <= 1180 ? HERO_SEQ_M : HERO_SEQ);
let heroTimers = [];
/* replay=true 走「果斷退場 → 歸零 → 重新進場」，避免退到一半被進場打斷變成抖動 */
function playHero(replay){
  const host = $('#hero'); if (!host) return;
  heroTimers.forEach(clearTimeout); heroTimers = [];
  const seq = heroSeq();
  const all = [...new Set(seq.map(([sel]) => sel))].map(sel => $(sel)).filter(Boolean);
  const bee = $('.hero-bee');
  if (bee && !seq.some(([sel]) => sel === '.hero-bee')) all.push(bee);

  const start = () => {
    host.classList.add('hero-reset');                      // 關掉過渡，讓歸零是瞬間的
    all.forEach(el => { el.classList.remove('in', 'is-out'); $$('.rv-line', el).forEach(l => l.classList.remove('in')); });
    if (bee) bee.classList.remove('in');
    void host.offsetWidth;
    requestAnimationFrame(() => {
      host.classList.remove('hero-reset');
      if (bee && !seq.some(([sel]) => sel === '.hero-bee'))
        heroTimers.push(setTimeout(() => bee.classList.add('in'), 300));
      seq.forEach(([sel, d]) => {
        const el = $(sel); if (!el) return;
        heroTimers.push(setTimeout(() => {
          el.classList.add('in');
          $$('.rv-line', el).forEach((l, i) => heroTimers.push(setTimeout(() => l.classList.add('in'), i * 120)));
        }, 200 + d));
      });
    });
  };

  if (!replay) return start();

  /* 定時重播不可以把已經在螢幕上的內容清空。
     舊做法是移除全部 .in 再依序加回來，於是每 14 秒（以及每次捲回頂端）
     首屏下半部會整片消失約兩秒 —— 那不是重播，那是故障閃爍。
     改成「只重跑重音」：閃電再掃一次、品牌板掃光、黃線重新充能、數字重滾，
     文字一秒都不會消失。 */
  const pulse = (sel, cls, ms) => {
    const el = $(sel); if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    heroTimers.push(setTimeout(() => el.classList.remove(cls), ms));
  };
  const bolt = $('.bolt-streak');
  if (bolt){                                   // 閃電本身就是「掃過去」，重掃才有意義
    bolt.classList.remove('in'); void bolt.offsetWidth;
    heroTimers.push(setTimeout(() => bolt.classList.add('in'), 50));
  }
  heroTimers.push(setTimeout(() => pulse('.brand-plate', 'sheen', 1200), 480));
  heroTimers.push(setTimeout(() => pulse('.hero-stats', 'charge', 1300), 620));
}
/* 閃電掃完的那一刻＝首屏的重拍：尖端噴火花、蜂窩由落點向外亮一圈、大標被震一下 */
function boltStrike(){
  dispose('bolt');
  const bolt = $('.bolt-streak'), host = $('#hero');
  if (!bolt || !host || REDUCED) return;
  listen('bolt', bolt, 'transitionend', e => {
    if (e.propertyName !== 'clip-path' || !bolt.classList.contains('in')) return;
    const b = bolt.getBoundingClientRect(), h = host.getBoundingClientRect();
    const x = b.right - h.left - 18, y = b.top - h.top + b.height * .5;
    host.dispatchEvent(new CustomEvent('bee:ripple', { detail:{ x, y, r:420 } }));
    burstAt(b.right - 18, b.top + b.height * .5, { n:14, dist:64, size:4, lift:16, ms:760 });
    const lk = $('.hero-lockup');
    if (lk){ lk.classList.add('hit'); setTimeout(() => lk.classList.remove('hit'), 460); }
  });
}

function heroChoreo(){
  if (REDUCED){
    $$('#hero [data-reveal], #hero .rv-line, .hero-bee, .brand-plate').forEach(el => el.classList.add('in'));
    return;
  }
  playHero();
  // 卡片依序滑入（只在第一次載入）
  setTimeout(() => {
    $$('.hero-cards-run .hcard').forEach((c, i) => {
      c.style.transition = 'opacity .7s var(--e-out), transform .8s var(--e-out)';
      c.style.opacity = '0';
      c.style.transform = 'translateY(40px)';
      requestAnimationFrame(() => setTimeout(() => {
        c.style.opacity = '1'; c.style.transform = 'none';
      }, i * 110));
    });
  }, 40);
}

/* ═════ 4 · 跑馬燈（速度隨捲動微幅變化）═════ */
function marquees(){
  const anims = [];
  $$('.marquee-run').forEach(run => {
    // 複製一份 → translateX(-50%) 無縫。複製件標 aria-hidden，否則讀屏會把整份清單唸兩遍。
    const dup = run.cloneNode(true);
    [...dup.children].forEach(n => { n.setAttribute('aria-hidden', 'true'); run.appendChild(n); });
    if (REDUCED) return;
    anims.push(run.animate(
      [{ transform:'translateX(0)' }, { transform:'translateX(-50%)' }],
      { duration: (+run.dataset.speed || 34) * 1000, iterations: Infinity, easing:'linear' }
    ));
  });
  // 刻意「不」隨捲動變速：跑馬燈維持等速。
  // 速度隨捲動起伏會讓文字讀起來在飄；穩定的等速才像正常的 ticker。
}


/* 依標題決定卡片該去哪：輪播有 → 作品區並轉到那張；Offer 有 → 方案區並切到那項 */
const linkFor = title => OFFER.some(o => o.t === title) ? '#offer' : '#offer';
const dataFor = title => {
  const i = FEATURED.findIndex(g => g.t === title); if (i >= 0) return ` data-arc="${i}"`;
  const j = OFFER.findIndex(o => o.t === title);    if (j >= 0) return ` data-offer="${j}"`;
  return '';
};
/* ═════ 5 · HERO 卡片 ═════ */
function hero(){
  const viewport = $('#heroCards');
  if (!viewport) return;

  const card = (g, i) => `
    <a class="hcard" href="${linkFor(g.t)}"${dataFor(g.t)} aria-label="${g.t}">
      <div class="hcard-media spot">
        <img class="bg" src="${g.bg}" alt="" loading="eager" decoding="async" fetchpriority="low">
        <img class="hcard-char" src="${g.ch}" alt="" loading="eager" decoding="async" fetchpriority="low">
        <span class="hcard-tag">${t(g.tag)}</span>
        <span class="hcard-soon-clip"><span class="hcard-soon" data-i18n="tag.soon">${t('tag.soon')}</span></span>
        <div class="hcard-veil"></div>
        <div class="hcard-foot"><h3>${g.t}</h3>${ARW}</div>
      </div>
    </a>`;

  // 內層才是被動畫的軌道；複製一份讓 translateX(-50%) 無縫接回
  const run = document.createElement('div');
  run.className = 'hero-cards-run';
  const html = HERO.map(card).join('');
  run.innerHTML = html;
  const dup = run.cloneNode(true);          // 複製件不進焦點順序，也不被讀屏唸第二遍
  [...dup.children].forEach(n => { n.setAttribute('aria-hidden', 'true'); n.tabIndex = -1; run.appendChild(n); });
  viewport.replaceChildren(run);

  if (REDUCED) return;

  // 12 張 × 每張約 5.2 秒 → 一輪約 62 秒，速度沉穩不搶戲
  const anim = run.animate(
    [{ transform:'translateX(0)' }, { transform:'translateX(-50%)' }],
    { duration: HERO.length * 5200, iterations: Infinity, easing:'linear' }
  );

  // 滑入時平滑停下，滑出再平滑回復（不是硬切）
  let rate = 1, target = 1, raf = 0;
  const step = () => {
    raf = 0;
    rate = lerp(rate, target, .12);
    if (Math.abs(rate - target) < .01) rate = target;
    anim.playbackRate = rate;
    if (rate !== target) raf = requestAnimationFrame(step);
  };
  const setTarget = v => { target = v; if (!raf) raf = requestAnimationFrame(step); };
  viewport.addEventListener('pointerenter', () => setTarget(0));
  viewport.addEventListener('pointerleave', () => setTarget(1));
  viewport.addEventListener('focusin',  () => setTarget(0));
  viewport.addEventListener('focusout', () => setTarget(1));
}

/* ═════ 6 · 橫幅雙軌跑道 ═════ */
function lanes(){
  dispose('lane');
  const build = (el, list) => {
    if (!el) return;
    const html = list.map(sv =>
      `<div class="lane-tile"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[sv.i]}</svg>`
      + `<span data-i18n="${sv.k}">${t(sv.k)}</span></div>`).join('');
    el.innerHTML = html + html;
    if (REDUCED) return;
    const dir = +(el.dataset.dir || 1);
    const dur = +(el.dataset.speed || 46);
    const anim = el.animate(
      dir > 0
        ? [{ transform:'translateX(0)' },    { transform:'translateX(-50%)' }]
        : [{ transform:'translateX(-50%)' }, { transform:'translateX(0)' }],
      { duration: dur * 1000, iterations: Infinity, easing:'linear' }
    );
    return anim;
  };
  const a = build($('#laneA'), LANE_A);
  const b = build($('#laneB'), LANE_B);
  if (REDUCED || !a || !b) return;

  /* 捲動回饋改用二階彈簧：猛捲時傳送帶像被踩油門，放開後煞車過頭再回穩。
     原本純 lerp、上限 1.35，實測只到 1.08，肉眼等於沒反應。 */
  let rate = 1, rv = 0, hover = 1;
  const laneEls = $$('.lane');
  laneEls.forEach(l => {
    listen('lane', l, 'pointerenter', () => { hover = .18; });   // 靠近就慢下來讓人看清楚
    listen('lane', l, 'pointerleave', () => { hover = 1; });
  });
  frame('lane', (y, v) => {
    const target = (1 + clamp(Math.abs(v) / 38, 0, 1.8)) * hover;
    rv += (target - rate) * .16; rv *= .74; rate = clamp(rate + rv, .12, 3);
    a.playbackRate = rate; b.playbackRate = rate;
    const rush = rate > 1.9;
    laneEls.forEach(l => l.classList.toggle('rush', rush));
  });
}

/* ═════ 7 · 精選作品：弧形輪播（含觸控滑動）═════ */
function arc(){
  const el = $('#arc'), stage = $('#arcStage'), dots = $('#arcDots');
  if (!el || !stage) return;
  dispose('arc');
  $$('.drag-hint, .arc-nav', el).forEach(n => n.remove());

  stage.innerHTML = FEATURED.map(g => `
    <a class="gcard" href="#offer" data-i="${FEATURED.indexOf(g)}" aria-label="${g.t}">
      <div class="gcard-in spot">
        <img src="${g.img}" alt="" loading="eager" decoding="async">
        <span class="gcard-tag">${t(g.tag)}</span>
        <div class="gcard-veil"></div>
        <!-- 圖上本來就有遊戲 logo，這裡不再重複標題，只留箭頭 -->
        <div class="gcard-foot">${ARW}</div>
      </div>
    </a>`).join('');

  const hint = document.createElement('span');
  hint.className = 'drag-hint';
  hint.textContent = t(COARSE ? 'ui.swipe' : 'ui.drag');
  el.appendChild(hint);

  const cards = $$('.gcard', stage);
  const N = cards.length;
  dots.innerHTML = cards.map((_, i) =>
    `<button type="button" aria-label="${t('ui.gameNo').replace('{n}', i + 1)}"></button>`).join('');
  const dotEls = $$('button', dots);

  let STEP = 6.0, RADIUS = 2600, SPAN = 2.6;
  const measure = () => {
    const w = innerWidth;
    RADIUS = w < 720 ? 1500 : w < 1100 ? 2000 : 2600;
    STEP   = w < 720 ? 8.6  : w < 1100 ? 7.0  : 6.0;
    SPAN   = w < 720 ? 1.6  : w < 1100 ? 2.2  : 2.6;
    cards.forEach(c => c.style.transformOrigin = `50% ${-RADIUS}px`);
  };
  const wrap = d => { d = (d + N * 1.5) % N; return d > N / 2 ? d - N : d; };

  let cur = 0, goal = 0, dragging = false, startX = 0, startGoal = 0, raf = 0, vel = 0;

  const paint = () => {
    raf = 0;
    const prev = cur;
    cur = lerp(cur, goal, REDUCED ? 1 : .12);
    vel = cur - prev;
    if (Math.abs(goal - cur) < .0008) cur = goal;

    cards.forEach((c, i) => {
      const d = wrap(i - cur), ad = Math.abs(d);
      if (ad > SPAN + .6){ c.style.visibility = 'hidden'; return; }
      c.style.visibility = 'visible';
      c.style.transform = `rotate(${d * STEP}deg)`;
      c.style.opacity   = String(clamp(1 - Math.max(0, ad - SPAN + .8) * 1.1, 0, 1));
      c.style.zIndex    = String(100 - Math.round(ad * 10));
      c.classList.toggle('is-active', ad < .5);
      // 拖曳時卡片依速度微傾，放手回正
      const inner = c.firstElementChild;
      if (inner && !REDUCED) inner.style.rotate = `${clamp(-vel * 26, -7, 7)}deg`;
    });

    const active = ((Math.round(cur) % N) + N) % N;
    dotEls.forEach((d, i) => {
      d.classList.toggle('on', i === active);
      d.setAttribute('aria-current', i === active ? 'true' : 'false');
    });
    if (cur !== goal) raf = requestAnimationFrame(paint);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(paint); };
  const go = v => { goal = v; kick(); };
  arcGoTo = i => { pause(6000); go(goal + wrap(i - goal)); };
  listen('arc', stage, 'click', e => {
    const c = e.target.closest('.gcard'); if (!c) return;
    e.preventDefault(); e.stopPropagation();        // 卡片本身不再捲動頁面
    if (moved) return;                              // 拖曳結束的那一下不算點擊
    if (!c.classList.contains('is-active')) arcGoTo(+c.dataset.i);
  }, true);

  const arcPx = () => (RADIUS * STEP * Math.PI) / 180;

  let moved = false;                            // 這一次按下後是否真的拖過（> 6px）
  listen('arc', el, 'pointerdown', e => {
    dragging = true; startX = e.clientX; startGoal = goal; moved = false; el.classList.remove('dragged');
    el.classList.add('drag', 'touched'); el.setPointerCapture(e.pointerId);
  });
  listen('arc', el, 'pointermove', e => {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX) > 6){ moved = true; el.classList.add('dragged'); }
    go(startGoal - (e.clientX - startX) / arcPx());
  });
  const end = e => {
    if (!dragging) return;
    dragging = false; el.classList.remove('drag');
    // 依甩動速度多帶一格，手感更自然
    const flick = clamp(-vel * 9, -1.6, 1.6);
    go(Math.round(goal + flick));
    if (e && e.pointerId != null && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };
  listen('arc', el, 'pointerup', end);
  listen('arc', el, 'pointercancel', end);
  listen('arc', el, 'click', e => { if (Math.abs(goal - startGoal) > .04) e.preventDefault(); }, true);

  listen('arc', el, 'wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); e.stopPropagation();
    go(goal + e.deltaX / 220);
  }, { passive:false });

  dotEls.forEach((d, i) => d.addEventListener('click', () => go(goal + wrap(i - goal))));
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', t('ui.arcLabel'));
  listen('arc', el, 'keydown', e => {
    if (e.key === 'ArrowLeft'){ e.preventDefault(); go(Math.round(goal) - 1); }
    if (e.key === 'ArrowRight'){ e.preventDefault(); go(Math.round(goal) + 1); }
  });

  /* ── 自動輪播：緩慢自己前進，任何互動都先讓路 ── */
  let hold = 0, inView = false, entered = false;
  const AUTO_MS = 4200;
  const pause = (ms = 5200) => { hold = performance.now() + ms; };
  every('arc', AUTO_MS, () => {
    if (REDUCED || document.hidden || dragging || !inView) return;
    if (performance.now() < hold) return;
    go(Math.round(goal) + 1);
  });

  // 滑到／點到／用鍵盤時暫停，離開後才接手
  ['pointerenter','pointerdown','focusin','wheel'].forEach(ev =>
    listen('arc', el, ev, () => pause(), { passive:true }));
  listen('arc', el, 'pointerleave', () => pause(1200), { passive:true });

  /* ── 左右切換按鈕 ── */
  const navBtn = dir => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'arc-nav arc-nav--' + (dir < 0 ? 'prev' : 'next');
    b.setAttribute('aria-label', t(dir < 0 ? 'ui.prev' : 'ui.next'));
    b.innerHTML = '<i></i>';
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      pause(); go(Math.round(goal) + dir);
    });
    // 按鈕本身不要觸發輪播的拖曳
    b.addEventListener('pointerdown', e => e.stopPropagation());
    return b;
  };
  el.append(navBtn(-1), navBtn(1));

  listen('arc', window, 'resize', () => { measure(); cur = goal; paint(); });
  measure();
  const io = new IntersectionObserver(es => es.forEach(e => {
    inView = e.isIntersecting;
    if (e.isIntersecting && !entered){ entered = true; cur = -2.4; go(0); pause(2600); }
  }), { threshold:.2 });
  io.observe(el);
  onDispose('arc', () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); });
  paint();
}

/* ═════ 8 · 即將上線：雙欄無限直向輪播 ═════
   外層 .soon-col 吃捲動視差，內層 .soon-run 跑自己的無限迴圈，
   兩者分開才不會互相蓋掉 transform。 */
function soon(){
  const host = $('#soonCols');
  if (!host) return;
  dispose('soon');

  const tile = g => `<article class="soon-tile spot">
      <div class="st-art"><img src="${g.img}" alt="" loading="eager" decoding="async">
        <span class="st-shine"></span></div>
      <span class="d">${g.d}</span><span class="n">${g.t}</span>
    </article>`;

  // 每欄的內容複製一份 → 位移剛好一份的高度就能無縫接回
  host.innerHTML = [0, 1].map(c => {
    const items = SOON.filter((_, i) => i % 2 === c);
    const run = items.map(tile).join('');
    return `<div class="soon-col" data-sp="${c ? -1 : 1}">
              <div class="soon-run" data-dir="${c ? -1 : 1}">${run}${run}</div>
            </div>`;
  }).join('');

  const cols = $$('.soon-col', host), sec = $('#soon');
  if (REDUCED) return;

  /* 捲動視差（外層）*/
  frame('soon', () => {
    const r = sec.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight + 200) return;
    const p = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1) - .5;
    cols.forEach(c => { c.style.transform = `translate3d(0,${p * 90 * +c.dataset.sp}px,0)`; });
  });

  /* 無限直向輪播（內層）*/
  const runs = $$('.soon-run', host);
  const anims = [];
  const startLoop = () => {
    anims.forEach(a => a.cancel()); anims.length = 0;
    runs.forEach(run => {
      const tiles = $$('.soon-tile', run);
      if (tiles.length < 2) return;
      const gap = parseFloat(getComputedStyle(run).rowGap) || 0;
      const half = tiles.length / 2;                       // 一份的張數
      // 一份的高度 = 最後一張的底 - 第一張的頂 + 一個 gap
      const top  = tiles[0].offsetTop;
      const dist = tiles[half].offsetTop - top;            // 第二份第一張的位移即為一份高度
      if (!dist) return;
      const dir = +run.dataset.dir;                        // 1 往上跑、-1 往下跑
      const from = dir > 0 ? 0 : -dist, to = dir > 0 ? -dist : 0;
      const a = run.animate(
        [{ transform:`translateY(${from}px)` }, { transform:`translateY(${to}px)` }],
        { duration: dist * 34, iterations: Infinity, easing:'linear' });
      anims.push(a);
      // 滑到該欄就慢慢停下來，離開再慢慢加速
      const ramp = target => {
        const step = () => {
          const r = a.playbackRate, d = target - r;
          a.playbackRate = Math.abs(d) < .04 ? target : r + d * .18;
          if (a.playbackRate !== target) requestAnimationFrame(step);
        };
        step();
      };
      run.addEventListener('pointerenter', () => ramp(0),  { passive:true });
      run.addEventListener('pointerleave', () => ramp(1),  { passive:true });
      run.addEventListener('focusin',      () => ramp(0));
      run.addEventListener('focusout',     () => ramp(1));
    });
  };
  // 圖片載完高度才準
  const imgs = $$('.soon-tile img', host);
  let left = imgs.filter(i => !i.complete).length;
  if (!left) startLoop();
  else imgs.forEach(i => i.complete || i.addEventListener('load', () => { if (!--left) startLoop(); }, { once:true }));
  let rt;
  listen('soon', window, 'resize', () => { clearTimeout(rt); rt = setTimeout(startLoop, 250); });
  onDispose('soon', () => { clearTimeout(rt); anims.forEach(a => a.cancel()); anims.length = 0; });
}

/* ═════ 8b · 路線圖左欄：游標視差 + 標題掃光 ═════ */
function soonCopy(){
  const copy = $('.soon-copy'), sec = $('#soon');
  if (!copy || !sec || REDUCED || COARSE) return;
  let tx = 0, ty = 0, cx = 0, cy = 0;
  sec.addEventListener('pointermove', e => {
    const r = sec.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width  - .5) * 16;
    ty = ((e.clientY - r.top)  / r.height - .5) * 12;
  }, { passive:true });
  sec.addEventListener('pointerleave', () => { tx = ty = 0; }, { passive:true });
  // 只在還沒追上目標值時跑，靜止就讓 rAF 停下來
  let running = false;
  const step = () => {
    cx = lerp(cx, tx, .08); cy = lerp(cy, ty, .08);
    copy.style.transform = `translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0)`;
    if (Math.abs(tx - cx) > .05 || Math.abs(ty - cy) > .05) requestAnimationFrame(step);
    else running = false;
  };
  const kickCopy = () => { if (!running){ running = true; requestAnimationFrame(step); } };
  sec.addEventListener('pointermove',  kickCopy, { passive:true });
  sec.addEventListener('pointerleave', kickCopy, { passive:true });
}

/* ═════ 9 · 服務項目：清單 ↔ 預覽卡（含鍵盤）═════ */
function offer(){
  const list = $('#offerList'), card = $('#offerCard');
  if (!list || !card) return;

  list.setAttribute('role', 'tablist');
  list.innerHTML = OFFER.map((o, i) => `
    <li${i === 0 ? ' class="on"' : ''} role="presentation">
      <button type="button" role="tab" aria-selected="${i === 0}"
              tabindex="${i === 0 ? 0 : -1}"><span class="n">${o.n}</span>${t(o.t)}${o.tag !== 'tag.slots' ? `<span class="ol-soon" data-i18n="offer.building">${t('offer.building')}</span>` : ''}</button>
    </li>`).join('');

  const bg = $('.oc-bg', card), ch = $('.oc-char', card);
  const txt = $('#ocText'), cta = $('#ocCta span');
  const btns = $$('button', list);
  let idx = -1, timer = 0, hoverTimer = 0;

  const show = i => {
    if (i === idx) return;
    idx = i;
    const o = OFFER[i];
    $$('li', list).forEach((li, k) => {
      li.classList.toggle('on', k === i);
      const b = $('button', li);
      b.setAttribute('aria-selected', String(k === i));
      b.tabIndex = k === i ? 0 : -1;
    });
    clearTimeout(timer);
    card.classList.add('swap');
    timer = setTimeout(() => {
      bg.src = o.bg; ch.src = o.ch;
      txt.textContent = t(o.d); cta.textContent = t(o.cta);
      const soon = $('#ocSoon'); if (soon) soon.hidden = o.tag === 'tag.slots';
      card.classList.remove('swap');
    }, REDUCED ? 0 : 240);
  };

  offerShow = show;
  btns.forEach((b, i) => {
    b.addEventListener('click', () => show(i));
    // hover intent：停留 90ms 才切換，避免滑過閃爍
    b.addEventListener('mouseenter', () => {
      if (innerWidth <= 1024) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => show(i), 90);
    });
    b.addEventListener('mouseleave', () => clearTimeout(hoverTimer));
    b.addEventListener('focus', () => show(i));
    b.addEventListener('keydown', e => {
      let n = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % btns.length;
      if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  n = (i - 1 + btns.length) % btns.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End')  n = btns.length - 1;
      if (n === null) return;
      e.preventDefault(); btns[n].focus();
    });
  });
  show(0);
}

/* ═════ 10 · 清單內容 ═════ */
function lists(){
  const caps = $('#capsList');
  if (caps){
    caps.innerHTML = CAPS.map(([k, v], i) =>
      `<li style="--i:${i}"><span class="k">${t(k)}</span><span class="v">${t(v)}</span></li>`).join('');
    // 觸控裝置沒有 hover，桌機閒置時也該有節奏 → 每 14 秒逐列點名一次
    dispose('kvTour');
    if (!REDUCED) every('kvTour', 14000, () => {
      const r = caps.getBoundingClientRect();
      if (document.hidden || r.bottom < 0 || r.top > innerHeight) return;
      $$('li', caps).forEach((li, i) => setTimeout(() => {
        li.classList.add('is-on'); setTimeout(() => li.classList.remove('is-on'), 640);
      }, i * 140));
    });
  }

}

/* ═════ 9a · 粒子：只在「有意義的一刻」噴 ═════
   Owner 的規則是「交會／命中的瞬間噴一點光」，不是環境彩屑。
   固定定位的單一圖層，用 WAAPI 跑完即回收，不佔 onFrame。 */
let sparkLayer = null;
const SPARK_MAX = 90;
let sparkAlive = 0;
function burstAt(x, y, opts){
  if (REDUCED || document.hidden) return;
  const o = opts || {};
  const n = Math.min(o.n || 8, SPARK_MAX - sparkAlive);
  if (n <= 0) return;
  if (!sparkLayer){
    sparkLayer = document.createElement('div');
    sparkLayer.className = 'spark-layer';
    sparkLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(sparkLayer);
  }
  const spread = o.spread == null ? Math.PI * 2 : o.spread;
  const dir = o.dir == null ? 0 : o.dir;
  for (let i = 0; i < n; i++){
    const p = document.createElement('i');
    p.className = 'spark' + (o.dark ? ' spark--dark' : '');
    const sz = (o.size || 4) * (.6 + Math.random() * .8);
    p.style.cssText = `left:${x}px;top:${y}px;width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px`;
    sparkLayer.appendChild(p); sparkAlive++;
    const a = dir + (Math.random() - .5) * spread;
    const d = (o.dist || 46) * (.45 + Math.random() * .9);
    const anim = p.animate([
      { transform:'translate(-50%,-50%) scale(1)', opacity:.95 },
      { transform:`translate(calc(-50% + ${(Math.cos(a) * d).toFixed(1)}px),`
                + `calc(-50% + ${(Math.sin(a) * d - (o.lift || 12)).toFixed(1)}px)) scale(.15)`, opacity:0 }
    ], { duration: (o.ms || 620) * (.7 + Math.random() * .6), easing:'cubic-bezier(.16,1,.3,1)' });
    const done = () => { p.remove(); sparkAlive--; };
    anim.onfinish = done; anim.oncancel = done;
  }
}
/* 對元素噴：算出它在視窗中的位置。ax/ay 是 0–1 的相對錨點。 */
const burstOn = (el, ax, ay, opts) => {
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  burstAt(r.left + r.width * (ax == null ? .5 : ax), r.top + r.height * (ay == null ? .5 : ay), opts);
};

/* ═════ 9b · 成績單：品質儀表 + 數據火花圖 ═════
   儀表是分段條（24 格），格數＝分數；點一根支柱展開說明，閒置時自動巡覽下一根。
   數字磚在進場時同時跑「數字滾動 + 近八季走勢長條」，滑過再顯示註腳。 */
const SEG = 50;   // 24 格時 96% 與 94% 都四捨五入成 23 格，兩條長得一樣；50 格才分得出來
/* 四種編碼各自的標記列。視覺語言統一是「一排方塊」，只有含義不同。 */
const vizMarks = st => {
  if (st.viz === 'trend')
    return st.trend.map((h, i) => `<i class="mk mk--bar" style="--h:${h}%; --d:${i * 55}ms"></i>`).join('');
  if (st.viz === 'dots')
    return Array.from({ length: st.total }, (_, i) =>
      `<i class="mk mk--dot${i < st.mark ? ' is-on' : ''}" style="--d:${i * 16}ms"></i>`).join('');
  if (st.viz === 'split'){
    const tot = st.parts.reduce((a, c) => a + c, 0);
    return st.parts.map((v, i) =>
      `<i class="mk mk--seg${i ? ' is-alt' : ''}" style="--f:${(v / tot * 100).toFixed(1)}%; --d:${i * 220}ms"></i>`).join('');
  }
  if (st.viz === 'cadence')
    return Array.from({ length: st.total }, (_, i) =>
      `<i class="mk mk--tick${i < st.done ? ' is-on' : ''}" style="--d:${i * 26}ms"></i>`).join('');
  return '';
};

function scoreboard(){
  dispose('score');

  /* ── 品質儀表 ── */
  const list = $('#proofList');
  if (list){
    list.innerHTML = PROOF.map((p, i) => {
      const on = Math.round(p.score / 100 * SEG);
      const segs = Array.from({ length:SEG }, (_, n) =>
        `<i${n < on ? ' class="on"' : ''} style="--d:${n * 26}ms"></i>`).join('');
      return `<li class="sc-row" data-i="${i}">
        <button type="button" class="sc-btn" aria-expanded="false" aria-controls="scDrop-${i}">
          <span class="sc-n">0${i + 1}</span>
          <span class="sc-k">${t(p.k)}<em class="sc-m">${t(p.m)}</em></span>
          <span class="sc-meter" aria-hidden="true">${segs}<b class="sc-head"></b></span>
          <span class="sc-val"><b data-count="${p.score}" data-suffix="">${p.score}</b><em>%</em></span>
        </button>
        <div class="sc-drop" id="scDrop-${i}"><p class="sc-v">${t(p.v)}</p><p class="sc-d">${t(p.d)}</p></div>
      </li>`;
    }).join('');

    const rows = $$('.sc-row', list);
    let act = -1, hover = false, hold = 0, inView = false;
    const setAct = i => {
      act = i;
      rows.forEach((r, n) => {
        const on = n === i;
        r.classList.toggle('on', on);
        $('.sc-btn', r).setAttribute('aria-expanded', String(on));
        if (on){
          // 量表填滿到頭的那一刻，在最後一格噴一點光
          const seg = $$('.sc-meter i.on', r).pop();
          if (seg) setTimeout(() => burstOn(seg, .5, .2, { n:7, dist:26, size:3, lift:8, ms:520 }), 340);
        }
      });
    };
    rows.forEach((r, i) => listen('score', $('.sc-btn', r), 'click', () => {
      setAct(act === i ? -1 : i); hold = performance.now() + 9000;
    }));
    listen('score', list, 'pointerenter', () => { hover = true; });
    listen('score', list, 'pointerleave', () => { hover = false; hold = performance.now() + 1200; });
    listen('score', list, 'focusin',  () => { hover = true; });
    listen('score', list, 'focusout', () => { hover = false; });
    if (!REDUCED) every('score', 3800, () => {
      if (!inView || document.hidden || hover || performance.now() < hold) return;
      setAct((act + 1) % rows.length);
    });
    const io = new IntersectionObserver(es => es.forEach(e => {
      inView = e.isIntersecting;
      if (inView){ list.classList.add('play'); if (act < 0) setAct(0); }
      else if (e.boundingClientRect.top > innerHeight) list.classList.remove('play');
    }), { threshold:0, rootMargin:'0px 0px -8px 0px' });
    io.observe(list);
    onDispose('score', () => io.disconnect());
  }

  /* ── 數據磚 ── */
  const stats = $('#statsList');
  if (stats){
    stats.innerHTML = STATS.map(st => `<li class="stat-tile spot${st.hero ? ' is-hero' : ''}" data-viz="${st.viz}">
        <b data-count="${st.n}" data-suffix="${st.suffix}">${st.n.toLocaleString()}${st.suffix}</b>
        <span class="stat-k">${t(st.label)}</span>
        <span class="stat-marks" role="img" aria-label="${t(st.legend)}">${vizMarks(st)}</span>
        <span class="stat-legend">${t(st.legend)}</span>
        <span class="stat-cap">${t(st.cap)}</span>
      </li>`).join('');

    const tiles = $$('.stat-tile', stats);
    const io2 = new IntersectionObserver(es => es.forEach(e => {
      const on = e.isIntersecting;
      if (on) e.target.classList.add('play');
      else if (e.boundingClientRect.top > innerHeight) e.target.classList.remove('play');
      if (on && !REDUCED){
        // 標記列填滿到末端時，在最後一格點一下火
        const last = $$('.mk', e.target).pop();
        const delay = 300 + $$('.mk', e.target).length * 12;
        clearTimeout(e.target.__st);
        e.target.__st = setTimeout(() => burstOn(last, .5, .2,
          { n:8, dist:30, size:3.5, lift:10, dark:e.target.classList.contains('is-hero') }), delay);
      }
    }), { threshold:0, rootMargin:'0px 0px -8px 0px' });
    tiles.forEach(el => io2.observe(el));
    onDispose('score', () => { io2.disconnect(); tiles.forEach(el => clearTimeout(el.__st)); });

    // 觸控裝置沒有 hover：每 9 秒讓一塊磚自己亮一次，畫面自己在演
    if (!REDUCED) every('score', 9000, () => {
      if (document.hidden) return;
      const vis = tiles.filter(el => { const r = el.getBoundingClientRect(); return r.top < innerHeight - 40 && r.bottom > 40; });
      if (!vis.length) return;
      const el = vis[(scoreboard.k = (scoreboard.k || 0) + 1) % vis.length];
      el.classList.add('is-on');
      const last = $$('.mk', el).pop();
      burstOn(last, .5, .2, { n:6, dist:26, size:3, lift:8, dark:el.classList.contains('is-hero') });
      setTimeout(() => el.classList.remove('is-on'), 1100);
    });
    listen('score', stats, 'pointerdown', e => {
      const el = e.target.closest('.stat-tile'); if (!el) return;
      burstAt(e.clientX, e.clientY, { n:9, dist:34, size:3.5, lift:10, dark:el.classList.contains('is-hero') });
    });
  }
}

/* ═════ 8 · 自家團隊：組織圖 ═════
   節點由 ORG 產生；連接線用 SVG 依實際節點位置畫（換語言、換寬度都重量）。
   桌機（>900px）：樹狀圖，點主管聚焦該部門、其他部門退場；閒置時每 3.4 秒自動巡覽下一個部門。
   ≤900px：手風琴，點主管展開成員與職責，不畫線、不自動巡覽。 */
const ORG_DESK = matchMedia('(min-width:901px)');
function orgChart(){
  dispose('org');
  const root = $('#orgChart'), detail = $('#orgDetail'), facts = $('#orgFacts');
  if (!root) return;

  if (facts) facts.innerHTML = ORG_FACTS.map(f =>
    `<li><b data-count="${f.n}" data-suffix="">${f.n}</b><span>${t(f.label)}</span></li>`).join('');

  const hex  = (p, sz) => `<span class="org-hex" style="--sz:${sz}px"><b>${p.init}</b></span>`;
  const text = p => `<span class="org-text"><span class="org-name">${p.name}</span><span class="org-role">${t(p.role)}</span></span>`;
  let n = 0;
  const delay = () => ` style="--d:${(n++) * 70}ms"`;

  root.innerHTML = `
    <svg class="org-lines" aria-hidden="true"></svg>
    <div class="org-root"><div class="org-node org-node--root"${delay()}>${hex(ORG.root, 64)}${text(ORG.root)}</div></div>
    <div class="org-depts">${ORG.depts.map(d => `
      <div class="org-dept" data-k="${d.k}">
        <button type="button" class="org-node org-node--head" aria-expanded="false" aria-controls="orgTeam-${d.k}"${delay()}>
          <span class="org-dept-label">${t(d.label)} · ${1 + d.team.length}</span>
          ${hex(d.head, 48)}${text(d.head)}<i class="org-chev" aria-hidden="true"></i>
        </button>
        <ul class="org-team" id="orgTeam-${d.k}">${d.team.map(m =>
          `<li class="org-node org-node--member"${delay()}>${hex(m, 36)}${text(m)}</li>`).join('')}</ul>
        <p class="org-blurb">${t(d.blurb)}</p>
      </div>`).join('')}
    </div>`;

  const svg = $('.org-lines', root);
  const depts = $$('.org-dept', root);
  const byK = {};                                   // k → { d, len }

  /* 量測節點位置，畫出：執行長 → 匯流排 → 各主管；主管 → 左側直軌 → 每位成員 */
  const drawLines = () => {
    svg.replaceChildren();
    if (!ORG_DESK.matches) return;
    const R = root.getBoundingClientRect();
    const rel = el => { const b = el.getBoundingClientRect();
      return { x:b.left - R.left, y:b.top - R.top, w:b.width, h:b.height, cx:b.left - R.left + b.width / 2, cy:b.top - R.top + b.height / 2 }; };
    const rn = rel($('.org-node--root', root));
    depts.forEach(dept => {
      const hn = rel($('.org-node--head', dept));
      const busY = Math.round(rn.y + rn.h + (hn.y - rn.y - rn.h) / 2) + .5;
      let d = `M${rn.cx},${rn.y + rn.h} V${busY} H${hn.cx} V${hn.y}`;
      const ms = $$('.org-node--member', dept).map(rel);
      if (ms.length){
        const railX = Math.round(hn.x + 11) + .5;
        d += ` M${railX},${hn.y + hn.h} V${ms[ms.length - 1].cy}`;
        ms.forEach(m => { d += ` M${railX},${m.cy} H${m.x}`; });
      }
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'org-line'); path.setAttribute('d', d); path.dataset.k = dept.dataset.k;
      svg.appendChild(path);
      const len = Math.ceil(path.getTotalLength());
      path.style.setProperty('--len', len);
      byK[dept.dataset.k] = { d, len, path };
    });
    const sig = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sig.setAttribute('class', 'org-sig'); svg.appendChild(sig);
    if (focus) applySig(focus);
  };
  const applySig = k => {
    const sig = $('.org-sig', svg), it = byK[k];
    if (!sig || !it) return;
    sig.setAttribute('d', it.d); sig.style.setProperty('--len', it.len);
  };

  /* 聚焦某部門 */
  let focus = null;
  const renderDetail = k => {
    if (!detail) return;
    const d = ORG.depts.find(x => x.k === k);
    detail.classList.toggle('on', !!d);
    detail.innerHTML = d
      ? `<span class="od-k">${t(d.label)}</span><b class="od-n">${1 + d.team.length} <small>${t('org.headcount')}</small></b>`
        + `<p class="od-b"><span class="od-tag">${t('org.ships')}</span>${t(d.blurb)}</p>`
        + `<div class="od-chips">${[d.head, ...d.team].map(m => `<span>${t(m.role)}</span>`).join('')}</div>`
      : `<span class="od-k">${ORG.depts.length} ${t('org.depts')} · ${ORG_FACTS[1].n} ${t('org.people')}</span><p class="od-hint">${t('org.hint')}</p>`;
  };
  const setFocus = k => {
    focus = k;
    if (k) root.dataset.focus = k; else delete root.dataset.focus;
    depts.forEach(d => {
      const on = d.dataset.k === k;
      d.classList.toggle('on', on);
      $('.org-node--head', d).setAttribute('aria-expanded', String(on));
      if (byK[d.dataset.k]) byK[d.dataset.k].path.classList.toggle('is-on', on);
    });
    if (k) applySig(k);
    if (k && !REDUCED){
      const dept = depts.find(d => d.dataset.k === k);
      const hex = dept && $('.org-hex', dept);
      if (hex) setTimeout(() => burstOn(hex, .5, .5, { n:9, dist:34, size:3.5, lift:6, ms:600 }), 90);
    }
    if (detail){
      detail.classList.add('swap');
      setTimeout(() => { renderDetail(k); detail.classList.remove('swap'); }, 160);
    }
  };
  renderDetail(null);

  /* 互動：點主管；Esc 取消；游標在圖上時暫停自動巡覽 */
  let hover = false, holdUntil = 0, inView = false;
  depts.forEach(dept => {
    const head = $('.org-node--head', dept);
    listen('org', head, 'click', () => {
      if (ORG_DESK.matches){ setFocus(dept.dataset.k); holdUntil = performance.now() + 9000; }
      else { const open = dept.classList.toggle('open'); head.setAttribute('aria-expanded', String(open)); }
    });
  });
  listen('org', root, 'pointerenter', () => { hover = true; });
  listen('org', root, 'pointerleave', () => { hover = false; holdUntil = performance.now() + 1500; });
  listen('org', root, 'focusin',  () => { hover = true; });
  listen('org', root, 'focusout', () => { hover = false; });
  listen('org', document, 'keydown', e => { if (e.key === 'Escape' && focus) setFocus(null); });

  /* 自動巡覽（只在畫面內、桌機、閒置時）*/
  if (!REDUCED) every('org', 3400, () => {
    if (!inView || document.hidden || !ORG_DESK.matches || hover || performance.now() < holdUntil) return;
    const ks = ORG.depts.map(d => d.k), i = ks.indexOf(focus);
    setFocus(ks[(i + 1) % ks.length]);
  });

  /* 進場：畫線 + 節點依序彈入；離開視窗就重置，回來再播一次 */
  /* threshold .18 只要露出不到 18% 就算「離開」，於是剛捲到區塊上緣時
     整棵樹的節點會全部退回 opacity:0 —— 使用者看到的就是標題底下一片空白。
     改成：只要碰到視窗就播；只有「完全捲到視窗下方」才重置以便重播。 */
  const io = new IntersectionObserver(es => es.forEach(e => {
    inView = e.isIntersecting;
    if (inView){ drawLines(); requestAnimationFrame(() => root.classList.add('play'));
      if (!focus && ORG_DESK.matches) setFocus(ORG.depts[0].k); }   // 回到視窗時自己醒過來
    // 不要在離場時清掉 focus：原本捲離再回來會變成四個部門全收起、閒置巡覽也不再啟動
    else if (e.boundingClientRect.top > innerHeight){ root.classList.remove('play'); }
  }), { threshold:0, rootMargin:'0px 0px -8px 0px' });
  io.observe(root);
  onDispose('org', () => io.disconnect());

  let rt = 0;
  const redraw = () => { clearTimeout(rt); rt = setTimeout(drawLines, 120); };
  listen('org', window, 'resize', redraw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLines);
  // 手風琴模式切回桌機時，展開狀態要清掉
  listen('org', ORG_DESK, 'change', () => { depts.forEach(d => d.classList.remove('open')); setFocus(null); drawLines(); });
}

/* ═════ 10a · 聯絡彈窗：行動型連結一律開這裡；區塊導覽不受影響 ═════ */
/* 法務與社群連結不該開業務洽談彈窗：前者要的是條款，後者要的是社群頁。
   兩者都還沒有實際頁面，所以標成 data-nolink，點擊改成明確的「尚未開放」提示。 */
const CM_TRIGGER = '.btn, .btn-ghost, a[href^="mailto:"], a[href="#"]:not([data-nolink]), .hcard, .gcard.is-active';
const CM_ICON = {
  email:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 7l9 6 9-6"/></svg>',
  tg:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 4L3 11l6 2.5L11 20l3-4 5 3z"/><path d="M9 13.5l10-8"/></svg>',
  wa:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-1.9-.9-.9.8a4 4 0 0 1-2.3-2.3l.8-.9-.9-1.9z"/></svg>'
};
function contactModal(){
  const cm = $('#contactModal'); if (!cm) return;
  const panel = $('.cm-panel', cm), list = $('#cmList'), re = $('#cmRe'), reLabel = $('#cmReLabel');
  list.innerHTML = CONTACTS.map(c => `
    <li class="cm-row">
      <span class="cm-ico" aria-hidden="true">${CM_ICON[c.k] || ''}</span>
      <span class="cm-txt"><span class="cm-k" data-i18n="${c.label}">${t(c.label)}</span><b class="cm-v">${c.handle}</b></span>
      <span class="cm-act">
        ${c.url ? `<a class="cm-btn cm-btn--ghost" href="${c.url}" target="_blank" rel="noopener" data-i18n="cm.open">${t('cm.open')}</a>` : ''}
        <button class="cm-btn" type="button" data-copy="${c.handle}"><span data-i18n="cm.copy">${t('cm.copy')}</span></button>
      </span>
    </li>`).join('');

  let opener = null, closeTimer = 0;
  const focusables = () => $$('a[href], button:not([disabled])', panel);
  const open = label => {
    opener = document.activeElement;
    if (label){ reLabel.textContent = label; re.hidden = false; } else re.hidden = true;
    clearTimeout(closeTimer);
    cm.hidden = false; document.documentElement.classList.add('cm-open');
    requestAnimationFrame(() => { cm.classList.add('on'); (focusables()[0] || panel).focus(); });
  };
  const close = () => {
    if (cm.hidden) return;
    cm.classList.remove('on'); document.documentElement.classList.remove('cm-open');
    closeTimer = setTimeout(() => { cm.hidden = true; if (opener && opener.focus) opener.focus(); }, REDUCED ? 0 : 320);
  };

  // 觸發：任何行動型連結（彈窗內部的按鈕除外）。用 capture 搶在錨點捲動處理之前。
  document.addEventListener('click', e => {
    if (e.target.closest('.cm')) return;
    const trig = e.target.closest(CM_TRIGGER); if (!trig) return;
    if (trig.closest('.arc.dragged')) return;            // 拖曳結束落在中央卡上，不算點擊
    e.preventDefault(); e.stopPropagation();
    const label = (trig.getAttribute('aria-label') || trig.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    open(label);
  }, true);

  cm.addEventListener('click', e => { if (e.target.closest('[data-cm-close]')) close(); });
  addEventListener('keydown', e => {
    if (cm.hidden) return;
    if (e.key === 'Escape'){ e.preventDefault(); close(); return; }
    if (e.key === 'Tab'){                                  // 焦點只在彈窗內循環
      const f = focusables(); if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1){ e.preventDefault(); f[0].focus(); }
    }
  });

  // 複製帳號（clipboard API 失敗時退回 execCommand）
  list.addEventListener('click', async e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const txt = b.dataset.copy; let ok = false;
    try { await navigator.clipboard.writeText(txt); ok = true; }
    catch {
      const ta = document.createElement('textarea'); ta.value = txt;
      ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch {} ta.remove();
    }
    if (!ok) return;
    const span = $('span', b); span.textContent = t('cm.copied'); b.classList.add('is-done');
    setTimeout(() => { span.textContent = t('cm.copy'); b.classList.remove('is-done'); }, 1600);
  });
}

/* ═════ 10b · 遊戲區陣容速覽（數字全部由資料算出，不寫死）═════ */
function lineupMeta(){
  const box = $('.lineup'); if (!box) return;
  const types = new Set(HERO.map(h => h.tag)).size;
  const vals = [FEATURED.length, SOON.length, types];
  $$('.lineup-reads b', box).forEach((b, i) => {
    b.dataset.count = vals[i]; b.textContent = vals[i].toLocaleString();
  });
}

/* ═════ 11 · 數字滾動 ═════ */
/* 數字滾動：進入畫面就跑，離開再進來會再跑；另外每 14 秒定時重播（連同首屏進場） */
const countUp = (el, delay) => {
  const to = +el.dataset.count, suf = el.dataset.suffix || '';
  if (REDUCED){ el.textContent = to.toLocaleString() + suf; return; }
  const token = (el.__ct = (el.__ct || 0) + 1);
  const run = () => {
    if (el.__ct !== token) return;
    const t0 = performance.now(), D = +el.dataset.dur || 1500;
    const step = t => {
      if (el.__ct !== token) return;               // 被新一輪取代就停
      const p = clamp((t - t0) / D, 0, 1);
      const e2 = 1 - Math.pow(1 - p, 4);           // 更緩的收尾
      el.textContent = Math.round(to * e2).toLocaleString() + suf;
      if (p < 1) requestAnimationFrame(step);
      else { el.classList.add('done'); setTimeout(() => el.classList.remove('done'), 360); }
    };
    requestAnimationFrame(step);
  };
  delay ? setTimeout(run, delay) : run();
};
function counters(){
  dispose('count');
  const inview = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){ if (!inview.has(e.target)){ inview.add(e.target); countUp(e.target, +e.target.dataset.i * 140); } }
    else inview.delete(e.target);
  }), { threshold:.4 });
  // 同一組數字依序起跑，才有「一個一個叮住」的節奏，而不是三個一起滾
  $$('[data-count]').forEach(el => {
    const sibs = $$('[data-count]', el.closest('.hero-stats, .stats, .org-facts, .score-list') || document.body);
    el.dataset.i = Math.max(0, sibs.indexOf(el));
    io.observe(el);
  });
  onDispose('count', () => io.disconnect());

  /* 定時重播：每 14 秒把看得見的數字重滾一次；首屏在畫面內時連進場動畫一起重播 */
  if (REDUCED) return;
  const hero = $('#hero');
  const REPLAY_MS = 14000;
  every('count', REPLAY_MS, () => {
    if (document.hidden) return;
    const heroOn = hero && hero.getBoundingClientRect().bottom > innerHeight * .35 && hero.getBoundingClientRect().top < innerHeight * .5;
    if (heroOn) playHero(true);                    // 只重跑重音，不把內容清空
    inview.forEach(el => countUp(el, +el.dataset.i * 140));
    // 角標掃光：每輪重播時卡片依序閃一道（不是整片閃爍，只有一道光）
    $$('.hcard').forEach((c, i) => { setTimeout(() => { c.classList.add('tick');
      setTimeout(() => c.classList.remove('tick'), 900); }, i * 70); });
  });
}

/* ═════ 12 · 通用視差 ═════ */
function parallax(){
  const els = $$('[data-parallax]');
  if (!els.length || REDUCED) return;
  /* 讀 rect 與寫 style 必須分成兩批：交錯進行會讓每個元素各觸發一次強制回流。 */
  const jobs = [];
  onFrame.push(() => {
    jobs.length = 0;
    for (const el of els){                                  // ── 這一輪只讀
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const want = ((innerHeight - r.top) / (innerHeight + r.height) - .5) * +el.dataset.parallax;
      // 拖尾：位移不是硬跟著捲動，而是追上去，背景才有重量
      el._p = el._p == null ? want : lerp(el._p, want, .14);
      const v2 = Math.round(el._p * 4) / 4;                 // 0.25px 以內的變化肉眼看不出，不值得重算樣式
      if (el._w !== v2){ el._w = v2; jobs.push(el); }
    }
    for (const el of jobs) el.style.translate = `0 ${el._w}px`;   // ── 這一輪才寫
  });
}

/* ═════ 11d · 區塊可見性閘門 + 定時脈動 ═════
   裝飾動畫離開視窗就暫停（瀏覽器不會自己停）；
   每 14 秒讓看得到的區塊「自檢」一次：大標掃一道光、裝飾條重畫。 */
function sectionPulse(){
  dispose('pulse');
  const secs = $$('main > section');
  if (!secs.length) return;
  const io = new IntersectionObserver(es => es.forEach(e =>
    e.target.classList.toggle('is-vis', e.isIntersecting)), { rootMargin:'140px 0px' });
  secs.forEach(sec => io.observe(sec));
  onDispose('pulse', () => io.disconnect());
  if (REDUCED) return;
  every('pulse', 14000, () => {
    if (document.hidden) return;
    secs.forEach(sec => {
      if (!sec.classList.contains('is-vis')) return;
      sec.classList.remove('pulse'); void sec.offsetWidth; sec.classList.add('pulse');
      setTimeout(() => sec.classList.remove('pulse'), 2600);
    });
  });
}

/* ═════ 12b · 首屏吉祥物：看向游標、點擊出拳、拳頭震出蜂窩漣漪 ═════
   原本 .hero-lockup 是滿寬的 block，把蜜蜂中段整個蓋住 → hover 永遠打不到，
   cursor:pointer 卻沒有任何 listener，是假的可點提示。 */
function heroBee(){
  dispose('bee');
  const bee = $('.hero-bee'), host = $('#hero');
  if (!bee || !host) return;

  const ripple = (x, y, r) => host.dispatchEvent(new CustomEvent('bee:ripple', { detail:{ x, y, r } }));
  const fistPoint = () => {
    const b = bee.getBoundingClientRect(), h = host.getBoundingClientRect();
    return { x: b.left - h.left + b.width * .74, y: b.top - h.top + b.height * .52 };
  };
  const punch = () => {
    if (REDUCED) return;
    bee.classList.remove('punch'); void bee.offsetWidth; bee.classList.add('punch');
    setTimeout(() => { const p = fistPoint(); ripple(p.x, p.y, 400);
      const h = host.getBoundingClientRect();
      burstAt(h.left + p.x, h.top + p.y, { n:12, dist:56, size:4.5, lift:14, ms:700 });
      const st = $('.hero-stats'); if (st){ st.classList.add('shake'); setTimeout(() => st.classList.remove('shake'), 340); } }, 210);
    setTimeout(() => bee.classList.remove('punch'), 620);
  };
  listen('bee', bee, 'click', punch);
  listen('bee', bee, 'keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); punch(); } });

  /* 看向游標：只在桌機，位移量很小，重點是「他注意到你了」 */
  if (!REDUCED && !COARSE){
    let lean = 0, target = 0;
    listen('bee', host, 'pointermove', e => {
      const b = bee.getBoundingClientRect();
      if (!b.width) { target = 0; return; }
      const dx = e.clientX - (b.left + b.width / 2);
      target = clamp(dx / 46, -6.5, 6.5);
    });
    listen('bee', host, 'pointerleave', () => { target = 0; });
    frame('bee', () => {
      if (Math.abs(lean - target) < .02) return;
      lean = lerp(lean, target, .09);
      bee.style.rotate = lean.toFixed(2) + 'deg';
    });
  }

  /* 閒置時每 11 秒跳一下，並在落地那刻震出漣漪（Owner：動畫要定時重播）*/
  if (!REDUCED) every('bee', 11000, () => {
    if (document.hidden) return;
    const r = host.getBoundingClientRect();
    if (r.bottom < innerHeight * .3) return;
    bee.classList.remove('hop'); void bee.offsetWidth; bee.classList.add('hop');
    setTimeout(() => { const b = bee.getBoundingClientRect(), h = host.getBoundingClientRect();
      ripple(b.left - h.left + b.width / 2, b.top - h.top + b.height * .96, 340); }, 560);
    setTimeout(() => bee.classList.remove('hop'), 960);
  });
}

/* ═════ 13 · HERO 捲動視差（大標與浮水印不同速）═════ */
function heroParallax(){
  if (REDUCED) return;
  const title = $('.hero-lockup'), wm = $('.hero-watermark'),
        sub = $('.hero-sub'), stats = $('.hero-stats');
  if (!title) return;
  onFrame.push(y => {
    if (y > 1100) return;
    const p = y / 1000;
    if (Math.abs(y - (heroParallax.last || 0)) < 1) return;
    heroParallax.last = y;
    const bee = $('.hero-bee'), cards = $('.hero-cards'), bolt = $('.bolt-streak');
    title.style.translate = `0 ${p * -70}px`;
    if (wm)    wm.style.translate    = `0 ${p * 40}px`;
    if (sub)   sub.style.translate   = `0 ${p * -34}px`;
    if (stats) stats.style.translate = `0 ${p * -50}px`;
    if (bolt)  bolt.style.translate  = `0 ${p * -58}px`;
    // 前景要比大標更快才有深度；手機蜜蜂在文件流內，不能推
    if (bee && innerWidth > 1180) bee.style.translate = `0 ${p * -96}px`;
    if (cards) cards.style.translate = `0 ${p * 22}px`;
  });
}

/* ═════ 14 · 卡片聚光燈 + 微傾斜 ═════ */
function spotlight(){
  if (REDUCED || COARSE) return;
  const bind = el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width;
      const my = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (mx * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (my * 100).toFixed(1) + '%');
      if (el.classList.contains('hcard-media') || el.classList.contains('gcard-in')){
        el.style.transform =
          `rotateX(${((.5 - my) * 7).toFixed(2)}deg) rotateY(${((mx - .5) * 9).toFixed(2)}deg)`;
      }
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  };
  $$('.spot').forEach(bind);
}

/* ═════ 15 · 磁吸箭頭 ═════ */
function magnetic(){
  if (REDUCED || COARSE) return;
  $$('.btn, .hcard, .gcard').forEach(host => {
    const arw = $('.arw, .card-arw', host);
    if (!arw) return;
    host.addEventListener('pointermove', e => {
      const r = arw.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > 160) { arw.style.translate = ''; return; }
      const k = (1 - d / 160) * .34;
      arw.style.translate = `${(dx * k).toFixed(1)}px ${(dy * k).toFixed(1)}px`;
    });
    host.addEventListener('pointerleave', () => { arw.style.translate = ''; });
  });
}

/* ═════ 16 · 捲動進度條 + 回到頂端 ═════ */
function chrome(){
  const bar = document.createElement('div');
  bar.className = 'progress';
  document.body.appendChild(bar);

  const top = document.createElement('button');
  top.className = 'to-top';
  top.type = 'button';
  top.setAttribute('aria-label', '回到頁面頂端');
  document.body.appendChild(top);
  top.addEventListener('click', () => {
    top.classList.add('fire');
    setTimeout(() => top.classList.remove('fire'), 420);
    setTimeout(() => scrollTo({ top:0, behavior: REDUCED ? 'auto' : 'smooth' }), REDUCED ? 0 : 120);
  });

  const yellow = $$('.sec.banner, .sec.cta');            // 一次查完，別每幀重查
  let lastP = -1, lastVg = -1, cy = innerHeight - 54;
  const measure = () => { const r = top.getBoundingClientRect(); cy = r.top + r.height / 2; };
  addEventListener('resize', measure, { passive:true });
  requestAnimationFrame(measure);
  onFrame.push((y, v) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? clamp(y / max, 0, 1) : 0;
    if (Math.abs(p - lastP) > .0015){
      lastP = p;
      bar.style.transform = `scaleX(${p})`;
      top.style.setProperty('--sp', p.toFixed(3));         // 閱讀進度環
    }
    const vg = Math.round(clamp(Math.abs(v) / 60, 0, 1) * 5) / 5;
    if (vg !== lastVg){ lastVg = vg; bar.style.setProperty('--vg', String(vg)); }
    top.classList.toggle('on', y > innerHeight * 1.2);
    // 黃底上的黃鈕等於隱形 → 壓到黃色區塊時反相（每 6 幀判一次就夠，不必每幀讀版面）
    if ((chrome.n = (chrome.n || 0) + 1) % 6 === 0){
      top.classList.toggle('inv', yellow.some(sec => {
        const b = sec.getBoundingClientRect(); return b.top < cy && b.bottom > cy;
      }));
    }
  });
}

/* ═════ 17 · HERO 背景方格（波浪起伏 + 游標感應）═════ */
function cellGrid(){
  const host = $('#hero');
  if (!host) return;
  const WORDS = 50;
  // 用格子座標雜湊選詞：同一格永遠是同一個字，相鄰格不會重複
  const wordIdx = (r, c) => ((r * 7 + c * 13) % WORDS) + 1;

  const grid = document.createElement('div');
  grid.className = 'cell-grid';
  grid.setAttribute('aria-hidden', 'true');
  // 必須排在 .backdrop 之後 —— backdrop 是不透明漸層，會把方格整片蓋掉
  const bd = host.querySelector('.backdrop');
  if (bd && bd.nextSibling) host.insertBefore(grid, bd.nextSibling);
  else host.appendChild(grid);

  let cells = [], cols = 0, rows = 0;
  let ptLayer = null;
  let said = null;                 // 目前正在浮字的那一格（relabelCells 也要讀）

  const build = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;

    /* 蜂窩排列（尖頂六角形）—— 幾何與 assets/img/honeycomb.svg 對齊：
       寬 W、高 H = W·2/√3，水平間距 W+gap，垂直間距 0.75H+gap，奇數列右移半格。
       交錯列沒辦法用 CSS grid 表達，所以逐格絕對定位。 */
    const small = w <= 720;
    const W  = small ? 36 : 54;
    const H  = Math.round(W * 2 / Math.sqrt(3));      // 36→42, 54→62
    const PX = W + (small ? 3 : 4);                   // 39 / 58
    const PY = Math.round(H * 0.75) + (small ? 3 : 4);// 35 / 51

    cols = Math.ceil(w / PX) + 1;                     // +1 讓奇數列右移後仍蓋滿右緣
    rows = Math.ceil(h / PY) + 1;
    const x0 = (w - cols * PX) / 2;                   // 置中，左右溢出量相同
    const y0 = (h - rows * PY) / 2;

    const frag = document.createDocumentFragment();
    for (let r = 0; r < rows; r++){
      for (let c = 0; c < cols; c++){
        const cell = document.createElement('span');
        cell.className = 'cell';
        cell.style.left = (x0 + c * PX + (r & 1 ? PX / 2 : 0) - W / 2 + PX / 2).toFixed(1) + 'px';
        cell.style.top  = (y0 + r * PY - H / 2 + PY / 2).toFixed(1) + 'px';
        // 兩道波：位移走正對角、明暗走反對角，交錯出有機起伏
        // 負值 → 一載入就已在進行中，不會全部從同一相位開始
        cell.style.setProperty('--d1', `-${((c + r) * 0.09).toFixed(2)}s`);
        cell.style.setProperty('--d2', `-${((r - c + cols) * 0.14).toFixed(2)}s`);
        cell.dataset.wi = wordIdx(r, c);
        cell.dataset.w  = t('word.' + cell.dataset.wi);
        frag.appendChild(cell);
      }
    }
    grid.replaceChildren(frag);
    if (wordEl)  grid.appendChild(wordEl);       // replaceChildren 會清掉這兩層，補回來
    if (ptLayer) grid.appendChild(ptLayer);
    cells = $$('.cell', grid).map(el => ({ el, x:0, y:0, p:0, hot:false }));
    requestAnimationFrame(cache);
  };

  // 切語系只換字串，不動 DOM 結構（450 格重建太貴）
  relabelCells = () => {
    for (const c of cells) c.el.dataset.w = t('word.' + c.el.dataset.wi);
    if (said && wordEl) wordEl.textContent = t('word.' + said.el.dataset.wi);
  };

  // 快取每格中心點，pointermove 時就不必再讀版面
  const cache = () => {
    const gb = grid.getBoundingClientRect();
    cells.forEach(c => {
      const r = c.el.getBoundingClientRect();
      c.x = r.left - gb.left + r.width / 2;
      c.y = r.top  - gb.top  + r.height / 2;
    });
  };

  /* ── 觸碰時浮現的字：整個網格只用一個節點，跟著游標所在格移動 ──
     不做成 .cell::after，因為格子本身有 opacity 波動動畫，字會跟著忽明忽暗 */
  const wordEl = document.createElement('b');
  wordEl.className = 'cell-word';
  wordEl.setAttribute('aria-hidden', 'true');
  grid.appendChild(wordEl);

  /* ── 觸碰粒子 ── */
  ptLayer = document.createElement('div');
  ptLayer.className = 'cell-particles';
  grid.appendChild(ptLayer);
  let alive = 0, lastEmit = 0;
  const emit = (x, y, n0) => {
    if (alive >= 34) return;                       // 同時存活上限，避免堆積
    const n = n0 || (1 + (Math.random() < .45 ? 1 : 0));
    for (let i = 0; i < n; i++){
      const pt = document.createElement('i');
      pt.className = 'pt';
      pt.style.left = (x - 2) + 'px';
      pt.style.top  = (y - 2) + 'px';
      ptLayer.appendChild(pt);
      alive++;
      const a = Math.random() * Math.PI * 2;
      const dist = 26 + Math.random() * 54;
      const anim = pt.animate([
        { transform:'translate(0,0) scale(1)',   opacity:.9 },
        { transform:`translate(${(Math.cos(a)*dist).toFixed(1)}px,`
                  + `${(Math.sin(a)*dist - 14).toFixed(1)}px) scale(.2)`, opacity:0 }
      ], { duration: 620 + Math.random() * 420, easing:'cubic-bezier(.16,1,.3,1)' });
      anim.onfinish = () => { pt.remove(); alive--; };
      anim.oncancel = () => { pt.remove(); alive--; };
    }
  };

  if (!REDUCED && !COARSE){
    const R = 170, R2 = R * R;
    let raf = 0, mx = -9999, my = -9999;
    const paint = () => {
      raf = 0;
      let best = 0, near = null;
      for (const c of cells){
        const dx = c.x - mx, dy = c.y - my;
        const d2 = dx * dx + dy * dy;
        let p = 0;
        if (d2 < R2){ const d = Math.sqrt(d2) / R; p = (1 - d) * (1 - d); }  // 二次衰減，邊緣更柔
        if (Math.abs(p - c.p) > .01){
          c.p = p;
          c.el.style.setProperty('--p', p.toFixed(3));
          // 昂貴的 color-mix / calc 只掛在附近這十幾格上
          const hot = p > .004;
          if (hot !== c.hot){ c.hot = hot; c.el.classList.toggle('hot', hot); }
        }
        if (c.p > best){ best = c.p; near = c; }
      }
      // 只認游標正下方那一格，避免一次跳出十幾個詞
      const say = best > .58 ? near : null;
      if (say !== said){
        said = say;
        if (say){
          wordEl.textContent = t('word.' + say.el.dataset.wi);
          wordEl.style.transform = `translate3d(${say.x.toFixed(1)}px,${say.y.toFixed(1)}px,0) translate(-50%,-50%)`;
          wordEl.classList.add('on');
        } else {
          wordEl.classList.remove('on');
        }
      }
    };
    host.addEventListener('pointermove', e => {
      const gb = grid.getBoundingClientRect();
      mx = e.clientX - gb.left; my = e.clientY - gb.top;
      if (!raf) raf = requestAnimationFrame(paint);
      const now = performance.now();
      if (now - lastEmit > 55){ lastEmit = now; emit(mx, my); }   // 節流，避免每幀都生
    });
    host.addEventListener('pointerleave', () => {
      mx = my = -9999;
      if (!raf) raf = requestAnimationFrame(paint);
    });
  }

  build();
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 220); });
  /* 對外的因果 API：閃電劈下、蜜蜂出拳、定時重播都會在蜂窩上留下一圈漣漪。
     以事件傳遞，呼叫端不必持有 cellGrid 的內部狀態。 */
  const ripple = (x, y, R) => {
    if (REDUCED) return;
    const r0 = R || 460;
    let n = 0;
    for (const c of cells){
      const d = Math.hypot(c.x - x, c.y - y);
      if (d > r0) continue;
      if (++n > 120) break;                         // 上限：同時亮的格數＝每幀的重繪數
      setTimeout(() => {
        c.p = (1 - d / r0) * .95;
        c.el.style.setProperty('--p', c.p.toFixed(3));
        c.hot = true; c.el.classList.add('hot', 'ping');
        setTimeout(() => {
          c.p = 0; c.hot = false;
          c.el.style.setProperty('--p', '0'); c.el.classList.remove('hot', 'ping');
        }, 520);
      }, d * .85);
    }
    emit(x, y, 6);
  };
  listen('cell', host, 'bee:ripple', e => ripple(e.detail.x, e.detail.y, e.detail.r));

}

/* ═════ 11 · 區塊 01 的遙測面板 ═════
   語意對應標題：階梯線＝「數學要準」(離散、可量)，平滑曲線＝「美術要動」(連續、流動)。
   波形一次畫兩倍寬、只位移一倍寬 → 走完剛好接回原點，無縫且零逐幀運算。
   數字是示意值，不是真實指標。 */
function aboutViz(){
  const viz = $('.viz'); if (!viz) return;
  const plot = $('.viz-plot', viz), cv = $('.viz-cv', viz);
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const YEL = '#FFC700', GRY = '#9A9AA2';

  /* ── 畫布尺寸（跟語言寬度連動）── */
  let W = 0, H = 0;
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = plot.clientWidth; H = plot.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  new ResizeObserver(() => { size(); prime(); if (REDUCED) draw(clock); }).observe(plot);

  /* ── 兩種物理，各自的節奏 ──
     A 彈跳球：重力 + 落地反彈（能量每次打八折），彈不動了就補一腳 → 弧線一次比一次矮，再突然拉高
     B 彈簧  ：欠阻尼振盪 a = -k·x - c·v，衰到快停時再激發一次 → 正弦慢慢收斂，再猛地張開 */
  const A = { y: 1, v: 0 };                       // 0 = 地面, 1 = 頂
  const B = { x: 0, v: 5.2 };                     // 位移（-1..1）
  const G = 4.6, REST = 0.80, KICK = 3.05;        // 重力／反彈係數／補力初速（單位：高度/秒）
  const K = 21, C = 0.62, SPRING_KICK = 5.2;
  const stepA = dt => {
    A.v -= G * dt; A.y += A.v * dt;
    if (A.y <= 0){ A.y = 0; A.v = -A.v * REST; if (A.v < 0.9) A.v = KICK; }
    if (A.y > 1){ A.y = 1; A.v = -Math.abs(A.v) * 0.5; }
  };
  const stepB = dt => {
    const acc = -K * B.x - C * B.v;
    B.v += acc * dt; B.x += B.v * dt;
    if (Math.abs(B.x) < 0.05 && Math.abs(B.v) < 0.45) B.v = SPRING_KICK * (B.v < 0 ? -1 : 1);
  };
  const PAD = 10;
  const yA = () => H - PAD - A.y * (H - PAD * 2);
  const yB = () => H / 2 - B.x * (H * 0.33);

  /* ── 軌跡：線頭固定在 70% 寬，舊樣本往左流 ── */
  const SPEED = 64;                               // px/s
  const headX = () => W * 0.70;
  const trA = [], trB = [];                       // {t, y}
  const keep = () => headX() / SPEED + 0.6;       // 線頭到左緣需要的秒數（多留一點給淡出區）

  /* ── 粒子 ── */
  const sparks = []; const rings = []; const hits = [];     // hits：留在軌跡上的命中標記 {t, y}
  let hitCount = 0, emoPeak = 0;
  const rd = { hit: $('[data-viz="hit"]', viz), emo: $('[data-viz="emo"]', viz), vol: $('[data-viz="vol"]', viz) };
  const burst = (x, y, big) => {
    const n = big ? 22 : 11;
    for (let i = 0; i < n; i++){
      const a = Math.random() * Math.PI * 2, sp = (big ? 90 : 60) * (0.35 + Math.random());
      sparks.push({ x, y, vx: Math.cos(a) * sp - SPEED * 0.6, vy: Math.sin(a) * sp - 20,
                    life: 0, ttl: 0.55 + Math.random() * 0.5, r: big ? 1.6 + Math.random() * 1.4 : 1 + Math.random(),
                    c: Math.random() < 0.72 ? YEL : '#FFFFFF' });
    }
    rings.push({ x, y, life: 0, ttl: big ? 0.6 : 0.42, big });
  };

  let last = 0, prevSign = 0, lastCross = -1, visible = false, raf = 0;
  let clock = 0, primed = false;                 // 模擬時鐘（ms）；primed＝已用真實寬度預跑過
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; if (visible) kick(); }),
    { threshold: 0 }).observe(viz);

  const draw = now => {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    const hx = headX();
    // 背景淡網格：跟著軌跡往左流，有「時間在走」的感覺
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.055)'; ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
    const gx = 44, off = (now / 1000 * SPEED) % gx;
    for (let x = -off; x <= W; x += gx){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    [0.25, 0.5, 0.75].forEach(f => { ctx.beginPath(); ctx.moveTo(0, H * f); ctx.lineTo(W, H * f); ctx.stroke(); });
    ctx.restore();

    const path = (tr, style) => {
      ctx.save(); ctx.beginPath();
      let first = true;
      for (const s of tr){
        const x = hx - (now - s.t) / 1000 * SPEED;
        if (x < -4) continue;
        if (first){ ctx.moveTo(x, s.y); first = false; } else ctx.lineTo(x, s.y);
      }
      style(); ctx.stroke(); ctx.restore();
    };
    // 灰：虛線（離散）
    path(trA, () => { ctx.strokeStyle = GRY; ctx.lineWidth = 1.4; ctx.globalAlpha = .75; ctx.setLineDash([4, 5]); ctx.lineJoin = 'round'; });
    // 黃：實線＋光暈（連續）
    path(trB, () => { ctx.strokeStyle = YEL; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.shadowColor = 'rgba(255,199,0,.55)'; ctx.shadowBlur = 10; });

    // 線頭光點
    const ya = trA.length ? trA[trA.length - 1].y : yA(), yb = trB.length ? trB[trB.length - 1].y : yB();
    ctx.save();
    ctx.fillStyle = GRY; ctx.beginPath(); ctx.arc(hx, ya, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = YEL; ctx.shadowColor = YEL; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(hx, yb, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 命中標記：留在交叉點上、跟著軌跡往左流、越舊越淡
    for (const h of hits){
      const x = hx - (now - h.t) / 1000 * SPEED; if (x < -6) continue;
      const age = (now - h.t) / 1000, k = Math.max(0.18, 1 - age / 7);
      ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = YEL; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, h.y, 3.2, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,199,0,.35)'; ctx.beginPath(); ctx.arc(x, h.y, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // 粒子與環
    for (const p of sparks){
      const k = 1 - p.life / p.ttl; ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + k * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const r of rings){
      const k = r.life / r.ttl; ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = YEL; ctx.lineWidth = r.big ? 1.6 : 1.1;
      ctx.beginPath(); ctx.arc(r.x, r.y, 3 + k * (r.big ? 26 : 16), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  /* 原本三個讀數每 160ms 都重播一次 .tick，數字持續閃黃、上下抖，眼睛停不住，
     真正的「命中」也淹沒在雜訊裡。改成：只有命中才閃，數值走平滑包絡。 */
  const setText = (el, txt, p) => {
    if (!el) return;
    if (el.textContent !== txt) el.textContent = txt;
    if (p != null) el.parentElement.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
  };
  const flash = el => { if (!el) return; el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); };
  let volEnv = 0, emoShown = 0;
  const step = (now, fixedDt) => {
    let dt = fixedDt != null ? fixedDt : (last ? (now - last) / 1000 : 1 / 60); last = now;
    dt = Math.min(dt, 0.05);
    clock += dt * 1000;
    stepA(dt); stepB(dt);
    const a = yA(), b = yB();
    trA.push({ t: clock, y: a }); trB.push({ t: clock, y: b });
    const cut = clock - keep() * 1000;
    while (trA.length && trA[0].t < cut) trA.shift();
    while (trB.length && trB[0].t < cut) trB.shift();
    while (hits.length && hits[0].t < cut) hits.shift();
    emoPeak = Math.max(Math.abs(B.x), emoPeak * 0.985);   // 情緒峰值：慢慢回落的包絡
    // 波動＝彈跳球速度的平滑包絡（原本直接寫瞬時高度，所以在 5%↔89% 之間亂跳）
    volEnv = lerp(volEnv, clamp(Math.abs(A.v) / 2.6, 0, 1), 1 - Math.exp(-dt / 1.6));
    if (fixedDt == null && (clock - (step.lastRead || 0)) > 240){
      step.lastRead = clock;
      const emo = Math.min(1, emoPeak);
      // 顯示「目前軌跡上看得到的命中數」，數字才跟畫面上的點對得起來（原本是無上限累加器）
      setText(rd.hit, String(hits.length).padStart(2, '0'), Math.min(1, hits.length / 8));
      // 情緒峰值只在真的刷新高點時才跳動與強調
      if (Math.round(emo * 100) > emoShown + 2){ emoShown = Math.round(emo * 100); flash(rd.emo); }
      else emoShown = Math.max(0, emoShown - 1);
      setText(rd.emo, emoShown + '%', emoShown / 100);
      setText(rd.vol, Math.round(volEnv * 100) + '%', volEnv);
    }

    // 交叉偵測：兩條線頭的高低關係翻轉的那一幀就是交叉瞬間
    const sign = Math.sign(a - b);
    if (prevSign && sign && sign !== prevSign && clock - lastCross > 420){
      lastCross = clock;
      const y = (a + b) / 2;
      const big = Math.abs(y - H / 2) < H * 0.12;
      burst(headX(), y, big);                            // 在正中央交會＝「完美交叉」，放大招
      hits.push({ t: clock, y }); hitCount++;
      cv.dataset.cross = String(hitCount);
      if (!REDUCED){                                     // 讓命中外溢到面板與標題，不再只留在畫布裡
        viz.classList.remove('hit', 'hit--big'); void viz.offsetWidth;
        viz.classList.add('hit'); if (big) viz.classList.add('hit--big');
        setTimeout(() => viz.classList.remove('hit', 'hit--big'), 760);
        flash(rd.hit);
        if (big){ const pr = plot.getBoundingClientRect();
          burstAt(pr.left + pr.width * .70, pr.top + pr.height / 2,
                  { n:12, dist:52, size:3.5, lift:10, ms:700 }); }
        if (big){ const sec = $('#about'); if (sec){ sec.classList.add('flash'); setTimeout(() => sec.classList.remove('flash'), 650); } }
      }
    }
    prevSign = sign;

    // 粒子物理：微重力、阻力、跟著軌跡往左飄
    for (const p of sparks){ p.life += dt; p.vy += 110 * dt; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life >= sparks[i].ttl) sparks.splice(i, 1);
    for (const r of rings) r.life += dt;
    for (let i = rings.length - 1; i >= 0; i--) if (rings[i].life >= rings[i].ttl) rings.splice(i, 1);
    draw(clock);
  };

  const preroll = () => {
    for (let t = 0; t < keep(); t += 1 / 60) step(0, 1 / 60);
    sparks.length = 0; rings.length = 0; last = 0;
  };
  const prime = () => { if (!primed && W > 0){ primed = true; preroll();
    if (REDUCED){ draw(clock);
      setText(rd.hit, String(hits.length).padStart(2, '0'), Math.min(1, hits.length / 8));
      setText(rd.emo, Math.round(Math.min(1, emoPeak) * 100) + '%', Math.min(1, emoPeak));
      setText(rd.vol, Math.round(volEnv * 100) + '%', volEnv); } } };
  const loop = now => {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    if (!primed){ size(); prime(); if (!primed){ raf = requestAnimationFrame(loop); return; } }
    step(now); raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf && !REDUCED) raf = requestAnimationFrame(loop); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  /* 這個彈簧＋彈跳球是全站最適合「戳一下」的東西，原本卻連一個 listener 都沒有 */
  const poke = dir => {
    if (REDUCED) return;
    A.v = Math.abs(A.v) * .6 + 2.4;                 // 球高彈
    B.v += 3.2 * (dir || 1);                        // 彈簧猛張
    burst(headX(), yB(), true);
    plot.classList.remove('poke'); void plot.offsetWidth; plot.classList.add('poke');
    setTimeout(() => plot.classList.remove('poke'), 460);
    kick();
  };
  listen('viz', plot, 'pointerdown', e => {
    const r = plot.getBoundingClientRect();
    poke(e.clientX < r.left + r.width / 2 ? -1 : 1);
  });
  if (!REDUCED && !COARSE){
    // hover 時模擬加速、面板跟著游標微傾（transform 由 CSS 讀 --rx/--ry）
    listen('viz', viz, 'pointermove', e => {
      const r = viz.getBoundingClientRect();
      viz.style.setProperty('--rx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      viz.style.setProperty('--ry', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
    listen('viz', viz, 'pointerleave', () => { viz.style.removeProperty('--rx'); viz.style.removeProperty('--ry'); });
  }
  every('viz', 8000, () => { if (!document.hidden && visible) poke(Math.random() < .5 ? -1 : 1); });

  prime();                                        // 一載入就量得到寬度的話，先把軌跡跑滿
  if (!REDUCED) kick();

}

/* ═════ 11b · 橫幅進場編排：原本捲到就整片攤開，零層次也不重播 ═════ */
function bannerIntro(){
  dispose('bIntro');
  const sec = $('.sec.banner');
  if (!sec) return;
  // 觸碰回饋：手機沒有 hover，按下去必須看得到反應
  listen('bIntro', sec, 'pointerdown', e => {
    const tile = e.target.closest('.lane-tile');
    if (!tile) return;
    tile.classList.add('is-tap');
    burstAt(e.clientX, e.clientY, { n:8, dist:30, size:3.5, lift:12, ms:560 });
    setTimeout(() => tile.classList.remove('is-tap'), 620);
  }, { passive:true });
  if (REDUCED) return;
  const stamp = () => {
    // 只排「此刻看得到」的磚，離場的磚不必浪費延遲
    $$('.lane', sec).forEach((lane, li) => {
      const tiles = $$('.lane-tile', lane).filter(t => {
        const r = t.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth;
      });
      tiles.sort((p, q) => (li ? -1 : 1) * (p.getBoundingClientRect().left - q.getBoundingClientRect().left));
      tiles.forEach((t, i) => t.style.setProperty('--tin', (120 + li * 260 + i * 45) + 'ms'));
    });
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){ if (sec.classList.contains('in')) return; stamp(); sec.classList.add('in'); }
    else if (e.boundingClientRect.top > innerHeight){
      sec.classList.remove('in');
      $$('.lane-tile', sec).forEach(t => t.style.removeProperty('--tin'));
    }
  }), { threshold:0, rootMargin:'0px 0px -8px 0px' });
  io.observe(sec);
  onDispose('bIntro', () => io.disconnect());
}

/* ═════ 11c · 橫幅吉祥物：定時跳一下，落地震得腳邊的磚依序彈起 ═════ */
function bannerBee(){
  dispose('bBee');
  const bee = $('.banner-char .bee'), sec = $('.sec.banner');
  if (!bee || !sec) return;

  const shock = () => {
    const br = bee.getBoundingClientRect(), bx = br.left + br.width / 2;
    // 落地那一下：腳底往兩側噴塵（黑色顆粒，黃底上才看得見）
    burstAt(bx, br.bottom - 6, { n:9, dist:52, size:4, lift:2, spread:Math.PI * .9, dir:Math.PI, dark:true, ms:640 });
    burstAt(bx, br.bottom - 6, { n:9, dist:52, size:4, lift:2, spread:Math.PI * .9, dir:0, dark:true, ms:640 });
    $$('#laneB .lane-tile').map(t => ({ t, d: Math.abs(t.getBoundingClientRect().left + 75 - bx) }))
      .filter(o => o.d < 520).sort((p, q) => p.d - q.d).slice(0, 9)
      .forEach((o, i) => setTimeout(() => {
        o.t.classList.add('shock');
        if (i < 4) burstOn(o.t, .5, 0, { n:4, dist:24, size:3, lift:10, ms:520 });   // 被震得最兇的幾塊冒火花
        setTimeout(() => o.t.classList.remove('shock'), 640);
      }, i * 35));
    const hot = $('.banner-comb--hot', sec);
    if (hot){
      const r = sec.getBoundingClientRect();
      hot.style.setProperty('--hx', (br.left - r.left + br.width / 2).toFixed(0) + 'px');
      hot.style.setProperty('--hy', (br.bottom - r.top).toFixed(0) + 'px');
      hot.style.setProperty('--hr', '280px');
      hot.classList.add('on'); setTimeout(() => hot.classList.remove('on'), 640);
    }
  };
  const hop = () => {
    if (REDUCED) return;
    bee.classList.remove('hop'); void bee.offsetWidth; bee.classList.add('hop');
    setTimeout(shock, 570);
    setTimeout(() => bee.classList.remove('hop'), 970);
  };
  listen('bBee', bee, 'click', hop);
  if (!REDUCED) every('bBee', 11000, () => {
    if (document.hidden) return;
    const r = sec.getBoundingClientRect();
    if (r.bottom < innerHeight * .25 || r.top > innerHeight * .85) return;
    hop();
  });
  if (!REDUCED && !COARSE){                       // 看向游標
    let lean = 0, target = 0;
    listen('bBee', sec, 'pointermove', e => {
      const b = bee.getBoundingClientRect();
      target = clamp((e.clientX - (b.left + b.width / 2)) / 46, -7, 7);
    });
    listen('bBee', sec, 'pointerleave', () => { target = 0; });
    frame('bBee', () => {
      if (Math.abs(lean - target) < .02) return;
      lean = lerp(lean, target, .09); bee.style.rotate = lean.toFixed(2) + 'deg';
    });
  }
  /* 手機沒有 hover：每 6 秒讓磚自己起一次浪，畫面自己在演 */
  if (COARSE && !REDUCED) every('bBee', 6000, () => {
    if (document.hidden) return;
    const r = sec.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const lane = Math.random() < .5 ? '#laneA' : '#laneB';
    $$(lane + ' .lane-tile').filter(t => { const b = t.getBoundingClientRect(); return b.left > -40 && b.right < innerWidth + 40; })
      .slice(0, 4).forEach((t, i) => setTimeout(() => {
        t.classList.add('shock'); setTimeout(() => t.classList.remove('shock'), 620); }, i * 90));
  });
}

/* ═════ 12 · 蜂窩底紋的觸碰效果 ═════
   底層持續平移；亮層是同一組蜂窩，用跟著游標的圓形遮罩讓附近的格子亮起來。
   兩層必須共用同一條時間軸，否則格子會對不齊 —— 用 startTime 明確對齊。 */
function combHover(){
  dispose('comb');
  const pairs = $$('.banner-comb--hot').map(hot => ({
    hot, run: hot.querySelector('.comb-run'),
    base: hot.previousElementSibling, sec: hot.closest('.sec')
  })).filter(p => p.run && p.base && p.base.classList.contains('banner-comb') && p.sec);
  if (!pairs.length) return;

  for (const p of pairs){
    // 對齊兩層的動畫起點
    const [ba] = p.base.getAnimations(), [ha] = p.run.getAnimations();
    if (ba && ha && ba.startTime != null) ha.startTime = ba.startTime;

    if (REDUCED) continue;
    /* 原本每幀把游標座標直接寫進遮罩、半徑固定 200px，亮區硬貼著指標又很淡，
       幾乎察覺不到。改成有慣性的追隨，半徑隨移動速度脹縮。 */
    let raf = 0, x = 0, y = 0, tx = 0, ty = 0, r0 = 190, lastT = 0, idle = 0;
    const paint = () => {
      const dx = tx - x, dy = ty - y;
      x += dx * .16; y += dy * .16; r0 = lerp(r0, 190, .07);
      p.hot.style.setProperty('--hx', x.toFixed(0) + 'px');
      p.hot.style.setProperty('--hy', y.toFixed(0) + 'px');
      p.hot.style.setProperty('--hr', r0.toFixed(0) + 'px');
      raf = (Math.abs(dx) + Math.abs(dy) > .4 || Math.abs(r0 - 190) > .6) ? requestAnimationFrame(paint) : 0;
    };
    listen('comb', p.sec, 'pointermove', e => {
      const r = p.sec.getBoundingClientRect();
      const nx = e.clientX - r.left, ny = e.clientY - r.top, now = performance.now();
      const sp = lastT ? Math.hypot(nx - tx, ny - ty) / Math.max(1, now - lastT) * 16 : 0;
      lastT = now; idle = now;
      r0 = clamp(190 + sp * 12, 190, 300);
      tx = nx; ty = ny;
      p.hot.classList.add('on');
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive:true });
    listen('comb', p.sec, 'pointerleave', () => { p.hot.classList.remove('on'); }, { passive:true });
    // 點一下：一圈六角光環從指尖擴散
    listen('comb', p.sec, 'pointerdown', () => {
      p.hot.classList.remove('ping'); void p.hot.offsetWidth; p.hot.classList.add('ping');
      setTimeout(() => p.hot.classList.remove('ping'), 760);
    }, { passive:true });
    // 手機／閒置：蜂窩像被蜜蜂的雷達掃過一遍
    every('comb', 9000, () => {
      if (!COARSE) return;            // 桌機有 hover 可用，不必付這個代價
      if (document.hidden || performance.now() - idle < 6000) return;
      const r = p.sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const w = r.width, h = r.height, t0 = performance.now();
      ty = h * .5; p.hot.classList.add('on');
      const sweep = () => {
        const k = clamp((performance.now() - t0) / 1900, 0, 1);
        x = tx = w * (.92 - k * .88);
        p.hot.style.setProperty('--hx', x.toFixed(0) + 'px');
        p.hot.style.setProperty('--hy', ty.toFixed(0) + 'px');
        p.hot.style.setProperty('--hr', '270px');
        if (k < 1) requestAnimationFrame(sweep); else p.hot.classList.remove('on');
      };
      requestAnimationFrame(sweep);
    });
  }
}

/* ═════ 圖片預熱 ═════
   輪播卡片用 lazy 載入以免拖慢首屏，但輪播一直在跑，
   等首屏跑完再趁瀏覽器閒置把剩下的圖抓回來，避免轉到一半是空卡。 */
function warmImages(){
  const urls = [];
  HERO.forEach(g => { urls.push(g.bg, g.ch); });
  OFFER.forEach(g => { urls.push(g.bg, g.ch); });
  const uniq = [...new Set(urls)];
  let i = 0;
  const idle = window.requestIdleCallback || (fn => setTimeout(() => fn({timeRemaining:()=>8}), 200));
  const step = deadline => {
    while (i < uniq.length && (deadline.timeRemaining() > 4 || deadline.didTimeout)) {
      const im = new Image(); im.decoding = 'async'; im.src = uniq[i++];
    }
    if (i < uniq.length) idle(step, { timeout: 1500 });
  };
  idle(step, { timeout: 1500 });
}

/* ═════ 啟動 ═════ */
const boot = () => {
  LANG = pickInitialLang();
  langSwitcher();

  nav(); contactModal(); marquees(); hero(); lanes(); lists();
  soon(); soonCopy(); offer(); orgChart(); scoreboard(); counters(); parallax(); aboutViz(); combHover();
  heroBee(); boltStrike(); bannerIntro(); bannerBee(); sectionPulse();
  heroParallax(); spotlight(); magnetic(); chrome(); cellGrid();
  reveals(); heroChoreo();

  // 切換語系時要重建的區塊（內含由 JS 產生的文字）
  rebuilders = [() => { hero(); lists(); soon(); offer(); orgChart(); scoreboard();
                        counters(); spotlight(); magnetic(); relabelCells();
                        bannerIntro(); bannerBee(); }];

  applyI18n();
  requestAnimationFrame(() => document.body.classList.add('ready'));
  tick();

  // 首屏渲染完才開始預熱，不跟關鍵資源搶頻寬
  if (document.readyState === 'complete') setTimeout(warmImages, 900);
  else addEventListener('load', () => setTimeout(warmImages, 900), { once:true });
};
document.readyState === 'loading' ? addEventListener('DOMContentLoaded', boot) : boot();
})();
