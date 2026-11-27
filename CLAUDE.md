# CLAUDE.md – Alphabet Prestige

Browser-Idle-/Prestige-Spiel. Jeder Buchstabe A–Z ist eine Prestigestufe mit je 26 Upgrades. Aktuell spielbar: **A bis C**. Der Nutzer schreibt Deutsch – antworte auf Deutsch.

## Technik – feste Regeln

- **Kein Build, keine Abhängigkeiten, keine ES-Module, kein `fetch`.** Das Spiel muss per Doppelklick auf `index.html` (file://) laufen. Alle Skripte sind klassische `<script>`-Dateien und hängen an den globalen Namensraum `globalThis.AP`.
- Ladereihenfolge in `index.html`: `palette.js` → `i18n.js` → `info.js` → `upgrades.js` → `game.js` → `ui.js`.
- `game.js` enthält nur Logik ohne DOM, damit die Balance-Tools in `tools/` sie wiederverwenden können. DOM-Code gehört nach `ui.js`.
- Zahlen sind JS-`Number` (bis ~1e308). Wird das für spätere Stufen zu knapp, auf eine Big-Number-Bibliothek umstellen (z.B. break_infinity.js als lokale Datei, nicht per CDN).
- **Spielstände nicht kaputt machen:** gespeichert wird in `localStorage` unter `alphabetPrestige.save.v1`. Neue State-Felder in `defaultState()` ergänzen – `merge()` füllt sie bei alten Spielständen auf. Upgrade-IDs nie umbenennen oder umsortieren, ohne eine Migration einzubauen.

## Deployment

- Repository: `HB9688/alphabet-prestige` (öffentlich). **GitHub Pages** veröffentlicht `main` (Wurzelverzeichnis) unter https://hb9688.github.io/alphabet-prestige/.
- Alles, was auf `main` landet, ist ~1 Minute später live. Vor dem Merge auf `main` im Browser testen.
- **Lizenz:** alle Rechte vorbehalten (`LICENSE`, © 2026 HB9688). Keine Open-Source-Lizenz hinzufügen, keinen fremden Code und keine Assets mit unklarer Lizenz einbauen. Neue Dateien bekommen den Kopfkommentar `© 2026 HB9688 – All rights reserved. See LICENSE.`
- **Cache:** GitHub Pages lässt Browser Dateien ~10 min zwischenspeichern. Neues `index.html` mit altem `ui.js` aus dem Cache bricht das Spiel (keine Tabs/Upgrades). Deshalb hängen CSS und Skripte in `index.html` mit `?v=N` an – **bei jeder Änderung an CSS/JS die Zahl überall um 1 erhöhen.**

## Versionen

- Schema **0.MINOR.PATCH**, Stand in `AP.VERSION` (`js/info.js`). 1.0 erst bei einem größeren Meilenstein.
- **Bei jedem Merge auf `main` die Version erhöhen:** PATCH bei Kleinigkeiten/Fixes (kein Eintrag), MINOR bei größeren Änderungen – dann oben in `AP.CHANGELOG` einen **kurzen** Eintrag in EN und DE ergänzen (z. B. „Balancing angepasst, Komfort-Funktionen ergänzt“, keine Einzelheiten).
- Unabhängig davon weiterhin `?v=N` (Cache) bei jeder CSS/JS-Änderung erhöhen.
- Hilfe-Texte (`AP.HELP` in `js/info.js`) bei neuen Tastenkürzeln oder Mechaniken mitpflegen; Abschnitte mit `keys: true` erscheinen nur mit Tastatur (nicht Handy/Touch).

## Design – vom Nutzer festgelegt

- **Farben:** die 26 Töne aus `farbverlauf.txt` (A = `#FFF4E6` … Z = `#6B1200`), gespiegelt in `js/palette.js`. **Palette exakt so verwenden**, auch wenn späte Stufen auf Schwarz dunkel wirken – der Nutzer hat das ausdrücklich so gewählt. Ändert sich `farbverlauf.txt`, `palette.js` mitziehen.
- **Hintergrund** dunkelgrau bis schwarz. **Schriftfarbe** im Inhalt = Farbe der aktiven Stufe (`--stage`, gesetzt in `ui.js`).
- **Überschrift** „Alphabet Prestige“ mit Verlauf über alle 26 Farben, genau auf Textbreite (`display:inline-block`), darunter eine weiche Palettenleiste.
- **Tabs** wie Browser-Tabs, einer pro freigeschalteter Stufe, plus ein Schloss-Tab für die nächste. Tabs werden schmaler, je mehr Stufen frei sind; bei wenig Platz nur der Buchstabe.
- **Layout (Desktop):** links ein hinterlegtes Feld mit der Upgrade-Liste, rechts das feste Panel (Punkte, Stufenpunkte, Reset) – kurzer Mausweg zwischen Reset- und Kaufen-Knopf. Mobil untereinander: Panel oben, Upgrades darunter. Upgrade-Liste: **immer 8 Einträge sichtbar – die letzten 5 gekauften und die nächsten 3 offenen**; **mobil (< 760 px) nur 2 – das zuletzt gekaufte und das nächste offene (alle gekauft: die letzten 2)**; alle 26 per Scrollen erreichbar. Nach einem Kauf scrollt die Liste automatisch nach.
- **Zahnrad-Menü (Desktop und mobil):** Speichern/Export/Import/Neu starten liegen im Zahnrad-Menü oben links (Zeile mit DE | EN), daneben das Statistik-Icon und „Gespeichert …“ (mobil aus Platzgründen nur „✓ 07:55“, voller Text als Tooltip). Das Menü schiebt den Inhalt nach unten und blendet sich 5 s nach dem Öffnen bzw. nach der letzten Aktion darin aus.
- **Mobil (< 760 px):** Punkte-Felder kompakter.
- **Pause:** Knopf rechts neben dem Statistik-Icon (Pause-/Play-Symbol). Pausiert hält `state.paused` die Spielzeit, jede Erzeugung, Käufe und Resets an (`tick`, `canBuy`, `canReset` in `game.js`); Spielfeld gedimmt, daneben „Pausiert“, mittig ein Hinweis-Fenster („Spiel pausiert“, wie man fortsetzt, Knopf „Fortsetzen“; Hinweis auf die Leertaste nur am Desktop, nicht mobil/Touch). Bleibt nach Neuladen erhalten. Tastenkürzel: **Leertaste** (nicht P – P wird später eine Prestigestufe).
- **Info & Hilfe:** oben rechts links neben EN | DE ein Info-Knopf (Urheber „A game by HB9688 – developed with the help of Claude (Anthropic)“, ©-Hinweis, Version, Versionsgeschichte – bewusst **kein** Link zum Quellcode) und ein Hilfe-Knopf „?“ (Ziel, Tastenkürzel nur am Desktop, Tipps). Am Desktop schweben die Fenster rechts, mobil schieben sie den Inhalt nach unten. Es ist immer nur ein Fenster offen (Zahnrad-Menü, Statistik, Info, Hilfe); Esc, × oder Klick daneben schließen.
- **Statistik:** Diagramm-Icon oben links rechts neben dem Zahnrad. Öffnet ein Feld mit Spielzeit, Punkten, Käufen und je Stufe Resets/Bestwerten (mobil schiebt es den Inhalt nach unten, am Desktop schwebt es). Zähler liegen in `state.stats` (`game.js`); neue Statistik-Werte dort ergänzen und in `renderStats()` (`ui.js`) anzeigen.
- **Auto-Kauf:** Häkchen „Auto-Kauf“ im Kopf der Upgrade-Liste zwischen „X-Upgrades“ und „n / 26 gekauft“ (sobald freigeschaltet). Ein Feld „Automatisierung“ gibt es nicht mehr.
- **Passive Erzeugung:** Sobald eine Stufe passiv erzeugt (`passive:X`), steht unter ihren Punkten „+x A /s“; „Nächster Reset“ mit Balken entfällt, der Prestige-Knopf bleibt.
- **Reset-Anzeige:** Unter dem Balken steht der Bedarf für den nächsten Punkt (ab Gewinn 100 feste Zielstufen 100 → 200 → 500 …). Ist die nächsthöhere Stufe frei **und** das Freischalt-Upgrade (xZ) dieses Durchgangs gekauft oder bezahlbar, steht dort stattdessen der Bedarf für deren nächsten Punkt.
- **Reset-Knöpfe:** Sind alle Upgrades der Stufe darunter gekauft und lohnt sich ein manueller Reset dort (ohne passive Erzeugung immer, mit passiver Erzeugung solange der Gewinn ≥ ihr Bestand ist), steht neben dem Prestige-Knopf (2/3 Breite) ein kleiner Reset-Knopf für diese Stufe (1/3), z. B. auf Tab B „+1,2e16 A“.
- **Tastenkürzel:** Buchstabe einer freigeschalteten Stufe (A, B, C …) löst deren Prestige-Reset aus, unabhängig vom aktiven Tab (nicht in Eingabefeldern, nicht mit Strg/Alt/Cmd, kein Dauerfeuer beim Gedrückthalten). Hinweis im Tooltip der Prestige-Knöpfe.
- **Sprache:** **Englisch ist Primärsprache** (Standard für neue Spieler, Fallback in `AP.t()`), Deutsch zweite Sprache. Umschalter **EN | DE** oben rechts. Bestehende Spielstände behalten ihre gespeicherte Sprache. **Jeder neue sichtbare Text braucht beide Sprachen** – UI-Texte in `AP.STRINGS` (`js/i18n.js`), englische Upgrade-Texte in `AP.UPGRADE_EN` (gleiche Reihenfolge wie in `upgrades.js`); statische Texte in `index.html` auf Englisch.

## Upgrades – Konventionen

- IDs: Stufenbuchstabe + Position, also AA…AZ, BA…BZ. Kauf nur der Reihe nach (immer das nächste ungekaufte).
- Das letzte Upgrade jeder Stufe (`xZ`, kind `unlock:X`) schaltet die nächste Stufe frei.
- Mehr als 2 Upgrades nach dem nächsten offenen werden als „???“ angezeigt. Einmal aufgedeckte bleiben auch nach Resets sichtbar (`state.revealed`).
- Effekt-Arten (`kind`) sind oben in `js/upgrades.js` dokumentiert: `base`, `points`, `pow`, `gain:X`, `mod`, `keep:X`, `autobuy:X`, `autoreset:X`, `passive:X`, `unlock:X`.
- **Querverweise** auf frühere Upgrades über `kind: 'mod'` mit `target`, `op` (`mul`/`pow`) und `value`, z.B. CE: „Effekt von AR ×5“. Wird ein Upgrade verschoben, alle `target`-Verweise und Beschreibungen (DE + EN) prüfen.
- Kosten stehen in `COSTS` am Ende von `upgrades.js`, Reset-Formeln (`req`, `exp`) in `LAYERS` in `game.js`.

## Spielmechanik

- AA ist kostenlos und erzeugt 1 Punkt/s. A-Reset ab 10 Punkten: Gewinn `floor((Quelle/req)^exp × Multiplikatoren)`.
- Ein Reset der Stufe X setzt Punkte und alle niedrigeren Stufen (Punkte und Upgrades) zurück; `keep:`-Upgrades behalten die ersten N Upgrades.
- **Offline-Fortschritt:** Beim Öffnen und nach langen Lücken (Hintergrund-Tab, > 60 s) rechnet `game.catchUp()` die verpasste Zeit nach – höchstens 8 h (`AP.OFFLINE_MAX`), nicht während der Pause, ohne Resets (nur Erzeugung, passive Gewinne, Auto-Kauf). `lastSeen` wird bei jedem `save()` gesetzt; gespeichert wird alle 10 s sowie bei `visibilitychange`/`pagehide`/`beforeunload`. Danach erscheint das Fenster „Welcome back“ mit den Zuwächsen.
- Verlauf der Automatisierung: zuerst Auto-Kauf (BG, CI), dann passive Erzeugung ohne Reset – erst 1 %/s (CD für A, CL für B), dann 10 %/s (CF, CO), dann ×10 (CJ, CT). Auto-Reset (`autoreset:X`) ist im Code noch vorhanden, wird aber von keinem Upgrade mehr genutzt. Spätere Stufen sollen das weiter ausbauen.

## Balance

Zielzeiten für einen aktiven Spieler (vom Nutzer vorgegeben: ~1 h bis zur ersten B-Prestige):

| Meilenstein | Ziel | aktuell (Simulation) |
|---|---|---|
| erster A-Reset | ~10 s | 0:10 |
| AZ / erster B-Reset | ~55–60 min | 54 / 56 min |
| BZ | ~4 h (vom Nutzer so akzeptiert, B bewusst nicht gestrafft) | 4:02 h |
| CZ | ~6 h | 5:44 h |

Spätere Stufen ähnlich: ca. 60–90 min pro Stufe.

**Workflow nach Änderungen an Effekten oder Kosten:**
1. Im Projektordner einen Server starten: `py -m http.server 8123`
2. `http://localhost:8123/tools/sim.html` → Zeiten prüfen.
3. Bei Abweichungen `tools/tune.html` öffnen (stellt B und C neu ein; `?all` stellt auch A neu ein). Dauert einige Minuten. Ergebnis (`window.tuneResult`) in `COSTS` und `LAYERS[..].req` übernehmen, dann erneut `sim.html`.
4. Die Simulation (`tools/simcore.js`) bildet den „aktiven Spieler“ ab: kauft sofort, resettet bei Verdopplung oder wenn das nächste Upgrade dadurch bezahlbar wird, min. 2 s zwischen manuellen Resets.

## Testen

- Im Browser öffnen; in der Konsole: `debug.unlock('C')`, `debug.add('A', 1e6)` (`'P'` für Punkte), `debug.game` für den State.
- Test-Spielstände danach mit „Neu starten“ oder `localStorage.clear()` entfernen.
- Desktop- und Handybreite (< 760 px) prüfen.
