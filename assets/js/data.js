/* ═══════════════════════════════════════════════════════════
   BeeBix Landing — 內容資料
   -----------------------------------------------------------
   與 Figma「設計beebix」頁 1:1 對應。
   文字一律存 i18n key（見 i18n.js），三語連動。
   圖片路徑集中在此，之後換自有美術只改這支檔案。
   ═══════════════════════════════════════════════════════════ */
const G = 'assets/gen-img/';   // 本站自製美術（Magnific 生成）

/* ── 自製遊戲美術總表（29 款）──────────────────────────────
   標題刻意與圖上的 logo 一致，卡片文字和畫面才對得起來。
   作品集／橫幅跑道／即將上線都從這份表取用。 */
const GAMES = [
  { t:'Honey Vault',     f:'honey-vault'     }, { t:'Dragon Coin',    f:'dragon-coin'    },
  { t:'Pharaoh Hive',    f:'pharaoh-hive'    }, { t:'Neon Samurai',   f:'neon-samurai'   },
  { t:'Frost Queen',     f:'frost-queen'     }, { t:'Pirate Bounty',  f:'pirate-bounty'  },
  { t:'Jungle Beat',     f:'jungle-beat'     }, { t:'Cosmic Spin',    f:'cosmic-spin'    },
  { t:'Sweet Rush',      f:'sweet-rush'      }, { t:'Mahjong Gold',   f:'mahjong-gold'   },
  { t:'Zeus Thunder',    f:'zeus-thunder'    }, { t:'Fortune Cats',   f:'fortune-cats'   },
  { t:'Striker Fever',   f:'striker-fever'   }, { t:'Volcano Blaze',  f:'volcano-blaze'  },
  { t:'Golden Koi',      f:'golden-koi'      }, { t:'Bass Hunter',    f:'bass-hunter'    },
  { t:'Vault Break',     f:'vault-break'     }, { t:'Money Reels',    f:'money-reels'    },
  { t:'Vine of Plenty',  f:'vine-of-plenty'  }, { t:'Bronco Ranch',   f:'bronco-ranch'   },
  { t:'Deep Sea Cash',   f:'deep-sea-cash'   }, { t:'Splash Riches',  f:'splash-riches'  },
  { t:'Phoenix Reign',   f:'phoenix-reign'   }, { t:'Genie Wishes',   f:'genie-wishes'   },
  { t:'Moonlit Romance', f:'moonlit-romance' }, { t:'Choco Bomb',     f:'choco-bomb'     },
  { t:'Feather Fortune', f:'feather-fortune' }, { t:'Treasure Stacks',f:'treasure-stacks'},
  { t:'Nova Core',       f:'nova-core'       }
];
const gimg = g => G + g.f + '.webp';

/* ── Hero 角色卡（背景 + 去背角色兩層，前端做交錯視差）·自動輪播 12 張 ──
   角色圖上方留了透明帶，CSS 的 height:118% 裁掉頂端時才不會切到頭。 */
const HERO_SET = [
  { t:'Zeus Thunder',  f:'zeus-thunder', tag:'tag.slots'   },
  { t:'Honey Vault',   f:'honey-vault',  tag:'tag.slots'   },
  { t:'Neon Samurai',  f:'neon-samurai', tag:'tag.slots'   },
  { t:'Frost Queen',   f:'frost-queen',  tag:'tag.slots'   },
  { t:'Dragon Coin',   f:'dragon-coin',  tag:'tag.slots'   },
  { t:'Fortune Cats',  f:'fortune-cats', tag:'tag.slots'   },
  { t:'Velvet Table',  f:'velvet-table', tag:'tag.live'    },
  { t:'Dealer\u2019s Table', f:'dealer-table', tag:'tag.live' },
  { t:'Neon Cashout',  f:'neon-cashout', tag:'tag.instant' },
  { t:'Mine Pop',      f:'mine-pop',     tag:'tag.instant' },
  { t:'Hive Rewards',  f:'hive-rewards', tag:'tag.rewards' },
  { t:'Jungle Beat',   f:'jungle-beat',  tag:'tag.slots'   }
];
const HERO = HERO_SET.map(h => ({
  t:h.t, tag:h.tag, bg:G+'hero-'+h.f+'-bg.webp', ch:G+'hero-'+h.f+'-char.webp'
}));

