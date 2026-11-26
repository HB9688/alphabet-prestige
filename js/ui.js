// Darstellung: Tabs, Panel, Upgrade-Feld, Sprache, Spielschleife.
(function (AP) {
  const $ = id => document.getElementById(id);
  const t = AP.t;
  const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const VISIBLE = 8, SHOW_BOUGHT = 5;

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

  // Zeigt die letzten 5 gekauften und die nächsten 3 offenen Upgrades (8 sichtbar).
  function positionUpgrades(L, nextIdx) {
    const key = L + nextIdx;
    if (key === scrollKey) return;
    const first = !scrollKey;
    scrollKey = key;
    const box = $('upgrades');
    const start = Math.max(0, Math.min(nextIdx - SHOW_BOUGHT, rows.length - VISIBLE));
    const row = rows[start].el;
    const top = row.offsetTop;
    if (first) { box.style.scrollBehavior = 'auto'; box.scrollTop = top; box.style.scrollBehavior = ''; }
    else box.scrollTop = top;
  }

  function effectText(id) {
    const u = AP.UPGRADES[id];
    const k = u.kind;
    if (k === 'mod') {
      const txt = effectText(u.target);
      return txt ? t('modCurrent', { id: u.target }) + txt : '';
    }
    const v = game.effect(id);
    if (v === null) return '';
    if (k === 'base') return '+' + fmt(v, 2) + t('pointsPerSec');
    if (k === 'points' || k.startsWith('gain:')) return '×' + fmt(v, 2);
    if (k === 'pow') return '^' + fmt(v, 3);
    if (k.startsWith('passive:')) return fmt(v * 100, 1) + t('perSec');
    return '';
  }

  function updateUpgrades(L) {
    const next = game.nextId(L);
    const nextIdx = next ? AP.UPGRADES[next].index : 26;
    rows.forEach(r => {
      const owned = game.has(r.id);
      const known = owned || r.u.index <= nextIdx + 2;
      const can = game.canBuy(r.id);
      const cls = 'up' + (r.u.kind.startsWith('unlock:') ? ' unlock' : '') +
        (owned ? ' bought' : '') + (r.id === next ? ' next ' + (can ? 'can' : 'cant') : '') + (!known ? ' unknown' : '');
      if (r.el.className !== cls) r.el.className = cls;
      const name = known ? AP.upName(r.u) : t('unknown');
      const desc = known ? AP.upDesc(r.u) : t('unknownDesc');
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
    $('req').textContent = src < cfg.req
      ? t('needs', { req: fmt(cfg.req), src: sourceName(L), have: fmtAmt(src) })
      : t('from', { have: fmtAmt(src), src: sourceName(L) });
    const btn = $('resetBtn');
    btn.textContent = t('prestige', { L }) + (gain >= 1 ? ' (+' + fmt(gain) + ')' : '');
    btn.disabled = !game.canReset(L);
    const lower = AP.LETTERS.slice(0, AP.LETTERS.indexOf(L)).split('').map(x => t('resetsLower', { L: x })).join('');
    btn.title = t('resets', { lower });

    const canAutoBuy = game.hasKind('autobuy:' + L);
    const canAutoReset = game.hasKind('autoreset:' + L);
    $('autoCard').hidden = !(canAutoBuy || canAutoReset);
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
  $('autoBuy').addEventListener('change', e => { game.state.auto['buy' + game.state.tab] = e.target.checked; });
  $('autoReset').addEventListener('change', e => { game.state.auto['reset' + game.state.tab] = e.target.checked; });
  $('autoFactor').addEventListener('change', e => {
    const v = parseFloat(e.target.value);
    if (isFinite(v) && v >= 0) game.state.auto['reset' + game.state.tab + 'Factor'] = v;
  });

  function showSaved(ok) {
    $('saveInfo').textContent = ok ? t('saved', { t: new Date().toLocaleTimeString(AP.lang === 'en' ? 'en-US' : 'de-DE') }) : t('saveFail');
  }
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
