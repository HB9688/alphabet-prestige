# Alphabet Prestige

Ein Idle-/Prestige-Spiel für den Browser. Jeder Buchstabe des Alphabets ist eine eigene Prestigestufe mit 26 Upgrades (AA–AZ, BA–BZ, …). Das letzte Upgrade einer Stufe schaltet die nächste frei.

Aktueller Stand: Stufen **A bis C** spielbar, Deutsch und Englisch.

## Spielen

`index.html` im Browser öffnen – kein Build, keine Abhängigkeiten.

Lokal mit Server (z.B. zum Testen auf dem Handy im selben WLAN):

```
py -m http.server 8123
```

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html`, `style.css` | Layout und Design |
| `farbverlauf.txt` | Die 26 Stufenfarben (Quelle) |
| `js/palette.js` | Farben als Array |
| `js/i18n.js` | Texte Deutsch/Englisch |
| `js/upgrades.js` | Alle Upgrades (Effekte, Kosten) |
| `js/game.js` | Spiellogik, Reset, Automatisierung, Speichern |
| `js/ui.js` | Darstellung und Spielschleife |
| `tools/sim.html` | Balance-Simulation eines aktiven Spielers |
| `tools/tune.html` | Stellt Kosten automatisch auf Zielzeiten ein |

Die Tools brauchen einen lokalen Server (`py -m http.server`), dann `http://localhost:8123/tools/sim.html` öffnen.

## Debug (Browser-Konsole)

```js
debug.unlock('C')      // Stufen freischalten
debug.add('A', 1e6)    // A-Punkte hinzufügen ('P' für Punkte)
```

## Lizenz

© 2026 HB9688 – alle Rechte vorbehalten. Der Code ist öffentlich einsehbar, aber nicht Open Source; Kopieren, Verändern oder Weiterverbreiten nur mit Erlaubnis. Details siehe [LICENSE](LICENSE).