/* ── 橫幅跑道縮圖（兩排反向捲動，交錯取樣避免兩排長得一樣）─── */
/* ── 橫幅跑道：多樣工具 × 全方位服務（40 種服務圖示，線條風格統一 24×24）── */
const ICONS = {
  server:   '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><circle cx="7" cy="7.5" r="1" fill="currentColor"/><circle cx="7" cy="16.5" r="1" fill="currentColor"/><path d="M11 7.5h7M11 16.5h7"/>',
  sigma:    '<path d="M17 5.5H7.5l5.5 6.5-5.5 6.5H17"/><path d="M17 5.5v2M17 16.5v2"/>',
  wrench:   '<path d="M15.7 3.5a4.5 4.5 0 0 0-5.2 6.2L4 16.2 7.8 20l6.5-6.5a4.5 4.5 0 0 0 6.2-5.2l-2.7 2.7-2.6-.7-.7-2.6z"/>',
  pencil:   '<path d="M4 20l4.2-.9L19 8.3a1.6 1.6 0 0 0 0-2.3l-1-1a1.6 1.6 0 0 0-2.3 0L4.9 15.8z"/><path d="M13.5 6.5l4 4M4.9 15.8l3.3 3.3"/>',
  motion:   '<path d="M9.5 8v8l6.5-4z"/><path d="M3 12a9 9 0 0 1 9-9"/><path d="M21 12a9 9 0 0 1-9 9"/><path d="M12 3l-2-2M12 3l-2 2M12 21l2-2M12 21l2 2"/>',
  layout:   '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M9.5 9.5V20"/>',
  gamepad:  '<path d="M7 8h10a4 4 0 0 1 4 4v1.5a3.5 3.5 0 0 1-6.2 2.2L14 15h-4l-.8.7A3.5 3.5 0 0 1 3 13.5V12a4 4 0 0 1 4-4z"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="16" cy="11.5" r=".9" fill="currentColor"/><circle cx="18.2" cy="13.6" r=".9" fill="currentColor"/>',
  shield:   '<path d="M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6z"/><path d="M9 12l2 2 4-4.5"/>',
  chart:    '<path d="M3 20h18"/><path d="M4 15l4-4 3 3 5-6 4 2"/><circle cx="20" cy="10" r="1.2" fill="currentColor"/>',
  sound:    '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
  globe:    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
  bug:      '<path d="M9 8V6a3 3 0 0 1 6 0v2"/><rect x="7" y="8" width="10" height="11" rx="5"/><path d="M3 13h4M17 13h4M4.5 19l3-2M19.5 19l-3-2M4.5 7l3 2M19.5 7l-3 2M12 8v11"/>',
  plug:     '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v4"/>',
  cloud:    '<path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5a3.5 3.5 0 0 1 .5 7"/><path d="M12 12v9M9 15l3-3 3 3"/>',
  database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  lock:     '<rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.3" fill="currentColor"/>',
  bars:     '<path d="M3 20h18"/><rect x="5" y="11" width="3.5" height="9" rx=".8"/><rect x="10.3" y="6" width="3.5" height="14" rx=".8"/><rect x="15.5" y="14" width="3.5" height="6" rx=".8"/>',
  user:     '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  cube:     '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>',
  sparkle:  '<path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  film:     '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/>',
  phone:    '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  gauge:    '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/><circle cx="12" cy="16" r="1.4" fill="currentColor"/><path d="M4 16h2M18 16h2"/>',
  doc:      '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 12h6M10 16h6"/>',
  kanban:   '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="10" rx="1.5"/><rect x="16" y="4" width="5" height="13" rx="1.5"/>',
  headset:  '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19a3 3 0 0 1-3 2h-2"/>',
  rosette:  '<circle cx="12" cy="9" r="5.5"/><path d="M9.5 13.5L8 21l4-2 4 2-1.5-7.5"/><path d="M10 9l1.5 1.5L14.5 7.5"/>',
  wallet:   '<path d="M3 8a2 2 0 0 1 2-2h13v3"/><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M15 14h6"/><circle cx="16" cy="14" r="1" fill="currentColor"/>',
  megaphone:'<path d="M4 10v4a1 1 0 0 0 1 1h3l8 4V5L8 9H5a1 1 0 0 0-1 1z"/><path d="M19 9.5a3.5 3.5 0 0 1 0 5"/><path d="M8 15v4a1 1 0 0 0 1 1h1.5"/>',
  palette:  '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-.5-1.5.5-2.5S17 15 18.5 15A2.5 2.5 0 0 0 21 12.5 9 9 0 0 0 12 3z"/><circle cx="7.5" cy="12" r="1.2" fill="currentColor"/><circle cx="10" cy="7.5" r="1.2" fill="currentColor"/><circle cx="15" cy="7.5" r="1.2" fill="currentColor"/>',
  type:     '<path d="M5 19L11 5h2l6 14"/><path d="M8 13.5h8"/><path d="M3 19h4M17 19h4"/>',
  pen:      '<path d="M9 5l10 10-4 4L5 9z"/><path d="M5 9L3 3l6 2"/><circle cx="17.5" cy="17.5" r="2.2"/>',
  branch:   '<circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="8" r="2.2"/><path d="M6 7.2v9.6M18 10.2a6 6 0 0 1-6 6H6"/>',
  expand:   '<path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6"/>',
  trophy:   '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/><path d="M12 14v3M8.5 20h7M9.5 17h5"/>',
  rocket:   '<path d="M12 3c3 2 5 6 5 10l-2 2h-6l-2-2c0-4 2-8 5-10z"/><path d="M9 15l-3 1 1-4M15 15l3 1-1-4M10 17l-1 4 3-2 3 2-1-4"/><circle cx="12" cy="9" r="1.4"/>',
  reels:    '<rect x="3" y="6" width="5" height="12" rx="1.2"/><rect x="9.5" y="6" width="5" height="12" rx="1.2"/><rect x="16" y="6" width="5" height="12" rx="1.2"/><path d="M3 12h18" stroke-dasharray="2 2.4"/>',
  gift:     '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12"/><path d="M12 9c-2-4-6-3.5-6-1.5S9 9 12 9zm0 0c2-4 6-3.5 6-1.5S15 9 12 9z"/>',
  chip:     '<rect x="6" y="6" width="12" height="12" rx="2.5"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  nodes:    '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M12 7.2v4M12 11.2l-5.5 4.8M12 11.2l5.5 4.8"/>'
};
const SERVICES = [
  ['svc.backend','server'],   ['svc.math','sigma'],      ['svc.eng','wrench'],       ['svc.sketch','pencil'],
  ['svc.motion','motion'],    ['svc.ui','layout'],       ['svc.gamedesign','gamepad'],['svc.rng','shield'],
  ['svc.rtp','chart'],        ['svc.sound','sound'],     ['svc.l10n','globe'],       ['svc.qa','bug'],
  ['svc.api','plug'],         ['svc.cloud','cloud'],     ['svc.db','database'],      ['svc.security','lock'],
  ['svc.analytics','bars'],   ['svc.character','user'],  ['svc.3d','cube'],          ['svc.vfx','sparkle'],
  ['svc.video','film'],       ['svc.mobile','phone'],    ['svc.perf','gauge'],       ['svc.docs','doc'],
  ['svc.pm','kanban'],        ['svc.support','headset'], ['svc.compliance','rosette'],['svc.payment','wallet'],
  ['svc.marketing','megaphone'],['svc.brand','palette'], ['svc.type','type'],        ['svc.proto','pen'],
  ['svc.git','branch'],       ['svc.scale','expand'],    ['svc.jackpot','trophy'],   ['svc.liveops','rocket'],
  ['svc.reels','reels'],      ['svc.bonus','gift'],      ['svc.ai','chip'],          ['svc.cdn','nodes']
].map(([k, i]) => ({ k, i }));
const LANE_A = SERVICES.filter((_, i) => i % 2 === 0);
const LANE_B = SERVICES.filter((_, i) => i % 2 === 1);

