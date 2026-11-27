// © 2026 HB9688 – All rights reserved. See LICENSE.
// Spiellogik: State, Formeln, Kauf, Reset, Automatisierung, Speichern.
// Große Werte (Punkte, Stufenpunkte, Gewinne, Kosten, Effekte) sind Decimal (break_infinity.js, js/lib/).
// WICHTIG: Decimal nie mit <, >, +, -, *, / verrechnen – immer .lt/.gte/.add/.mul … bzw. AP.D() benutzen.
(function (AP) {
  const SAVE_KEY = 'alphabetPrestige.save.v1';
  const LAYER_KEYS = ['A', 'B', 'C', 'D'];
  const Decimal = globalThis.Decimal;
  const D = x => (x instanceof Decimal ? x : new Decimal(x === null || x === undefined ? 0 : x));
  const ZERO = D(0), ONE = D(1);

  // Reset-Gewinn: floor((Quelle / req) ^ exp × Multiplikatoren)
  const LAYERS = {
    A: { source: null, req: D(10), exp: 0.5 },
    B: { source: 'A', req: D(5.1e15), exp: 0.25 },
    C: { source: 'B', req: D(1.5e9), exp: 0.25 },
    D: { source: 'C', req: D(1e9), exp: 0.25 } // 1e9: wer nach CZ wartet, bekommt ~5 D statt 17 (Nutzer-Feedback)
  };

  // Meilensteine: dauerhafte Boni, sobald eine Bedingung erreicht ist (überstehen jeden Reset).
  // grants: Pseudo-Upgrades mit denselben Effekt-Arten wie normale Upgrades (zählen in bought()).
  const MILESTONES = [
    { id: 'D1', layer: 'D', reached: s => s.layers.D.resets >= 1, // erster D-Reset
      grants: [{ id: 'D1:autobuyA', kind: 'autobuy:A' }, { id: 'D1:passiveA', kind: 'passive:A', effect: () => 0.01 }] }
  ];
  const MS = {};
  MILESTONES.forEach(m => m.grants.forEach(gr => { gr.milestone = m.id; MS[gr.id] = gr; }));

  function defaultState() {
    const layers = {};
    LAYER_KEYS.forEach(L => { layers[L] = { amt: ZERO, up: {}, total: ZERO, resets: 0, lastReset: 0 }; });
    const perLayer = v => Object.fromEntries(LAYER_KEYS.map(L => [L, v]));
    return {
      version: 1,
      time: 0,
      points: ZERO,
      layers,
      unlocked: ['A'],
      teaseD: false, // veraltet (bis 0.7): CZ gekauft – wird beim Laden in tease/unlocked übernommen
      tease: null, // Buchstabe der nächsten, noch nicht spielbaren Stufe ("folgt bald"), sobald ihr Tor gekauft ist
      tab: 'A',
      lang: 'en', // Primärsprache Englisch; Deutsch umschaltbar
      paused: false, // Pause: keine Zeit, keine Erzeugung, keine Käufe/Resets
      lastSeen: null, // Zeitstempel (ms) des letzten Speicherns – für Offline-Fortschritt
      // höchster Upgrade-Index je Stufe, der schon einmal aufgedeckt war (bleibt nach Resets sichtbar)
      revealed: perLayer(2),
      auto: Object.assign(Object.fromEntries(LAYER_KEYS.map(L => ['buy' + L, true])), { resetA: true, resetAFactor: 1, resetB: true, resetBFactor: 1 }),
      // Statistik. since = Spielzeit, ab der gezählt wird (bei alten Spielständen > 0)
      stats: {
        since: null,
        pointsTotal: ZERO,
        pointsMax: ZERO,
        buys: 0,
        bestGain: perLayer(ZERO),
        fastest: perLayer(null),
        firstReset: perLayer(null)
      }
    };
  }

  function merge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    for (const k of Object.keys(base)) {
      if (!(k in saved)) continue;
      const b = base[k], s = saved[k];
      if (b instanceof Decimal) base[k] = D(s); // gespeichert als Zahl (alt) oder Text (neu)
      else if (b && typeof b === 'object' && !Array.isArray(b) && k !== 'up') base[k] = merge(b, s);
      else base[k] = s;
    }
    return base;
  }

  function createGame(saved) {
    const s = merge(defaultState(), saved);
    if (s.stats.since === null) {
      // Alter Spielstand: Statistik startet jetzt; erster Reset früherer Stufen ist unbekannt (-1)
      s.stats.since = s.time;
      LAYER_KEYS.forEach(L => { if (s.layers[L].resets > 0) s.stats.firstReset[L] = -1; });
    }
    const UP = AP.UPGRADES;
    // Migration bis 0.7: teaseD = CZ gekauft → Stufe D ist jetzt spielbar und wird freigeschaltet
    if (s.teaseD) { if (!s.unlocked.includes('D')) s.unlocked.push('D'); s.teaseD = false; }
    // Aufgedeckte Upgrades nachtragen (auch für alte Spielstände): ist die Stufe darüber frei, war xZ schon gekauft
    LAYER_KEYS.forEach((L, i) => {
      const above = LAYER_KEYS[i + 1];
      const all = above ? s.unlocked.includes(above) : !!s.tease;
      s.revealed[L] = Math.max(s.revealed[L], all ? 25 : Object.keys(s.layers[L].up).length + 2);
    });

    // onEvent(type, data): optionaler Beobachter für Käufe und Resets (Testprotokoll in ui.js); autoBuying markiert Auto-Käufe
    let autoBuying = false;
    const game = {
      state: s,
      onEvent: null,
      LAYERS,
      LAYER_KEYS,
      get points() { return D(s.points); },
      amt: L => D(s.layers[L].amt),
      has: id => !!s.layers[id[0]].up[id],
      count: L => Object.keys(s.layers[L].up).length,
      timeSince: L => s.time - s.layers[L].lastReset,
      isUnlocked: L => s.unlocked.includes(L),

      // Sicherheitsnetz: Werte, die von außen (Konsole, alte Tools) als normale Zahl gesetzt wurden, in Decimal wandeln
      normalize() {
        s.points = D(s.points);
        LAYER_KEYS.forEach(L => { const l = s.layers[L]; l.amt = D(l.amt); l.total = D(l.total); s.stats.bestGain[L] = D(s.stats.bestGain[L]); });
        s.stats.pointsTotal = D(s.stats.pointsTotal); s.stats.pointsMax = D(s.stats.pointsMax);
      },

      _cache: null,
      invalidate() { game._cache = null; },
      bought() {
        if (game._cache) return game._cache;
        const out = [];
        LAYER_KEYS.forEach(L => { for (const id in s.layers[L].up) out.push(UP[id]); });
        MILESTONES.forEach(m => { if (m.reached(s)) out.push(...m.grants); });
        game._cache = out;
        return out;
      },

      // Effekt eines Upgrades (Decimal) inkl. aller Modifikatoren anderer gekaufter Upgrades.
      effect(id) {
        const u = UP[id] || MS[id];
        if (!u.effect) return null;
        let v = D(u.effect(game));
        for (const m of game.bought()) {
          if (m.kind !== 'mod' || m.target !== id) continue;
          v = m.op === 'pow' ? v.pow(m.value) : v.mul(m.value);
        }
        return v;
      },
      // Upgrades, die den Effekt von id verändern (für die Anzeige)
      modsOf(id) { return game.bought().filter(m => m.kind === 'mod' && m.target === id); },

      product(kind) {
        let p = ONE;
        for (const u of game.bought()) if (u.kind === kind) p = p.mul(game.effect(u.id));
        return p;
      },

      // größter Effekt einer Art als normale Zahl (für kleine Werte: passive Anteile, keep-Anzahl)
      maxOf(kind) {
        let m = 0;
        for (const u of game.bought()) if (u.kind === kind) m = Math.max(m, game.effect(u.id).toNumber());
        return m;
      },

      milestoneReached(id) { const m = MILESTONES.find(x => x.id === id); return !!(m && m.reached(s)); },
      hasKind(kind) { return game.bought().some(u => u.kind === kind); },

      pointRate() {
        let base = ZERO;
        for (const u of game.bought()) if (u.kind === 'base') base = base.add(game.effect(u.id));
        if (base.lte(0)) return ZERO;
        return base.mul(game.product('points')).pow(game.product('pow').toNumber());
      },

      sourceAmt(L) { return LAYERS[L].source ? game.amt(LAYERS[L].source) : game.points; },

      rawGain(L) {
        const cfg = LAYERS[L];
        const src = game.sourceAmt(L);
        if (src.lt(cfg.req)) return ZERO;
        return src.div(cfg.req).pow(cfg.exp).mul(game.product('gain:' + L));
      },
      gain(L) { return game.rawGain(L).floor(); },
      // Anzeige-Ziele für den Reset-Gewinn: unter 100 jeder ganze Punkt, danach feste Stufen 100, 200, 500, 1000 …
      // Liefert [letzte erreichte Stufe, nächste Stufe]; die nächste bleibt stehen, bis sie erreicht ist.
      gainSteps(L) {
        const g = game.gain(L);
        if (g.lt(100)) return [g, g.add(1)];
        const p = Decimal.pow(10, Math.floor(g.log10()));
        const steps = [1, 2, 5, 10].map(m => p.mul(m));
        const i = steps.findIndex(v => v.gt(g));
        return [steps[i - 1], steps[i]];
      },
      nextTarget(L) { return game.gainSteps(L)[1]; },
      // Benötigte Menge der Quelle für einen Reset-Gewinn von target (Umkehrung von rawGain)
      nextAt(L, target) {
        const cfg = LAYERS[L];
        if (target === undefined) target = game.nextTarget(L);
        // unter req gibt es nie Gewinn, auch wenn Multiplikatoren rechnerisch weniger bräuchten
        return Decimal.max(cfg.req, cfg.req.mul(D(target).div(game.product('gain:' + L)).pow(1 / cfg.exp)));
      },

      // Fortschritt 0..1 bis zur Mindestmenge bzw. von der letzten bis zur nächsten Gewinn-Stufe
      progress(L) {
        const cfg = LAYERS[L];
        const src = game.sourceAmt(L);
        if (src.lt(cfg.req)) return src.div(cfg.req).toNumber();
        const [from, to] = game.gainSteps(L);
        return game.rawGain(L).sub(from).div(to.sub(from)).toNumber();
      },

      nextId(L) {
        const order = AP.UPGRADE_ORDER[L];
        const n = game.count(L);
        return n < order.length ? order[n] : null;
      },

      canBuy(id) {
        const u = UP[id];
        return !s.paused && game.isUnlocked(u.layer) && game.nextId(u.layer) === id && game.amt(u.layer).gte(u.cost);
      },

      buy(id) {
        if (!game.canBuy(id)) return false;
        const u = UP[id];
        s.layers[u.layer].amt = game.amt(u.layer).sub(u.cost);
        s.layers[u.layer].up[id] = true;
        s.stats.buys++;
        if (game.onEvent) game.onEvent('buy', { id, auto: autoBuying });
        s.revealed[u.layer] = Math.max(s.revealed[u.layer], u.index + 3);
        game.invalidate();
        if (u.kind.startsWith('unlock:')) {
          const next = u.kind.slice(7);
          if (LAYERS[next]) { if (!s.unlocked.includes(next)) s.unlocked.push(next); }
          else s.tease = next;
        }
        return true;
      },

      buyAll(L) {
        let n = 0;
        let id;
        while ((id = game.nextId(L)) && game.buy(id)) n++;
        return n;
      },

      canReset(L) { return !s.paused && game.isUnlocked(L) && game.gain(L).gte(1); },

      reset(L) {
        const g = game.gain(L);
        if (!game.canReset(L)) return false;
        const lay = s.layers[L];
        if (game.onEvent) game.onEvent('reset', { L, gain: g, had: game.amt(L), src: game.sourceAmt(L) });
        const st = s.stats, dur = s.time - lay.lastReset;
        st.bestGain[L] = Decimal.max(st.bestGain[L], g);
        if (st.fastest[L] === null || dur < st.fastest[L]) st.fastest[L] = dur;
        if (st.firstReset[L] === null) st.firstReset[L] = s.time;
        lay.amt = lay.amt.add(g);
        lay.total = lay.total.add(g);
        lay.resets++;
        lay.lastReset = s.time;
        s.points = ZERO;
        // niedrigere Stufen von oben nach unten zurücksetzen
        const idx = LAYER_KEYS.indexOf(L);
        for (let i = idx - 1; i >= 0; i--) {
          const M = LAYER_KEYS[i];
          const lm = s.layers[M];
          lm.amt = ZERO;
          lm.lastReset = s.time;
          const keep = game.maxOf('keep:' + M);
          const kept = {};
          AP.UPGRADE_ORDER[M].slice(0, keep).forEach(id => { if (lm.up[id]) kept[id] = true; });
          lm.up = kept;
          game.invalidate(); // sonst zählen für die nächste Stufe noch die eben entfernten keep:-Upgrades
        }
        game.invalidate();
        return true;
      },

      tick(dt) {
        game.normalize();
        if (s.paused) return;
        s.time += dt;
        const produced = game.pointRate().mul(dt);
        s.points = s.points.add(produced);
        s.stats.pointsTotal = s.stats.pointsTotal.add(produced);
        if (s.points.gt(s.stats.pointsMax)) s.stats.pointsMax = s.points;
        for (const L of LAYER_KEYS) {
          if (!game.isUnlocked(L)) continue;
          const frac = game.maxOf('passive:' + L);
          if (frac > 0) {
            const g = game.rawGain(L).mul(frac * dt);
            s.layers[L].amt = s.layers[L].amt.add(g);
            s.layers[L].total = s.layers[L].total.add(g);
          }
        }
        for (let i = LAYER_KEYS.length - 1; i >= 0; i--) {
          const L = LAYER_KEYS[i];
          if (game.hasKind('autoreset:' + L) && s.auto['reset' + L]) {
            const need = Decimal.max(1, s.layers[L].amt.mul(s.auto['reset' + L + 'Factor']));
            if (game.gain(L).gte(need) && game.timeSince(L) >= 0.5) game.reset(L);
          }
          if (game.hasKind('autobuy:' + L) && s.auto['buy' + L]) { autoBuying = true; game.buyAll(L); autoBuying = false; }
        }
      },

      // Offline-Fortschritt: verpasste Zeit in höchstens ~5000 Schritten nachrechnen (passive Erzeugung,
      // Auto-Kauf; keine Resets). Liefert den Zuwachs (Decimal) für die Willkommen-zurück-Anzeige.
      catchUp(seconds) {
        if (s.paused || !(seconds > 0)) return null;
        const before = { points: s.points };
        LAYER_KEYS.forEach(L => { before[L] = s.layers[L].amt; });
        const steps = Math.min(5000, Math.ceil(seconds / 0.5)), step = seconds / steps;
        for (let i = 0; i < steps; i++) game.tick(step);
        const gain = { points: s.points.sub(before.points) };
        LAYER_KEYS.forEach(L => { gain[L] = s.layers[L].amt.sub(before[L]); });
        return gain;
      },

      save() {
        s.lastSeen = Date.now();
        // Decimal wird per toJSON als Text gespeichert ("1.23e+456") und beim Laden in merge() zurückverwandelt
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
      },
      exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); }
    };
    return game;
  }

  AP.Decimal = Decimal;
  AP.D = D;
  AP.MILESTONES = MILESTONES;
  AP.createGame = createGame;
  AP.LAYERS = LAYERS;
  AP.OFFLINE_MAX = 8 * 3600; // höchstens 8 h Abwesenheit werden angerechnet
  // Incremental statt Idle (Nutzer): Abwesenheit zählt nur mit halbem Tempo – aktives Spielen soll klar vorne liegen
  AP.OFFLINE_RATE = 0.5;
  AP.loadSaved = function () {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  };
  AP.decodeSave = function (text) {
    return JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
  };
  AP.clearSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignorieren */ } };
})(globalThis.AP = globalThis.AP || {});
