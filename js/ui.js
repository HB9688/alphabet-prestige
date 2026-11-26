// Darstellung: Tabs, Panel, Upgrade-Feld, Sprache, Spielschleife.
(function (AP) {
  const $ = id => document.getElementById(id);
  const t = AP.t;
  const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  // Desktop: 8 sichtbar (5 gekauft + 3 offen). Mobil (< 760 px): 2 sichtbar (1 gekauft + 1 offen; alle gekauft: die letzten 2).
  const MOBILE = window.matchMedia('(max-width: 760px)');
  const listView = () => MOBILE.matches ? { visible: 2, bought: 1 } : { visible: 8, bought: 5 };

  let game = AP.createGame(AP.loadSaved());
  let skipSave = false;
  AP.lang = game.state.lang === 'en' ? 'en' : 'de';

  // ---------- Zahlenformat ----------
  function fmt(n, digits) {
    if (n === Infinity) return '∞';
    if (!isFinite(n)) return '–';
    const a = Math.abs(n);
    const locale = AP.lang === 'en' ? 'en-US' : 'de-DE';
    if (a < 1e6) {
      const d = digits !== undefined ? digits : (a < 100 && n % 1 !== 0 ? 1 : 0);
      return n.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: d });
    }
    const e = Math.floor(Math.log10(a));
    const m = (n / Math.pow(10, e)).toFixed(2);
    return (AP.lang === 'en' ? m : m.replace('.', ',')) + 'e' + e;
  }
  const fmtAmt = n => fmt(n < 1e6 ? Math.floor(n + 1e-9) : n);

  function hexToRgba(hex, a) {
    const v = parseInt(hex.slice(1), 16);
    return 'rgba(' + (v >> 16 & 255) + ',' + (v >> 8 & 255) + ',' + (v & 255) + ',' + a + ')';
  }

  // ---------- Stufe / Farben ----------
  document.documentElement.style.setProperty('--gradient', 'linear-gradient(90deg,' + AP.PALETTE.join(',') + ')');

  function setStage(L) {
    const c = AP.colorOf(L);
    const root = document.documentElement.style;
    root.setProperty('--stage', c);
    root.setProperty('--stage-soft', hexToRgba(c, 0.12));
  }

  // ---------- Sprache ----------
  function applyLang() {
    document.documentElement.lang = AP.lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('#langSwitch button').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === AP.lang);
      b.setAttribute('aria-pressed', b.dataset.lang === AP.lang);
    });
    $('langSwitch').setAttribute('aria-label', t('language'));
    $('gearBtn').setAttribute('aria-label', t('settings'));
    $('gearBtn').title = t('settings');
    $('statsBtn').setAttribute('aria-label', t('stats'));
    $('statsBtn').title = t('stats');
    $('statsClose').setAttribute('aria-label', t('close'));
    statsKey = '';
    tabsKey = '';
    rows.forEach(r => { r.last = ''; });
  }
  document.querySelectorAll('#langSwitch button').forEach(b => b.addEventListener('click', () => {
    AP.lang = b.dataset.lang;
    game.state.lang = AP.lang;
    applyLang();
    render();
  }));

  // ---------- Tabs ----------
  let tabsKey = '';
  function renderTabs() {
    const s = game.state;
    const key = s.unlocked.join('') + '|' + s.tab + '|' + s.teaseD + '|' + AP.lang;
    if (key === tabsKey) return;
    tabsKey = key;
    const nav = $('tabs');
    nav.innerHTML = '';
    s.unlocked.forEach(L => {
      const b = document.createElement('button');
      b.className = 'tab' + (L === s.tab ? ' active' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', L === s.tab);
      b.style.setProperty('--tab-color', AP.colorOf(L));
      b.dataset.layer = L;
      b.innerHTML = '<span class="letter">' + L + '</span><span class="long">· Prestige</span>';
      b.addEventListener('click', () => switchTab(L));
      nav.appendChild(b);
    });
    const last = s.unlocked[s.unlocked.length - 1];
    const nextL = AP.LETTERS[AP.LETTERS.indexOf(last) + 1];
    if (nextL) {
      const lock = document.createElement('div');
      lock.className = 'tab locked';
      const soon = !game.LAYERS[nextL] && s.teaseD;
      lock.title = soon ? t('lockSoon', { L: nextL }) : t('lockBy', { id: last + 'Z' });
      lock.innerHTML = LOCK_SVG + '<span class="letter">' + nextL + '</span>' + (soon ? '<span class="long">' + t('soon') + '</span>' : '');
      nav.appendChild(lock);
    }
  }

  function switchTab(L) {
    game.state.tab = L;
    setStage(L);
    buildUpgrades(L);
    renderTabs();
    render();
  }

  // ---------- Upgrade-Feld ----------
  let rows = [];
  let scrollKey = '';
  function buildUpgrades(L) {
    const box = $('upgrades');
    box.innerHTML = '';
    scrollKey = '';
    rows = AP.UPGRADE_ORDER[L].map(id => {
      const u = AP.UPGRADES[id];
      const el = document.createElement('div');
      el.className = 'up';
      el.innerHTML = '<div class="id">' + id + '</div>' +
        '<div><div class="name"></div><div class="desc"></div><div class="eff"></div></div>' +
        '<button class="btn"></button>';
      const btn = el.querySelector('button');
      btn.addEventListener('click', () => { if (game.buy(id)) render(); });
      box.appendChild(el);
      return { id, u, el, name: el.querySelector('.name'), desc: el.querySelector('.desc'), eff: el.querySelector('.eff'), btn, last: '' };
    });
  }

  // Zeigt die letzten gekauften und die nächsten offenen Upgrades (siehe listView).
  function positionUpgrades(L, nextIdx) {
    const view = listView();
    const key = L + nextIdx + (MOBILE.matches ? 'm' : 'd');
    if (key === scrollKey) return;
    const first = !scrollKey;
    scrollKey = key;
    const box = $('upgrades');
    const start = Math.max(0, Math.min(nextIdx - view.bought, rows.length - view.visible));
    const row = rows[start].el;
    const top = row.offsetTop;
    if (first) { box.style.scrollBehavior = 'auto'; box.scrollTop = top; box.style.scrollBehavior = ''; }
    else box.scrollTop = top;
  }

  // Effektwert passend zur Upgrade-Art formatieren
  function fmtEffect(kind, v) {
    if (kind === 'base') return '+' + fmt(v, 2) + t('pointsPerSec');
    if (kind === 'points' || kind.startsWith('gain:')) return '×' + fmt(v, 2);
    if (kind === 'pow') return '^' + fmt(v, 3);
    if (kind.startsWith('passive:')) return fmt(v * 100, 1) + t('perSec');
    return '';
  }

  function effectText(id) {
    const u = AP.UPGRADES[id];
    if (u.kind === 'mod') {
      // Querverweis: Effekt des Ziels, vor dem Kauf als „vorher → nachher“
      const target = AP.UPGRADES[u.target];
      const v = game.effect(u.target);
      if (v === null) return '';
      if (game.has(id)) return t('modCurrent', { id: u.target }) + fmtEffect(target.kind, v);
      const after = u.op === 'pow' ? Math.pow(v, u.value) : v * u.value;
      return t('modCurrent', { id: u.target }) + fmtEffect(target.kind, v) + ' → ' + fmtEffect(target.kind, after);
    }
    const v = game.effect(id);
    return v === null ? '' : fmtEffect(u.kind, v);
  }

  // Beschreibung; bei Querverweisen steht hinter der Ziel-ID deren eigener Effekt, z. B. „Effekt von BM (B-Gewinn ×2) ×2“
  function descText(u) {
    const d = AP.upDesc(u);
    if (u.kind !== 'mod') return d;
    return d.replace(u.target, u.target + ' (' + AP.upDesc(AP.UPGRADES[u.target]) + ')');
  }

  function updateUpgrades(L) {
    const next = game.nextId(L);
    const nextIdx = next ? AP.UPGRADES[next].index : 26;
    rows.forEach(r => {
      const owned = game.has(r.id);
      const known = owned || r.u.index <= Math.max(nextIdx + 2, game.state.revealed[L]);
      const can = game.canBuy(r.id);
      const cls = 'up' + (r.u.kind.startsWith('unlock:') ? ' unlock' : '') +
        (owned ? ' bought' : '') + (r.id === next ? ' next ' + (can ? 'can' : 'cant') : '') + (!known ? ' unknown' : '');
      if (r.el.className !== cls) r.el.className = cls;
      const name = known ? AP.upName(r.u) : t('unknown');
      const desc = known ? descText(r.u) : t('unknownDesc');
      const eff = known ? effectText(r.id) : '';
      const btn = owned ? t('bought') : known ? (r.u.cost === 0 ? t('free') : fmt(r.u.cost) + ' ' + L) : t('unknown');
      const key = name + desc + eff + btn + can;
      if (key === r.last) return;
      r.last = key;
      r.name.textContent = name;
      r.desc.textContent = desc;
      r.desc.title = desc;
      r.eff.textContent = eff ? (owned ? t('current') : t('wouldBe')) + eff : '';
      r.btn.textContent = btn;
      r.btn.disabled = !can;
    });
    $('upTitle').textContent = t('upgrades', { L });
    $('upCount').textContent = t('boughtCount', { n: game.count(L) });
    $('doneNote').textContent = L === 'C' && game.state.teaseD ? t('doneNote') : '';
    positionUpgrades(L, nextIdx);
  }

  // ---------- Panel ----------
  function sourceName(L) {
    const src = game.LAYERS[L].source;
    return src ? t('layerPoints', { L: src }) : t('pointsLower');
  }

  function render() {
    const s = game.state;
    const L = s.tab;
    $('points').textContent = fmtAmt(s.points);
    $('rate').textContent = '+' + fmt(game.pointRate(), 1) + ' /s';
    $('layerLabel').textContent = t('layerPoints', { L });
    $('layerAmt').textContent = fmtAmt(game.amt(L));

    const frac = game.maxOf('passive:' + L);
    $('passive').textContent = frac > 0 ? t('passive', { v: fmt(game.rawGain(L) * frac, 1) }) : '';

    const gain = game.gain(L);
    const cfg = game.LAYERS[L];
    const src = game.sourceAmt(L);
    $('gain').textContent = '+' + fmt(gain) + ' ' + L;
    $('bar').style.width = (Math.min(1, game.progress(L)) * 100).toFixed(1) + '%';
    // Bedarf der nächsthöheren Stufe statt der eigenen Zeile – erst wenn diese Stufe frei ist und
    // das Freischalt-Upgrade (xZ) dieses Durchgangs gekauft oder bezahlbar ist
    const H = game.LAYER_KEYS[game.LAYER_KEYS.indexOf(L) + 1];
    const gate = AP.UPGRADES[AP.UPGRADE_ORDER[L][25]];
    const showNext = H && game.isUnlocked(H) && (game.has(gate.id) || game.amt(L) >= gate.cost);
    $('req').textContent = showNext ? '' : src < cfg.req
      ? t('needs', { req: fmt(cfg.req), src: sourceName(L), have: fmtAmt(src) })
      : t('nextAt', { n: fmt(game.nextTarget(L)), L, next: fmt(game.nextAt(L)), src: sourceName(L), have: fmtAmt(src) });
    $('reqNext').textContent = showNext
      ? t('nextAt', { n: fmt(game.nextTarget(H)), L: H, next: fmt(game.nextAt(H)), src: sourceName(H), have: fmtAmt(game.sourceAmt(H)) })
      : '';
    const btn = $('resetBtn');
    btn.textContent = t('prestige', { L }) + (gain >= 1 ? ' (+' + fmt(gain) + ')' : '');
    btn.disabled = !game.canReset(L);
    const lower = AP.LETTERS.slice(0, AP.LETTERS.indexOf(L)).split('').map(x => t('resetsLower', { L: x })).join('');
    btn.title = t('resets', { lower });

    // Zweiter Knopf für die Stufe darunter: alle ihre Upgrades gekauft, aber noch kein Auto-Reset dafür
    const P = game.LAYER_KEYS[game.LAYER_KEYS.indexOf(L) - 1];
    const prevBtn = $('resetPrevBtn');
    prevBtn.hidden = !(P && game.count(P) === AP.UPGRADE_ORDER[P].length && !game.hasKind('autoreset:' + P));
    if (!prevBtn.hidden) {
      const pg = game.gain(P);
      prevBtn.textContent = pg >= 1 ? '+' + fmt(pg) + ' ' + P : t('prestige', { L: P });
      prevBtn.disabled = !game.canReset(P);
      prevBtn.title = t('prestige', { L: P });
      prevBtn.setAttribute('aria-label', t('prestige', { L: P }) + (pg >= 1 ? ' (+' + fmt(pg) + ')' : ''));
    }

    const canAutoBuy = game.hasKind('autobuy:' + L);
    const canAutoReset = game.hasKind('autoreset:' + L);
    $('autoCard').hidden = !canAutoReset;
    $('autoBuyRow').hidden = !canAutoBuy;
    $('autoResetRow').hidden = !canAutoReset;
    if (canAutoBuy) $('autoBuy').checked = !!s.auto['buy' + L];
    if (canAutoReset) {
      $('autoReset').checked = !!s.auto['reset' + L];
      if (document.activeElement !== $('autoFactor')) $('autoFactor').value = s.auto['reset' + L + 'Factor'];
    }

    updateUpgrades(L);
    renderTabs();
    document.querySelectorAll('.tab[data-layer]').forEach(tab => {
      const M = tab.dataset.layer;
      tab.classList.toggle('pulse', M !== L && s.layers[M].resets === 0 && game.canReset(M));
    });
  }

  // ---------- Steuerung ----------
  $('resetBtn').addEventListener('click', () => { if (game.reset(game.state.tab)) render(); });
  $('resetPrevBtn').addEventListener('click', () => {
    const P = game.LAYER_KEYS[game.LAYER_KEYS.indexOf(game.state.tab) - 1];
    if (P && game.reset(P)) render();
  });
  $('autoBuy').addEventListener('change', e => { game.state.auto['buy' + game.state.tab] = e.target.checked; });
  $('autoReset').addEventListener('change', e => { game.state.auto['reset' + game.state.tab] = e.target.checked; });
  $('autoFactor').addEventListener('change', e => {
    const v = parseFloat(e.target.value);
    if (isFinite(v) && v >= 0) game.state.auto['reset' + game.state.tab + 'Factor'] = v;
  });

  function showSaved(ok) {
    const text = ok ? t('saved', { t: new Date().toLocaleTimeString(AP.lang === 'en' ? 'en-US' : 'de-DE') }) : t('saveFail');
    $('saveInfo').textContent = text;
    $('saveInfoTop').textContent = text;
  }

  // Mobil: Speicher-Optionen wandern ins Zahnrad-Menü, am Desktop bleiben sie im Panel.
  function placeSaveCard() {
    const card = $('saveCard');
    if (MOBILE.matches) $('settingsMenu').appendChild(card);
    else { $('panel').appendChild(card); toggleMenu(false); }
  }
  // Das Menü blendet sich 5 s nach dem Öffnen bzw. nach der letzten Aktion darin selbst aus.
  const MENU_TIMEOUT = 5000;
  let menuTimer = 0;
  function armMenuTimer() {
    clearTimeout(menuTimer);
    if (!$('settingsMenu').hidden) menuTimer = setTimeout(() => toggleMenu(false), MENU_TIMEOUT);
  }
  function toggleMenu(open) {
    if (open) toggleStats(false);
    $('settingsMenu').hidden = !open;
    armMenuTimer();
    $('gearBtn').setAttribute('aria-expanded', open);
  }
  $('gearBtn').addEventListener('click', e => { e.stopPropagation(); toggleMenu($('settingsMenu').hidden); });
  ['click', 'pointerdown', 'keydown'].forEach(ev => $('settingsMenu').addEventListener(ev, armMenuTimer));
  document.addEventListener('click', e => {
    if ($('settings').contains(e.target)) return;
    if (!$('settingsMenu').contains(e.target)) toggleMenu(false);
    if (!$('statsPanel').contains(e.target)) toggleStats(false);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { toggleMenu(false); toggleStats(false); } });

  // ---------- Statistik ----------
  let statsKey = '';
  function toggleStats(open) {
    if (open) toggleMenu(false);
    $('statsPanel').hidden = !open;
    $('statsBtn').setAttribute('aria-expanded', open);
    if (open) renderStats();
  }
  $('statsBtn').addEventListener('click', e => { e.stopPropagation(); toggleStats($('statsPanel').hidden); });
  $('statsClose').addEventListener('click', () => toggleStats(false));

  function fmtTime(sec) {
    if (sec === null || sec < 0 || !isFinite(sec)) return '–';
    sec = Math.floor(sec);
    const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), x = sec % 60;
    if (d) return d + ' d ' + h + ' h';
    if (h) return h + ' h ' + m + ' min';
    if (m) return m + ' min ' + x + ' s';
    return x + ' s';
  }
  function renderStats() {
    if ($('statsPanel').hidden) return;
    const s = game.state, st = s.stats;
    const rows = list => '<dl>' + list.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl>';
    let html = '<h3>' + t('stGeneral') + '</h3>' + rows([
      [t('stPlayTime'), fmtTime(s.time)],
      [t('stPointsTotal'), fmt(st.pointsTotal)],
      [t('stPointsMax'), fmt(st.pointsMax)],
      [t('stRate'), fmt(game.pointRate(), 1)],
      [t('stBuys'), fmt(st.buys)],
      [t('stUnlocked'), s.unlocked.join(' · ')]
    ]);
    game.LAYER_KEYS.filter(L => game.isUnlocked(L)).forEach(L => {
      const lay = s.layers[L];
      html += '<h3>' + t('stLayer', { L }) + '</h3>' + rows([
        [t('stResets'), fmt(lay.resets)],
        [t('stTotal', { L }), fmtAmt(lay.total)],
        [t('stBest'), st.bestGain[L] ? '+' + fmt(st.bestGain[L]) + ' ' + L : '–'],
        [t('stFastest'), fmtTime(st.fastest[L])],
        [t('stFirst'), fmtTime(st.firstReset[L])],
        [t('stSince'), lay.resets ? fmtTime(game.timeSince(L)) : '–'],
        [t('stUpgrades'), game.count(L) + ' / 26']
      ]);
    });
    if (st.since > 0) html += '<div class="note">' + t('stNote', { t: fmtTime(st.since) }) + '</div>';
    if (html !== statsKey) { statsKey = html; $('statsBody').innerHTML = html; }
  }
  MOBILE.addEventListener('change', placeSaveCard);
  placeSaveCard();
  $('saveBtn').addEventListener('click', () => showSaved(game.save()));
  $('exportBtn').addEventListener('click', () => {
    const text = game.exportSave();
    try { navigator.clipboard.writeText(text); } catch (e) { /* ignorieren */ }
    prompt(t('exportPrompt'), text);
  });
  $('importBtn').addEventListener('click', () => {
    const text = prompt(t('importPrompt'));
    if (!text) return;
    try {
      game = AP.createGame(AP.decodeSave(text));
      game.save();
      AP.lang = game.state.lang === 'en' ? 'en' : 'de';
      applyLang();
      switchTab(game.state.unlocked.includes(game.state.tab) ? game.state.tab : 'A');
    } catch (e) { alert(t('invalid')); }
  });
  $('hardResetBtn').addEventListener('click', () => {
    if (!confirm(t('confirmReset'))) return;
    skipSave = true;
    AP.clearSave();
    location.reload();
  });
  window.addEventListener('beforeunload', () => { if (!skipSave) game.save(); });

  // ---------- Schleife ----------
  let last = performance.now();
  let saveTimer = 0;
  setInterval(() => {
    const now = performance.now();
    let dt = Math.min((now - last) / 1000, 3600);
    last = now;
    saveTimer += dt;
    while (dt > 0) { const step = Math.min(dt, 0.5); game.tick(step); dt -= step; }
    if (saveTimer >= 10) { saveTimer = 0; showSaved(game.save()); }
    render();
    renderStats();
  }, 50);

  // ---------- Debug (Konsole) ----------
  window.debug = {
    get game() { return game; },
    unlock(L) {
      const s = game.state;
      AP.LETTERS.slice(0, AP.LETTERS.indexOf(L) + 1).split('').forEach(x => { if (game.LAYERS[x] && !s.unlocked.includes(x)) s.unlocked.push(x); });
      render();
    },
    add(L, n) { if (L === 'P') game.state.points += n; else game.state.layers[L].amt += n; render(); }
  };

  applyLang();
  switchTab(game.state.unlocked.includes(game.state.tab) ? game.state.tab : 'A');
})(globalThis.AP = globalThis.AP || {});