/* ── 精選作品（弧形輪播）───────────────────────────────── */
const FEATURED = GAMES.slice(0, 20).map(g => ({ t:g.t, tag:'tag.slots', img:gimg(g) }));

/* ── 即將上線 ─────────────────────────────────────────── */
const SOON_DATES = ['26 Aug 2026','16 Sep 2026','02 Oct 2026','21 Oct 2026','11 Nov 2026',
                    '25 Nov 2026','09 Dec 2026','23 Dec 2026','13 Jan 2027','27 Jan 2027'];
const SOON = GAMES.slice(19, 29).map((g, i) => ({ t:g.t, d:SOON_DATES[i], img:gimg(g) }));

/* ── 服務項目（左清單／右預覽卡）·沿用 Hero 的背景＋角色兩層 ──── */
const pick = f => HERO.find(h => h.bg.includes(f));
const OFFER = [
  { n:'01', t:'offer.1t', d:'offer.1d', cta:'offer.1c', ...pick('zeus-thunder') },
  { n:'02', t:'offer.2t', d:'offer.2d', cta:'offer.2c', ...pick('velvet-table') },
  { n:'03', t:'offer.3t', d:'offer.3d', cta:'offer.3c', ...pick('mine-pop')     },
  { n:'04', t:'offer.4t', d:'offer.4d', cta:'offer.4c', ...pick('hive-rewards') },
  { n:'05', t:'offer.5t', d:'offer.5d', cta:'offer.5c', ...pick('dealer-table') }
];

