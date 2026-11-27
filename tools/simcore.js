// © 2026 HB9688 – All rights reserved. See LICENSE.
// Simulation eines aktiven Spielers – gemeinsam genutzt von sim.html und tune.html.
(function (AP) {
  AP.fmtT = function (t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + String(s).padStart(2, '0'); };

  // stopAt: Upgrade-ID (erster Kauf) oder 'reset:B' usw. Gibt Zeitpunkte zurück.
  AP.simulate = function (opts) {
    const maxTime = opts.maxTime || 6 * 3600;
    const g = AP.createGame(null);
    const s = g.state;
    const dt = opts.dt || 0.5;
    const log = [];
    const firstReset = {};
    const lastManual = { A: -99, B: -99, C: -99 };
    const bought = {};
    let stop = false;
    const note = (key, text) => { if (opts.log) log.push(AP.fmtT(s.time) + '  ' + text); if (key === opts.stopAt) stop = true; };
    while (s.time < maxTime && !stop) {
      for (const L of ['C', 'B', 'A']) {
        if (!g.isUnlocked(L)) continue;
        let id;
        while ((id = g.nextId(L)) && g.buy(id)) {
          if (!(id in bought)) { bought[id] = s.time; note(id, id + '  (' + AP.UPGRADES[id].name + ')'); }
        }
      }
      for (const L of ['C', 'B', 'A']) {
        if (!g.canReset(L) || g.hasKind('autoreset:' + L)) continue;
        if (s.time - lastManual[L] < 2) continue;
        const gain = g.gain(L), amt = g.amt(L);
        const next = g.nextId(L);
        const cost = next ? AP.UPGRADES[next].cost : Infinity;
        if (gain >= Math.max(1, amt) || (amt < cost && amt + gain >= cost)) {
          g.reset(L);
          lastManual[L] = s.time;
          if (!(L in firstReset)) { firstReset[L] = s.time; note('reset:' + L, 'erster ' + L + '-Reset (+' + gain + ')'); }
        }
      }
      g.tick(dt);
      if (s.teaseD) break;
    }
    return { log, bought, firstReset, end: s.time, points: s.points, done: stop };
  };
})(globalThis.AP = globalThis.AP || {});
