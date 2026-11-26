# CLAUDE.md – Alphabet Prestige

Browser-Idle-/Prestige-Spiel. Jeder Buchstabe A–Z ist eine Prestigestufe mit je 26 Upgrades. Aktuell spielbar: **A bis C**. Der Nutzer schreibt Deutsch – antworte auf Deutsch.

## Technik – feste Regeln

- **Kein Build, keine Abhängigkeiten, keine ES-Module, kein `fetch`.** Das Spiel muss per Doppelklick auf `index.html` (file://) laufen. Alle Skripte sind klassische `<script>`-Dateien und hängen an den globalen Namensraum `globalThis.AP`.
- Ladereihenfolge in `index.html`: `palette.js` → `i18n.js` → `upgrades.js` → `game.js` → `ui.js`.
- `game.js` enthält nur Logik ohne DOM, damit die Balance-Tools in `tools/` sie wiederverwenden können. DOM-Code gehört nach `ui.js`.
- Zahlen sind JS-`Number` (bis ~1e308). Wird das für spätere Stufen zu knapp, auf eine Big-Number-Bibliothek umstellen (z.B. break_infinity.js als lokale Datei, nicht per CDN).
- **Spielstände nicht kaputt machen:** gespeichert wird in `localStorage` unter `alphabetPrestige.save.v1`. Neue State-Felder in `defaultState()` ergänzen – `merge()` füllt sie bei alten Spielständen auf. Upgrade-IDs nie umbenennen oder umsortieren, ohne eine Migration einzubauen.

## Deployment

- Repository: `HB9688/alphabet-prestige` (öffentlich). **GitHub Pages** veröffentlicht `main` (Wurzelverzeichnis) unter https://hb9688.github.io/alphabet-prestige/.
- Alles, was auf `main` landet, ist ~1 Minute später live. Vor dem Merge auf `main` im Browser testen.

## Design – vom Nutzer festgelegt

- **Farben:** die 26 Töne aus `farbverlauf.txt` (A = `#FFF4E6` … Z = `#6B1200`), gespiegelt in `js/palette.js`. **Palette exakt so verwenden**, auch wenn späte Stufen auf Schwarz dunkel wirken – der Nutzer hat das ausdrücklich so gewählt. Ändert sich `farbverlauf.txt`, `palette.js` mitziehen.
- **Hintergrund** dunkelgrau bis schwarz. **Schriftfarbe** im Inhalt = Farbe der aktiven Stufe (`--stage`, gesetzt in `ui.js`).
- **Überschrift** „Alphabet Prestige“ mit Verlauf über alle 26 Farben, genau auf Textbreite (`display:inline-block`), darunter eine weiche Palettenleiste.
- **Tabs** wie Browser-Tabs, einer pro freigeschalteter Stufe, plus ein Schloss-Tab für die nächste. Tabs werden schmaler, je mehr Stufen frei sind; bei wenig Platz nur der Buchstabe.
- **Layout:** links festes Panel (Punkte, Stufenpunkte, Reset, Automatisierung, Speichern). Rechts ein hinterlegtes Feld mit der Upgrade-Liste: **immer 8 Einträge sichtbar – die letzten 5 gekauften und die nächsten 3 offenen**; alle 26 per Scrollen erreichbar. Nach einem Kauf scrollt die Liste automatisch nach.
- **Sprache:** Umschalter DE | EN oben rechts. **Jeder neue sichtbare Text braucht beide Sprachen** – UI-Texte in `AP.STRINGS` (`js/i18n.js`), englische Upgrade-Texte in `AP.UPGRADE_EN` (gleiche Reihenfolge wie in `upgrades.js`).

## Upgrades – Konventionen

- IDs: Stufenbuchstabe + Position, also AA…AZ, BA…BZ. Kauf nur der Reihe nach (immer das nächste ungekaufte).
- Das letzte Upgrade jeder Stufe (`xZ`, kind `unlock:X`) schaltet die nächste Stufe frei.
- Mehr als 2 Upgrades nach dem nächsten offenen werden als „???“ angezeigt.
- Effekt-Arten (`kind`) sind oben in `js/upgrades.js` dokumentiert: `base`, `points`, `pow`, `gain:X`, `mod`, `keep:X`, `autobuy:X`, `autoreset:X`, `passive:X`, `unlock:X`.
- **Querverweise** auf frühere Upgrades über `kind: 'mod'` mit `target`, `op` (`mul`/`pow`) und `value`, z.B. CE: „Effekt von AR ×5“. Wird ein Upgrade verschoben, alle `target`-Verweise und Beschreibungen (DE + EN) prüfen.
- Kosten stehen in `COSTS` am Ende von `upgrades.js`, Reset-Formeln (`req`, `exp`) in `LAYERS` in `game.js`.

## Spielmechanik

- AA ist kostenlos und erzeugt 1 Punkt/s. A-Reset ab 10 Punkten: Gewinn `floor((Quelle/req)^exp × Multiplikatoren)`.
- Ein Reset der Stufe X setzt Punkte und alle niedrigeren Stufen (Punkte und Upgrades) zurück; `keep:`-Upgrades behalten die ersten N Upgrades.
- Geplanter Verlauf der Automatisierung: zuerst Auto-Kauf (BG), dann Auto-Reset (CD, CL), dann passive Generierung ohne Reset (CF, CO). Spätere Stufen sollen das weiter ausbauen.

## Balance

Zielzeiten für einen aktiven Spieler (vom Nutzer vorgegeben: ~1 h bis zur ersten B-Prestige):

| Meilenstein | Ziel | aktuell (Simulation) |
|---|---|---|
| erster A-Reset | ~10 s | 0:10 |
| AZ / erster B-Reset | ~55–60 min | 54 / 56 min |
| BZ | ~2 h | 2:02 h |
| CZ | ~3,5 h | 3:30 h |

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
