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
    while (s.time < maxTime && !stop) {
      // Snapshot am Anfang des nächsten Durchlaufs → Weiterrechnen ab hier ist exakt gleich
      if (snapNext) { snapshot = { state: JSON.stringify(s), lastManual: Object.assign({}, lastManual), bought: Object.assign({}, bought), firstReset: Object.assign({}, firstReset) }; snapNext = false; }
      for (const L of Ls) {
        if (!g.isUnlocked(L)) continue;
        let id;
        while ((id = g.nextId(L)) && g.buy(id)) {
          if (!(id in bought)) { bought[id] = s.time; note(id, id + '  (' + AP.UPGRADES[id].name + ')'); }
        }
      }
      for (const L of Ls) {
        if (!g.canReset(L) || g.hasKind('autoreset:' + L)) continue;
        if (s.time - (lastManual[L] ?? -99) < 2) continue;
        const gain = g.gain(L), amt = g.amt(L);
        const next = g.nextId(L);
        const cost = next ? AP.UPGRADES[next].cost : null;
        // Werte sind Decimal: Verdopplung oder nächstes Upgrade wird durch den Reset bezahlbar
        if (gain.gte(AP.Decimal.max(1, amt)) || (cost && amt.lt(cost) && amt.add(gain).gte(cost))) {
          g.reset(L);
          lastManual[L] = s.time;
          if (!(L in firstReset)) { firstReset[L] = s.time; note('reset:' + L, 'erster ' + L + '-Reset (+' + gain + ')'); }
        }
      }
      g.tick(dt);
      if (s.tease) break;
    }
    // endet die Simulation genau am Snapshot-Ereignis, entspricht der Zustand hier dem Anfang des nächsten Durchlaufs
    if (snapNext) snapshot = { state: JSON.stringify(s), lastManual: Object.assign({}, lastManual), bought: Object.assign({}, bought), firstReset: Object.assign({}, firstReset) };
    return { log, bought, firstReset, end: s.time, points: s.points, done: stop, snapshot };
  };
})(globalThis.AP = globalThis.AP || {});
