// © 2026 HB9688 – All rights reserved. See LICENSE.
// Simulation eines aktiven Spielers – gemeinsam genutzt von sim.html und tune.html.
(function (AP) {
  AP.fmtT = function (t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + String(s).padStart(2, '0'); };

  // stopAt: Upgrade-ID (erster Kauf) oder 'reset:B' usw. Gibt Zeitpunkte zurück.
  // snapshotAt: Ereignis (wie stopAt), nach dem der komplette Zustand als r.snapshot gemerkt wird.
  // from: so ein Snapshot – die Simulation läuft dann ab diesem Punkt weiter (für schnelles Tuning späterer Stufen).
  AP.simulate = function (opts) {
    const maxTime = opts.maxTime || 6 * 3600;
    const f = opts.from;
    const g = AP.createGame(f ? JSON.parse(f.state) : null);
    const s = g.state;
    const dt = opts.dt || 0.5;
    const log = [];
    const firstReset = f ? Object.assign({}, f.firstReset) : {};
    const lastManual = f ? Object.assign({}, f.lastManual) : {};
    let snapshot = null, snapNext = false;
    const Ls = [...g.LAYER_KEYS].reverse(); // höchste Stufe zuerst
    const bought = f ? Object.assign({}, f.bought) : {};
    let stop = false;
    const note = (key, text) => { if (opts.log) log.push(AP.fmtT(s.time) + '  ' + text); if (key === opts.stopAt) stop = true; if (key === opts.snapshotAt) snapNext = true; };
    const resets = f && f.resets ? Object.assign({}, f.resets) : {};
    const doReset = (L, gain) => {
      g.reset(L);
      lastManual[L] = s.time;
      resets[L] = (resets[L] || 0) + 1;
      if (!(L in firstReset)) { firstReset[L] = s.time; note('reset:' + L, 'erster ' + L + '-Reset (+' + gain + ')'); }
    };

    // Spielstil 'hb' (Standard in sim.html) bildet den Nutzer nach (Durchlauf 0.8.1, Handy):
    //  - Kettenreset: bevor eine Stufe resettet wird, erst alle Stufen darunter von unten nach oben resetten
    //    (solange sie noch nicht 100 % passiv erzeugen) – das vergrößert die Quelle und damit den Gewinn
    //  - A sehr oft (ab Gewinn ≥ rA · Bestand), höhere Stufen ab Gewinn ≥ rH · Bestand oder wenn das nächste Upgrade bezahlbar wird
    //  - erster Reset einer Stufe erst, wenn der Gewinn die ersten firstAhead Upgrades bezahlt
    //  - mindestens gap Sekunden zwischen zwei Resets derselben Stufe
    // Spielstil 'double' (alt): jede Stufe einzeln bei Verdopplung, höchste zuerst (zum Vergleich).
    const style = opts.style || 'double';
    const P = Object.assign({ rA: 0.1, rH: 0.25, gap: 2, firstAhead: 2 }, opts.params || {});
    const K = g.LAYER_KEYS, Dec = AP.Decimal;
    const passiveFull = L => g.maxOf('passive:' + L) >= 1;
    const costAhead = (L, n) => { const ord = AP.UPGRADE_ORDER[L], i = g.count(L); let c = new Dec(0); for (let k = i; k < Math.min(i + n, ord.length); k++) c = c.add(AP.UPGRADES[ord[k]].cost); return c; };
    const wants = L => {
      if (!g.canReset(L) || s.time - (lastManual[L] ?? -99) < P.gap) return false;
      const gain = g.gain(L), amt = g.amt(L);
      if (L === 'A') return gain.gte(Dec.max(1, amt.mul(P.rA)));
      if (passiveFull(L)) return false;
      if (!s.layers[L].resets) return g.count(L) > 0 || gain.gte(costAhead(L, P.firstAhead));
      const next = g.nextId(L), cost = next ? AP.UPGRADES[next].cost : null;
      return gain.gte(Dec.max(1, amt.mul(P.rH))) || !!(cost && amt.lt(cost) && amt.add(gain).gte(cost));
    };
    const hbResets = () => {
      for (let i = K.length - 1; i >= 1; i--) {
        const L = K[i];
        if (!g.isUnlocked(L) || !wants(L)) continue;
        for (let j = 0; j < i; j++) { const M = K[j]; if (!passiveFull(M) && g.canReset(M)) doReset(M, g.gain(M)); }
        if (g.canReset(L)) doReset(L, g.gain(L));
        return;
      }
      if (wants('A')) doReset('A', g.gain('A'));
    };
    while (s.time < maxTime && !stop) {
      // Snapshot am Anfang des nächsten Durchlaufs → Weiterrechnen ab hier ist exakt gleich
      if (snapNext) { snapshot = { state: JSON.stringify(s), lastManual: Object.assign({}, lastManual), bought: Object.assign({}, bought), firstReset: Object.assign({}, firstReset), resets: Object.assign({}, resets) }; snapNext = false; }
      for (const L of Ls) {
        if (!g.isUnlocked(L)) continue;
        let id;
        while ((id = g.nextId(L)) && g.buy(id)) {
          if (!(id in bought)) { bought[id] = s.time; note(id, id + '  (' + AP.UPGRADES[id].name + ')'); }
        }
      }
      if (style === 'hb') hbResets(); else for (const L of Ls) {
        if (!g.canReset(L) || g.hasKind('autoreset:' + L)) continue;
        if (s.time - (lastManual[L] ?? -99) < 2) continue;
        const gain = g.gain(L), amt = g.amt(L);
        const next = g.nextId(L);
        const cost = next ? AP.UPGRADES[next].cost : null;
        // Werte sind Decimal: Verdopplung oder nächstes Upgrade wird durch den Reset bezahlbar
        if (gain.gte(AP.Decimal.max(1, amt)) || (cost && amt.lt(cost) && amt.add(gain).gte(cost))) doReset(L, gain);
      }
      g.tick(dt);
      if (s.tease) break;
    }
    // endet die Simulation genau am Snapshot-Ereignis, entspricht der Zustand hier dem Anfang des nächsten Durchlaufs
    if (snapNext) snapshot = { state: JSON.stringify(s), lastManual: Object.assign({}, lastManual), bought: Object.assign({}, bought), firstReset: Object.assign({}, firstReset), resets: Object.assign({}, resets) };
    return { log, bought, firstReset, resets, end: s.time, points: s.points, done: stop, snapshot };
  };
})(globalThis.AP = globalThis.AP || {});
