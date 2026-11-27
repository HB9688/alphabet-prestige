// © 2026 HB9688 – All rights reserved. See LICENSE.
// Datengetriebene Upgrade-Definitionen.
// kind:
//   'base'      – Punkte pro Sekunde (additiv)
//   'points'    – Multiplikator auf Punkte/s
//   'pow'       – Exponent auf Punkte/s
//   'gain:X'    – Multiplikator auf den Reset-Gewinn der Stufe X
//   'mod'       – verändert den Effekt eines anderen Upgrades (target, op 'mul'|'pow', value)
//   'keep:X'    – Anzahl der X-Upgrades (von vorne), die beim Reset einer höheren Stufe erhalten bleiben
//   'autobuy:X' – schaltet Auto-Kauf für Stufe X frei
//   'autoreset:X' – schaltet Auto-Reset für Stufe X frei
//   'passive:X' – Anteil des Reset-Gewinns von X, der pro Sekunde passiv gutgeschrieben wird
//   'unlock:X'  – schaltet die nächste Prestigestufe X frei
// effect(g) liefert den Basiswert; g ist die Spiel-API (siehe game.js).
(function (AP) {
  // Bestände (g.amt, g.points) sind Decimal: .add/.pow/.sqrt/.log10 benutzen; .log10() liefert eine normale Zahl.
  const Decimal = globalThis.Decimal;

  const A = [
    { name: 'Generator', kind: 'base', effect: () => 1, desc: 'Erzeugt 1 Punkt pro Sekunde' },
    { name: 'Verdopplung', kind: 'points', effect: () => 2, desc: 'Punkte ×2' },
    { name: 'A-Resonanz', kind: 'points', effect: g => g.amt('A').add(1).pow(0.3), desc: 'Punkte steigen mit deinen A-Punkten' },
    { name: 'Erste Ernte', kind: 'gain:A', effect: () => 1.5, desc: 'A-Gewinn ×1,5' },
    { name: 'Verdreifachung', kind: 'points', effect: () => 3, desc: 'Punkte ×3' },
    { name: 'Selbstbezug', kind: 'points', effect: g => g.points.add(10).log10(), desc: 'Punkte steigen mit sich selbst' },
    { name: 'Doppelte Ernte', kind: 'gain:A', effect: () => 2, desc: 'A-Gewinn ×2' },
    { name: 'Sammlung', kind: 'points', effect: g => 1 + 0.25 * g.count('A'), desc: 'Punkte +25 % je gekauftem A-Upgrade' },
    { name: 'Echo', kind: 'mod', target: 'AB', op: 'mul', value: 2, desc: 'Effekt von AB ×2' },
    { name: 'Punkt-Dünger', kind: 'gain:A', effect: g => 1 + g.points.add(1).log10() / 5, desc: 'A-Gewinn steigt mit deinen Punkten' },
    { name: 'Fünffach', kind: 'points', effect: () => 5, desc: 'Punkte ×5' },
    { name: 'Verstärkte Resonanz', kind: 'mod', target: 'AC', op: 'pow', value: 1.4, desc: 'Effekt von AC ^1,4' },
    { name: 'Dreifache Ernte', kind: 'gain:A', effect: () => 3, desc: 'A-Gewinn ×3' },
    { name: 'Geduld', kind: 'points', effect: g => Math.sqrt(1 + g.timeSince('A') / 10), desc: 'Punkte steigen mit der Zeit seit dem letzten A-Reset' },
    { name: 'Zehnfach', kind: 'points', effect: () => 10, desc: 'Punkte ×10' },
    { name: 'Erntehelfer', kind: 'gain:A', effect: g => Math.sqrt(g.count('A')), desc: 'A-Gewinn × Wurzel der gekauften A-Upgrades' },
    { name: 'Vierfach', kind: 'points', effect: () => 4, desc: 'Punkte ×4' },
    { name: 'A-Kern', kind: 'points', effect: g => g.amt('A').add(1).pow(0.15), desc: 'Punkte steigen erneut mit deinen A-Punkten' },
    { name: 'Fünffache Ernte', kind: 'gain:A', effect: () => 5, desc: 'A-Gewinn ×5' },
    { name: 'Großes Echo', kind: 'mod', target: 'AE', op: 'mul', value: 5, desc: 'Effekt von AE ×5' },
    { name: 'Fünfundzwanzig', kind: 'points', effect: () => 25, desc: 'Punkte ×25' },
    { name: 'A-Zins', kind: 'gain:A', effect: g => 1 + g.amt('A').add(1).log10(), desc: 'A-Gewinn steigt mit deinen A-Punkten' },
    { name: 'Potenz', kind: 'pow', effect: () => 1.05, desc: 'Punkte/s ^1,05' },
    { name: 'Zehnfache Ernte', kind: 'gain:A', effect: () => 10, desc: 'A-Gewinn ×10' },
    { name: 'Hundertfach', kind: 'points', effect: () => 100, desc: 'Punkte ×100' },
    { name: 'Tor zu B', kind: 'unlock:B', desc: 'Schaltet die Prestigestufe B frei' }
  ];

  const B = [
    { name: 'B-Bonus', kind: 'points', effect: () => 5, desc: 'Punkte ×5' },
    { name: 'B-Ernte', kind: 'gain:A', effect: () => 3, desc: 'A-Gewinn ×3' },
    { name: 'Gedächtnis', kind: 'keep:A', effect: () => 8, desc: 'AA–AH bleiben beim B-Reset erhalten' },
    { name: 'B-Resonanz', kind: 'points', effect: g => g.amt('B').add(1).sqrt(), desc: 'Punkte steigen mit deinen B-Punkten' },
    { name: 'Sammlerstolz', kind: 'mod', target: 'AH', op: 'mul', value: 3, desc: 'Effekt von AH ×3' },
    { name: 'B-Dünger', kind: 'gain:A', effect: g => g.amt('B').add(1).pow(0.3), desc: 'A-Gewinn steigt mit deinen B-Punkten' },
    { name: 'Automat A', kind: 'autobuy:A', desc: 'Kauft A-Upgrades automatisch' },
    { name: 'B-Zehnfach', kind: 'points', effect: () => 10, desc: 'Punkte ×10' },
    { name: 'Quadratischer Selbstbezug', kind: 'mod', target: 'AF', op: 'pow', value: 2, desc: 'Effekt von AF ^2' },
    { name: 'B-Dreifachernte', kind: 'gain:A', effect: () => 3, desc: 'A-Gewinn ×3' },
    { name: 'Totales Gedächtnis', kind: 'keep:A', effect: () => 26, desc: 'Alle A-Upgrades bleiben beim B-Reset erhalten' },
    { name: 'Upgrade-Masse', kind: 'points', effect: g => 1 + g.count('A') + g.count('B'), desc: 'Punkte × (1 + gekaufte A- und B-Upgrades)' },
    { name: 'Doppelte B-Ernte', kind: 'gain:B', effect: () => 2, desc: 'B-Gewinn ×2' },
    { name: 'Kernspaltung', kind: 'mod', target: 'AR', op: 'mul', value: 3, desc: 'Effekt von AR ×3' },
    { name: 'B-Fünfzigfach', kind: 'points', effect: () => 50, desc: 'Punkte ×50' },
    { name: 'B-Fünffachernte', kind: 'gain:A', effect: () => 5, desc: 'A-Gewinn ×5' },
    { name: 'A-Echo in B', kind: 'gain:B', effect: g => 1 + g.amt('A').add(1).log10() / 10, desc: 'B-Gewinn steigt mit deinen A-Punkten' },
    { name: 'Tiefe Resonanz', kind: 'mod', target: 'BD', op: 'pow', value: 1.5, desc: 'Effekt von BD ^1,5' },
    { name: 'B-Kern', kind: 'points', effect: g => g.amt('B').add(1).pow(0.25), desc: 'Punkte steigen erneut mit deinen B-Punkten' },
    { name: 'Dreifache B-Ernte', kind: 'gain:B', effect: () => 3, desc: 'B-Gewinn ×3' },
    { name: 'Hundert-Echo', kind: 'mod', target: 'AY', op: 'mul', value: 10, desc: 'Effekt von AY ×10' },
    { name: 'B-Zins', kind: 'gain:A', effect: g => g.amt('B').add(1).pow(0.2), desc: 'A-Gewinn steigt erneut mit deinen B-Punkten' },
    { name: 'Tausendfach', kind: 'points', effect: () => 1000, desc: 'Punkte ×1000' },
    { name: 'Fünffache B-Ernte', kind: 'gain:B', effect: () => 5, desc: 'B-Gewinn ×5' },
    { name: 'Ernte-Echo', kind: 'mod', target: 'BM', op: 'mul', value: 2, desc: 'Effekt von BM ×2' },
    { name: 'Tor zu C', kind: 'unlock:C', desc: 'Schaltet die Prestigestufe C frei' }
  ];

  const C = [
    { name: 'C-Bonus', kind: 'points', effect: () => 100, desc: 'Punkte ×100' },
    { name: 'C-Ernte', kind: 'gain:B', effect: () => 3, desc: 'B-Gewinn ×3' },
    { name: 'Langzeitgedächtnis', kind: 'keep:B', effect: () => 11, desc: 'BA–BK bleiben beim C-Reset erhalten' },
    { name: 'A-Rinnsal', kind: 'passive:A', effect: () => 0.01, desc: 'Erhalte 1 % des A-Reset-Gewinns pro Sekunde, ohne Reset' },
    { name: 'Kernfusion', kind: 'mod', target: 'AR', op: 'mul', value: 5, desc: 'Effekt von AR ×5' },
    { name: 'A-Quelle', kind: 'passive:A', effect: () => 0.1, desc: 'Erhalte 10 % des A-Reset-Gewinns pro Sekunde, ohne Reset' },
    { name: 'C-Resonanz', kind: 'points', effect: g => g.amt('C').add(1), desc: 'Punkte × (C-Punkte + 1)' },
    { name: 'C-Dünger', kind: 'gain:B', effect: g => g.amt('C').add(1).sqrt(), desc: 'B-Gewinn steigt mit deinen C-Punkten' },
    { name: 'Automat B', kind: 'autobuy:B', desc: 'Kauft B-Upgrades automatisch' },
    { name: 'Sprudelnde Quelle', kind: 'mod', target: 'CF', op: 'mul', value: 10, desc: 'Effekt von CF ×10' },
    { name: 'Totales Langzeitgedächtnis', kind: 'keep:B', effect: () => 26, desc: 'Alle B-Upgrades bleiben beim C-Reset erhalten' },
    { name: 'B-Rinnsal', kind: 'passive:B', effect: () => 0.01, desc: 'Erhalte 1 % des B-Reset-Gewinns pro Sekunde, ohne Reset' },
    { name: 'Doppelte C-Ernte', kind: 'gain:C', effect: () => 2, desc: 'C-Gewinn ×2' },
    { name: 'C-Tausendfach', kind: 'points', effect: () => 1000, desc: 'Punkte ×1000' },
    { name: 'B-Quelle', kind: 'passive:B', effect: () => 0.1, desc: 'Erhalte 10 % des B-Reset-Gewinns pro Sekunde, ohne Reset' },
    { name: 'Massenquadrat', kind: 'mod', target: 'BL', op: 'pow', value: 2, desc: 'Effekt von BL ^2' },
    { name: 'C-Hundertfachernte', kind: 'gain:A', effect: () => 100, desc: 'A-Gewinn ×100' },
    { name: 'C-Zehnfachernte', kind: 'gain:B', effect: () => 10, desc: 'B-Gewinn ×10' },
    { name: 'B-Echo in C', kind: 'gain:C', effect: g => 1 + g.amt('B').add(1).log10() / 5, desc: 'C-Gewinn steigt mit deinen B-Punkten' },
    { name: 'Volle B-Quelle', kind: 'mod', target: 'CO', op: 'mul', value: 10, desc: 'Effekt von CO ×10' },
    { name: 'Große Potenz', kind: 'pow', effect: () => 1.1, desc: 'Punkte/s ^1,1' },
    { name: 'Dreifache C-Ernte', kind: 'gain:C', effect: () => 3, desc: 'C-Gewinn ×3' },
    { name: 'Potenz-Echo', kind: 'mod', target: 'AW', op: 'pow', value: 2, desc: 'Effekt von AW ^2' },
    { name: 'C-Zins', kind: 'gain:B', effect: g => g.amt('C').add(1).pow(0.3), desc: 'B-Gewinn steigt erneut mit deinen C-Punkten' },
    { name: 'Fünffache C-Ernte', kind: 'gain:C', effect: () => 5, desc: 'C-Gewinn ×5' },
    { name: 'Tor zu D', kind: 'unlock:D', desc: 'Schaltet die Prestigestufe D frei' }
  ];

  // Summe aller gekauften Upgrades (für DY)
  const allBought = g => g.LAYER_KEYS.reduce((n, L) => n + g.count(L), 0);

  const Dl = [
    { name: 'D-Bonus', kind: 'points', effect: () => 1e3, desc: 'Punkte ×1000' },
    { name: 'D-Ernte', kind: 'gain:C', effect: () => 2, desc: 'C-Gewinn ×2' },
    { name: 'C-Gedächtnis', kind: 'keep:C', effect: () => 13, desc: 'CA–CM bleiben beim D-Reset erhalten' },
    { name: 'C-Rinnsal', kind: 'passive:C', effect: () => 0.01, desc: 'Erhalte 1 % des C-Reset-Gewinns pro Sekunde, ohne Reset' },
    { name: 'D-Resonanz', kind: 'points', effect: g => g.amt('D').add(1), desc: 'Punkte × (D-Punkte + 1)' },
    { name: 'Automat C', kind: 'autobuy:C', desc: 'Kauft C-Upgrades automatisch' },
    { name: 'Zehnfach-Echo', kind: 'mod', target: 'AO', op: 'mul', value: 10, desc: 'Effekt von AO ×10' },
    { name: 'C-Quelle', kind: 'passive:C', effect: () => 0.1, desc: 'Erhalte 10 % des C-Reset-Gewinns pro Sekunde, ohne Reset' },
    { name: 'D-Dünger', kind: 'gain:C', effect: g => g.amt('D').add(1).sqrt(), desc: 'C-Gewinn steigt mit deinen D-Punkten' },
    { name: 'Totales C-Gedächtnis', kind: 'keep:C', effect: () => 26, desc: 'Alle C-Upgrades bleiben beim D-Reset erhalten' },
    { name: 'Doppelte D-Ernte', kind: 'gain:D', effect: () => 2, desc: 'D-Gewinn ×2' },
    { name: 'D-Potenz', kind: 'pow', effect: () => 1.05, desc: 'Punkte/s ^1,05' },
    { name: 'C-Echo in D', kind: 'gain:D', effect: g => 1 + g.amt('C').add(1).log10() / 5, desc: 'D-Gewinn steigt mit deinen C-Punkten' },
    { name: 'Sprudelnde C-Quelle', kind: 'mod', target: 'DH', op: 'mul', value: 10, desc: 'Effekt von DH ×10' },
    { name: 'Millionenfach', kind: 'points', effect: () => 1e6, desc: 'Punkte ×1.000.000' },
    { name: 'A-Flut', kind: 'gain:A', effect: () => 1e3, desc: 'A-Gewinn ×1000' },
    { name: 'B-Flut', kind: 'gain:B', effect: () => 100, desc: 'B-Gewinn ×100' },
    { name: 'Resonanz-Echo', kind: 'mod', target: 'CG', op: 'pow', value: 1.5, desc: 'Effekt von CG ^1,5' },
    { name: 'Dreifache D-Ernte', kind: 'gain:D', effect: () => 3, desc: 'D-Gewinn ×3' },
    { name: 'D-Kern', kind: 'points', effect: g => g.amt('D').add(1).sqrt(), desc: 'Punkte steigen erneut mit deinen D-Punkten' },
    { name: 'Tausend-Echo', kind: 'mod', target: 'BW', op: 'mul', value: 10, desc: 'Effekt von BW ×10' },
    { name: 'D-Zins', kind: 'gain:C', effect: g => g.amt('D').add(1).pow(0.3), desc: 'C-Gewinn steigt erneut mit deinen D-Punkten' },
    { name: 'Riesenpotenz', kind: 'mod', target: 'CU', op: 'pow', value: 1.5, desc: 'Effekt von CU ^1,5' },
    { name: 'Fünffache D-Ernte', kind: 'gain:D', effect: () => 5, desc: 'D-Gewinn ×5' },
    { name: 'Upgrade-Universum', kind: 'points', effect: g => Math.pow(1 + allBought(g), 2), desc: 'Punkte × (1 + alle gekauften Upgrades)²' },
    { name: 'Tor zu E', kind: 'unlock:E', desc: 'Schaltet die Prestigestufe E frei (folgt bald)' }
  ];

  // Kosten in Punkten der jeweiligen Stufe (per Simulation getunt).
  const COSTS = {
    A: [0, 1, 3, 6, 10, 23, 40, 100, 230, 420, 1000, 3900, 8500, 4e4, 6.6e4, 4.2e5, 2.9e6, 8.9e6, 6.1e7, 7.3e8, 2.9e9, 4.1e10, 1.7e12, 7.3e12, 2.8e14, 1.6e16],
    B: [1, 1, 1, 1, 1, 1, 1, 2, 8, 24, 57, 83, 240, 640, 720, 2400, 5800, 2.8e4, 6.3e4, 1.3e5, 7.7e5, 1.6e6, 7.1e6, 7.8e7, 1.2e9, 3.9e9],
    C: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10, 26, 59, 70, 110, 320, 1200, 1e4, 7.5e4, 1.6e6, 9e6, 6.8e7, 4.9e9, 1.3e11],
    D: [1, 1, 1, 1, 2, 3, 5, 8, 13, 20, 30, 50, 80, 130, 200, 300, 500, 800, 1300, 2000, 3e3, 5e3, 8e3, 1.3e4, 2e4, 3e4] // vorläufig, per tune.html
  };

  AP.UPGRADES = {};
  AP.UPGRADE_ORDER = {};
  [['A', A], ['B', B], ['C', C], ['D', Dl]].forEach(([layer, list]) => {
    AP.UPGRADE_ORDER[layer] = [];
    list.forEach((u, i) => {
      const id = layer + AP.LETTERS[i];
      u.id = id;
      u.layer = layer;
      u.index = i;
      u.cost = new Decimal(COSTS[layer][i]); // Zahl oder Text wie '1e400'
      AP.UPGRADES[id] = u;
      AP.UPGRADE_ORDER[layer].push(id);
    });
  });
  AP.COSTS = COSTS;
})(globalThis.AP = globalThis.AP || {});