/* ── 能力對照（區塊 03 右側）──────────────────────────── */
const CAPS = [
  ['about.cap1k', 'about.cap1v'],
  ['about.cap2k', 'about.cap2v'],
  ['about.cap3k', 'about.cap3v']
];

/* ── 自家團隊組織圖（名字為示意，職稱走 i18n）──────────── */
const ORG = {
  root: { name:'Marcus Lin', init:'ML', role:'org.r.ceo' },
  depts: [
    { k:'studio', label:'org.d.studio', blurb:'org.b.studio',
      head:{ name:'Yuki Tanaka',  init:'YT', role:'org.r.studioHead' },
      team:[{ name:'Leo Marchetti', init:'LM', role:'org.r.artDir' },
            { name:'Anong Srisuk',  init:'AS', role:'org.r.motion' },
            { name:'Chen Wei',      init:'CW', role:'org.r.gameDesign' }] },
    { k:'eng', label:'org.d.eng', blurb:'org.b.eng',
      head:{ name:'Ethan Park',   init:'EP', role:'org.r.cto' },
      team:[{ name:'Priya Raman',   init:'PR', role:'org.r.backend' },
            { name:'Daniel Ko',     init:'DK', role:'org.r.client' },
            { name:'Sofia Reyes',   init:'SR', role:'org.r.devops' }] },
    { k:'math', label:'org.d.math', blurb:'org.b.math',
      head:{ name:'Nadia Volkov', init:'NV', role:'org.r.mathHead' },
      team:[{ name:'Samuel Oduya',  init:'SO', role:'org.r.modeler' },
            { name:'Mei Huang',     init:'MH', role:'org.r.qa' }] },
    { k:'ops', label:'org.d.ops', blurb:'org.b.ops',
      head:{ name:'Olivia Grant', init:'OG', role:'org.r.opsHead' },
      team:[{ name:'Kritsada Phan', init:'KP', role:'org.r.account' },
            { name:'Hana Sato',     init:'HS', role:'org.r.liveops' }] }
  ]
};
const ORG_FACTS = [
  { n:ORG.depts.length, label:'org.depts' },
  { n:1 + ORG.depts.reduce((a, d) => a + 1 + d.team.length, 0), label:'org.people' },
  { n:SERVICES.length, label:'org.services' }
];

/* ── 品質儀表（成績單左側）───────────────────────────────
   每根支柱都要有「單位」：光寫「交付節奏 96%」沒有人看得懂 96% 是什麼的 96%。
   metric 就是那個單位，分段條量的是它。 */
const PROOF = [
  { k:'why.p1k', m:'why.m1', v:'why.p1v', d:'why.p1d', score:96 },
  { k:'why.p2k', m:'why.m2', v:'why.p2v', d:'why.p2d', score:99 },
  { k:'why.p3k', m:'why.m3', v:'why.p3v', d:'why.p3d', score:94 }
];

/* ── 數據磚（成績單下方）─────────────────────────────────
   原本四塊都套同一張「近八季走勢」長條圖，但「支援語系」「結算幣別」
   根本沒有季度成長的概念，圖跟數字對不起來，讀者只會困惑。
   改成一塊一種編碼，各自說自己的事；視覺語言統一用「一排方塊」保持整齊。
     trend  ＝ 每季一根，看成長
     dots   ＝ 每格一種語系，亮色是右至左
     split  ＝ 一條比例條，法幣 vs 加密
     cadence＝ 一年 26 個檔期，已交付幾檔 */
const STATS = [
  { n:1000, suffix:'+', label:'why.s1', cap:'why.s1c', hero:true,
    viz:'trend',   legend:'why.v1', trend:[26,33,39,48,58,70,84,100] },
  { n:40,   suffix:'+', label:'why.s2', cap:'why.s2c',
    viz:'dots',    legend:'why.v2', total:40, mark:4 },
  { n:150,  suffix:'+', label:'why.s3', cap:'why.s3c',
    viz:'split',   legend:'why.v3', parts:[118, 32] },
  { n:300,  suffix:'+', label:'why.s4', cap:'why.s4c',
    viz:'cadence', legend:'why.v4', total:26, done:22 }
];

/* ── 聯絡方式（彈窗用）────────────────────────────────────
   帳號先用佔位，之後換真的只改這裡。url 留空就只顯示「複製」，不顯示「開啟」。 */
const CONTACTS = [
  { k:'email', label:'cm.email', handle:'partners@beebix.games', url:'mailto:partners@beebix.games' },
  { k:'tg',    label:'cm.tg',    handle:'@beebix_partners',      url:'' },
  { k:'wa',    label:'cm.wa',    handle:'+66 00 000 0000',       url:'' }
];
