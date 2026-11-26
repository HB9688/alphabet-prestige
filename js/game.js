// Spiellogik: State, Formeln, Kauf, Reset, Automatisierung, Speichern.
(function (AP) {
  const SAVE_KEY = 'alphabetPrestige.save.v1';
  const LAYER_KEYS = ['A', 'B', 'C'];

  // Reset-Gewinn: floor((Quelle / req) ^ exp × Multiplikatoren)
  const LAYERS = {
    A: { source: null, req: 10, exp: 0.5 },
    B: { source: 'A', req: 5.1e15, exp: 0.25 },
    C: { source: 'B', req: 1.5e9, exp: 0.25 }
  };

  function defaultState() {
    const layers = {};
    LAYER_KEYS.forEach(L => { layers[L] = { amt: 0, up: {}, total: 0, resets: 0, lastReset: 0 }; });
    return {
      version: 1,
      time: 0,
      points: 0,
      layers,
      unlocked: ['A'],
      teaseD: false,
      tab: 'A',
      lang: 'de',
      auto: { buyA: true, resetA: true, resetAFactor: 1, buyB: true, resetB: true, resetBFactor: 1 },
      // Statistik. since = Spielzeit, ab der gezählt wird (bei alten Spielständen > 0)
      stats: {
        since: null,
        pointsTotal: 0,
        pointsMax: 0,
        buys: 0,
        bestGain: { A: 0, B: 0, C: 0 },
        fastest: { A: null, B: null, C: null },
        firstReset: { A: null, B: null, C: null }
      }
    };
  }

  function merge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    for (const k of Object.keys(base)) {
      if (!(k in saved)) continue;
      const b = base[k], s = saved[k];
      if (b && typeof b === 'object' && !Array.isArray(b) && k !== 'up') base[k] = merge(b, s);
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

    const game = {
      state: s,
      LAYERS,
      LAYER_KEYS,
      get points() { return s.points; },
      amt: L => s.layers[L].amt,
      has: id => !!s.layers[id[0]].up[id],
      count: L => Object.keys(s.layers[L].up).length,
      timeSince: L => s.time - s.layers[L].lastReset,
      isUnlocked: L => s.unlocked.includes(L),

      _cache: null,
      invalidate() { game._cache = null; },
      bought() {
        if (game._cache) return game._cache;
        const out = [];
        LAYER_KEYS.forEach(L => { for (const id in s.layers[L].up) out.push(UP[id]); });
        game._cache = out;
        return out;
      },

      // Effekt eines Upgrades inkl. aller Modifikatoren anderer gekaufter Upgrades.
      effect(id) {
        const u = UP[id];
        if (!u.effect) return null;
        let v = u.effect(game);
        for (const m of game.bought()) {
          if (m.kind !== 'mod' || m.target !== id) continue;
          v = m.op === 'pow' ? Math.pow(v, m.value) : v * m.value;
        }
        return v;
      },
      // Upgrades, die den Effekt von id verändern (für die Anzeige)
      modsOf(id) { return game.bought().filter(m => m.kind === 'mod' && m.target === id); },

      product(kind) {
        let p = 1;
        for (const u of game.bought()) if (u.kind === kind) p *= game.effect(u.id);
        return p;
      },

      maxOf(kind) {
        let m = 0;
        for (const u of game.bought()) if (u.kind === kind) m = Math.max(m, game.effect(u.id));
        return m;
      },

      hasKind(kind) { return game.bought().some(u => u.kind === kind); },

      pointRate() {
        let base = 0;
        for (const u of game.bought()) if (u.kind === 'base') base += game.effect(u.id);
        if (base <= 0) return 0;
        return Math.pow(base * game.product('points'), game.product('pow'));
      },

      sourceAmt(L) { return LAYERS[L].source ? s.layers[LAYERS[L].source].amt : s.points; },
      sourceName(L) { return LAYERS[L].source ? LAYERS[L].source + '-Punkte' : 'Punkte'; },

      rawGain(L) {
        const cfg = LAYERS[L];
        const src = game.sourceAmt(L);
        if (src < cfg.req) return 0;
        return Math.pow(src / cfg.req, cfg.exp) * game.product('gain:' + L);
      },
      gain(L) { return Math.floor(game.rawGain(L)); },
      // Anzeige-Ziele für den Reset-Gewinn: unter 100 jeder ganze Punkt, danach feste Stufen 100, 200, 500, 1000 …
      // Liefert [letzte erreichte Stufe, nächste Stufe]; die nächste bleibt stehen, bis sie erreicht ist.
      gainSteps(L) {
        const g = game.gain(L);
        if (g < 100) return [g, g + 1];
        const p = Math.pow(10, Math.floor(Math.log10(g)));
        const steps = [1, 2, 5, 10].map(m => m * p);
        const i = steps.findIndex(v => v > g);
        return [steps[i - 1], steps[i]];
      },
      nextTarget(L) { return game.gainSteps(L)[1]; },
      // Benötigte Menge der Quelle für einen Reset-Gewinn von target (Umkehrung von rawGain)
      nextAt(L, target) {
        const cfg = LAYERS[L];
        if (target === undefined) target = game.nextTarget(L);
        // unter req gibt es nie Gewinn, auch wenn Multiplikatoren rechnerisch weniger bräuchten
        return Math.max(cfg.req, cfg.req * Math.pow(target / game.product('gain:' + L), 1 / cfg.exp));
      },

      // Fortschritt 0..1 bis zur Mindestmenge bzw. von der letzten bis zur nächsten Gewinn-Stufe
      progress(L) {
        const cfg = LAYERS[L];
        const src = game.sourceAmt(L);
        if (src < cfg.req) return src / cfg.req;
        const [from, to] = game.gainSteps(L);
        return (game.rawGain(L) - from) / (to - from);
      },

      nextId(L) {
        const order = AP.UPGRADE_ORDER[L];
        const n = game.count(L);
        return n < order.length ? order[n] : null;
      },

      canBuy(id) {
        const u = UP[id];
        return game.isUnlocked(u.layer) && game.nextId(u.layer) === id && s.layers[u.layer].amt >= u.cost;
      },

      buy(id) {
        if (!game.canBuy(id)) return false;
        const u = UP[id];
        s.layers[u.layer].amt -= u.cost;
        s.layers[u.layer].up[id] = true;
        s.stats.buys++;
        game.invalidate();
        if (u.kind.startsWith('unlock:')) {
          const next = u.kind.slice(7);
          if (LAYERS[next]) { if (!s.unlocked.includes(next)) s.unlocked.push(next); }
          else s.teaseD = true;
        }
        return true;
      },

      buyAll(L) {
        let n = 0;
        let id;
        while ((id = game.nextId(L)) && game.buy(id)) n++;
        return n;
      },

      canReset(L) { return game.isUnlocked(L) && game.gain(L) >= 1; },

      reset(L) {
        const g = game.gain(L);
        if (!game.canReset(L)) return false;
        const lay = s.layers[L];
        const st = s.stats, dur = s.time - lay.lastReset;
        st.bestGain[L] = Math.max(st.bestGain[L], g);
        if (st.fastest[L] === null || dur < st.fastest[L]) st.fastest[L] = dur;
        if (st.firstReset[L] === null) st.firstReset[L] = s.time;
        lay.amt += g;
        lay.total += g;
        lay.resets++;
        lay.lastReset = s.time;
        s.points = 0;
        // niedrigere Stufen von oben nach unten zurücksetzen
        const idx = LAYER_KEYS.indexOf(L);
        for (let i = idx - 1; i >= 0; i--) {
          const M = LAYER_KEYS[i];
          const lm = s.layers[M];
          lm.amt = 0;
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
        s.time += dt;
        const produced = game.pointRate() * dt;
        s.points += produced;
        s.stats.pointsTotal += produced;
        if (s.points > s.stats.pointsMax) s.stats.pointsMax = s.points;
        for (const L of ['A', 'B']) {
          if (!game.isUnlocked(L)) continue;
          const frac = game.maxOf('passive:' + L);
          if (frac > 0) {
            const g = game.rawGain(L) * frac * dt;
            s.layers[L].amt += g;
            s.layers[L].total += g;
          }
        }
        for (const L of ['B', 'A']) {
          if (game.hasKind('autoreset:' + L) && s.auto['reset' + L]) {
            const need = Math.max(1, s.layers[L].amt * s.auto['reset' + L + 'Factor']);
            if (game.gain(L) >= need && game.timeSince(L) >= 0.5) game.reset(L);
          }
          if (game.hasKind('autobuy:' + L) && s.auto['buy' + L]) game.buyAll(L);
        }
      },

      save() {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
      },
      exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); }
    };
    return game;
  }

  AP.createGame = createGame;
  AP.LAYERS = LAYERS;
  AP.loadSaved = function () {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  };
  AP.decodeSave = function (text) {
    return JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
  };
  AP.clearSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignorieren */ } };
})(globalThis.AP = globalThis.AP || {});
