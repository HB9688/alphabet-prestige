// © 2026 HB9688 – All rights reserved. See LICENSE.
// Version, Versionsgeschichte und Hilfe-Texte (nur Daten, kein DOM).
// Versionsschema 0.MINOR.PATCH: MINOR = größere Änderung mit Eintrag in AP.CHANGELOG,
// PATCH = kleine Änderung/Fix ohne Eintrag. Bei jedem Merge auf main AP.VERSION erhöhen.
(function (AP) {
  AP.VERSION = '0.5.2';
  AP.AUTHOR = 'HB9688';
  AP.COPYRIGHT_YEAR = 2026;

  // Neueste zuerst; nur größere Versionen, kurz gehalten.
  AP.CHANGELOG = [
    { v: '0.5.0', date: '2026-11-27',
      en: 'Info and help windows with version history and shortcuts; English is now the default language',
      de: 'Info- und Hilfe-Fenster mit Versionsgeschichte und Tastenkürzeln; Englisch ist jetzt Standardsprache' },
    { v: '0.4.0', date: '2026-11-27',
      en: 'Automation reworked (passive generation instead of auto reset), pause, keyboard shortcuts, new desktop layout',
      de: 'Automatisierung umgebaut (passive Erzeugung statt Auto-Reset), Pause, Tastenkürzel, neues Desktop-Layout' },
    { v: '0.3.0', date: '2026-11-26',
      en: 'Statistics, more precise reset displays, balancing adjusted, bugs fixed',
      de: 'Statistik, genauere Reset-Anzeigen, Balancing angepasst, Fehler behoben' },
    { v: '0.2.0', date: '2026-11-26',
      en: 'Mobile view reworked, settings menu',
      de: 'Handy-Ansicht überarbeitet, Zahnrad-Menü' },
    { v: '0.1.0', date: '2026-11-26',
      en: 'First playable version: layers A to C, English and German',
      de: 'Erste spielbare Version: Stufen A bis C, Englisch und Deutsch' }
  ];

  // Hilfe: Abschnitte mit Überschrift und Zeilen. keys: true = nur mit Tastatur (Desktop) anzeigen.
  AP.HELP = {
    en: [
      { title: 'Goal', lines: [
        'Collect points, buy upgrades in order and use a prestige reset to earn layer points.',
        'The last upgrade of each layer (★) unlocks the next layer.'
      ] },
      { title: 'Keyboard shortcuts', keys: true, lines: [
        'A, B, C … – prestige reset of that layer (works on every tab)',
        'Space – pause / resume',
        'Esc – close open windows'
      ] },
      { title: 'Tips', lines: [
        'A reset is usually worth it once it at least doubles your layer points.',
        'The line below the progress bar shows when you get the next point.',
        'Upgrades saying “… effect ×” strengthen an earlier upgrade.',
        'Auto buy can be switched off in the header of the upgrade list.',
        'The game saves automatically every 10 s – use Export in the settings menu for a backup.',
        'Pause stops everything, including the play time in the statistics.'
      ] }
    ],
    de: [
      { title: 'Ziel', lines: [
        'Punkte sammeln, Upgrades der Reihe nach kaufen und mit dem Prestige-Reset Stufenpunkte holen.',
        'Das letzte Upgrade jeder Stufe (★) schaltet die nächste Stufe frei.'
      ] },
      { title: 'Tastenkürzel', keys: true, lines: [
        'A, B, C … – Prestige-Reset dieser Stufe (auf jedem Tab)',
        'Leertaste – Pause / Fortsetzen',
        'Esc – offene Fenster schließen'
      ] },
      { title: 'Tipps', lines: [
        'Ein Reset lohnt sich meist, sobald er deine Stufenpunkte mindestens verdoppelt.',
        'Die Zeile unter dem Balken zeigt, ab wann der nächste Punkt kommt.',
        'Upgrades mit „Effekt von …“ verstärken ein früheres Upgrade.',
        'Auto-Kauf lässt sich im Kopf der Upgrade-Liste abschalten.',
        'Der Spielstand speichert alle 10 s automatisch – mit Export im Zahnrad-Menü sicherst du ihn.',
        'Pause hält alles an, auch die Spielzeit in der Statistik.'
      ] }
    ]
  };
})(globalThis.AP = globalThis.AP || {});
