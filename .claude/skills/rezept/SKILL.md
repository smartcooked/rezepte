---
name: rezept
description: Rezept aus Text, Foto, PDF, Screenshot oder Idee strukturieren, als Seite im Rezeptbuch veröffentlichen und die Chefkoch-Import-URL liefern. Nutzen bei "/rezept", "Rezept anlegen", "für Chefkoch aufbereiten", "Rezept aktualisieren".
argument-hint: [Text | Pfad zu Foto/PDF/Screenshot | Idee/Stichworte | update <slug> <Änderung>]
---

# /rezept – Rezept anlegen und für Chefkoch veröffentlichen

Projektordner: `/Users/jenswolfhagen/Claude/Projects/Apps/Rezepte` (im Folgenden ROOT). Alle Befehle mit absoluten Pfaden ausführen. Antworten auf Deutsch, knapp.

## 0. Voraussetzungen (still prüfen)
- `git -C ROOT status --porcelain` muss leer sein (sonst zuerst melden, was ungesichert ist).
- `git -C ROOT remote -v` muss `origin` zeigen und `ROOT/rezepte.config.json` eine `base_url` ohne Platzhalter. Fehlt etwas: auf README „Einrichtung“ verweisen und abbrechen.

## 1. Eingabe erkennen
- Argument ist ein Pfad `.jpg/.jpeg/.png/.webp` → Bild mit `Read` lesen. `.heic` zuerst wandeln: `/usr/bin/sips -s format jpeg <pfad> --out ROOT/_inbox/tmp.jpg`.
- `.pdf` → `Read` mit `pages` (bei mehr als 10 Seiten fragen, welche Seiten).
- Mehrere Pfade → alle lesen (Doppelseite).
- Freitext mit Zutaten/Schritten → **Text**. Nur Stichworte oder Wunsch („schnelle Linsensuppe, vegan, 4 Personen“) → **Idee**: komplettes Rezept schreiben, `source.type = "idea"`, `estimated = ["all"]`.
- Enthält der Text eine URL: darauf hinweisen, dass Chefkoch die URL direkt importieren kann; nur auf Wunsch weitermachen.
- `update <slug> <Änderung>` → `ROOT/_data/<slug>.json` laden, Änderung einarbeiten, weiter bei Schritt 4.
- Rohdateien nach `ROOT/_inbox/<datum>-<slug>.<ext>` kopieren (nicht ins Repo).

## 2. Extrahieren und normalisieren (Regeln)
- **Titel** wie in der Quelle; bei Idee prägnant im Chefkoch-Stil. **Untertitel** 2–6 Wörter („schnell, einfach & vegetarisch“).
- **Zutaten** eine pro Zeile: `amount` als Zahl (Brüche → Dezimal), `unit` strikt aus `einheiten.md`, Zusätze in `note`, Gruppen („Für den Teig“) in `group`. Namen im Chefkoch-Stil („Ei(er)“).
- **Zubereitung**: nummerierte Schritte, 1–3 Sätze je Schritt, **eigene Formulierung** (Seite ist öffentlich, kein wörtliches Kopieren aus Kochbuch oder Website). Temperaturen, Zeiten, Mengen aus der Quelle übernehmen.
- **Portionen** aus Quelle, sonst 4 und `estimated` ergänzen.
- **Zeiten**: Arbeitszeit = aktive Zeit, Koch-/Backzeit = passive Hitze, Ruhezeit = Kühlen/Gehen/Marinieren. Fehlend → schätzen, `"times"` in `estimated`.
- **Schwierigkeit**: ≤ 8 Zutaten und ≤ 6 Schritte → simpel; Teig, Temperieren, Reduktionen, mehrere Komponenten → pfiffig; sonst normal. Geschätzt → `estimated`.
- **Nährwerte**: für jede Zutat `grams` (Gewicht der angegebenen Menge in Gramm, z.B. 1 Ei = 60 g, 1 EL Öl = 10 g, 500 ml Milch = 515 g) und `per100` = `{kcal, protein_g, fat_g, carbs_g}` je 100 g aus üblichen Nährwerttabellen (BLS/USDA-Richtwerte) eintragen. Der Build berechnet daraus die Werte pro Portion und zeigt die Aufschlüsselung. Wasser, Salz, Gewürze: `grams` eintragen, `per100` mit 0. Nur wenn das für einzelne Zutaten unmöglich ist: `calories_per_serving` + `nutrition` als Rezeptschätzung und `"calories"` in `estimated`.
- **Tipp** (`tip`): optionaler Hinweis zu Varianten, Aufbewahrung oder Austausch von Zutaten, 1–3 Sätze; aus der Quelle übernehmen oder sinnvoll ergänzen.
- **Kategorien**: 2–5 Pfade aus `kategorien.md`. **diet**: vegetarisch/vegan/glutenfrei/laktosefrei/low carb/high protein nur, wenn eindeutig. **cuisine** nur bei klarer Küche. **tags** 1–4 freie Stichworte für den Katalog, **keywords** 2–5 Suchbegriffe.
- **Bild**: nur ein echtes Gerichtsfoto wird `image: "bild.jpg"`. Ein Foto einer Kochbuchseite, ein Screenshot oder ein Zettel ist **kein** Rezeptbild → `image: null`.
- **source**: `{type: text|photo|pdf|screenshot|idea|url, note: "nach: <Buch/Seite/Person>"}`; keine Namen Dritter außer öffentlicher Autor:innen.
- **slug**: `python3 ROOT/scripts/build.py --slugify "<Titel>"`.
- Datumsfelder `created`/`updated` = heute (ISO), `status: "published"`, `schema_version: 1`, `author: null` (Konfiguration liefert den Künstlernamen).

Vollständiges Feldschema: siehe `ROOT/_data/test-pfannkuchen.json`.

## 3. Duplikate
Existiert `ROOT/_data/<slug>.json` oder der Titel (Groß-/Kleinschreibung egal) in `ROOT/docs/index.json`: fragen — (a) aktualisieren (`created` behalten, `updated` heute), (b) neu als `<slug>-2`, (c) abbrechen. Hinweis geben, dass ein erneuter Import in Chefkoch vermutlich einen zweiten Kochbucheintrag anlegt.

## 4. Prüftabelle im Chat
Genau dieses Format, keine Zusatzprosa:

```
**<Titel>** – <Untertitel> · <n> Portionen
Arbeit <x> min · Kochen <y> min · Ruhe <z> · <Schwierigkeit> · ~<kcal> kcal (geschätzt: <Liste>)
| # | Menge | Einheit | Zutat | Hinweis | g |
| 1 | 250 | g | Mehl | Für den Teig | 250 |
…
Zubereitung: <n> Schritte (1. <erste 8 Wörter> … 2. …) · Tipp: ja/nein
Nährwerte/Portion: <kcal> kcal · <E> g Eiweiß · <F> g Fett · <KH> g Kohlenhydrate (berechnet)
Kategorien: <Pfade> · Ernährung: <diet> · Küche: <cuisine>
Bild: keins / bild.jpg
```
Rückfragen nur bei echter Unklarheit (unleserliche Menge, fehlende Einheit bei Kernzutat, Portionen nicht ableitbar), gesammelt in einer Runde, nummeriert. Sonst: „Passt so? (ok = veröffentlichen)“. Korrekturen in Freitext übernehmen und nur die geänderten Zeilen erneut zeigen. **Nie ohne „ok“ veröffentlichen.**

## 5. Schreiben und bauen
1. `ROOT/_data/<slug>.json` schreiben (UTF-8, 2 Leerzeichen, `ensure_ascii=False`).
2. Bei Bild: `python3 ROOT/scripts/bild.py <quelle> <slug>` (wandelt, verkleinert, entfernt EXIF/GPS).
3. `python3 ROOT/scripts/build.py --slug <slug>` — bei Exit ≠ 0 Fehler beheben und erneut bauen. Den `Build-Stempel` aus der Ausgabe merken.

## 6. Commit und Push
```
git -C ROOT add _data/<slug>.json docs/
git -C ROOT commit -m "Rezept: <Titel>"        # bzw. "Rezept aktualisiert: <Titel>"
GIT_TERMINAL_PROMPT=0 git -C ROOT push origin main
```
Bei Auth-Fehler (401/403, „could not read Username“): nicht wiederholen, sondern bitten, einmal im Terminal `cd ROOT && git push` auszuführen (Benutzername + Token). Nie nach Token oder Passwort fragen.

## 7. Live-Prüfung
`python3 ROOT/scripts/check.py <URL> <Build-Stempel>` (wartet bis 4 Minuten). Bei Timeout URL trotzdem nennen mit Hinweis „in 1–2 Minuten erneut laden“.

## 8. Ergebnis (Format)
```
Fertig: <URL>
Chefkoch: Kochbuch → Rezept importieren → URL einfügen.
Danach in Chefkoch setzen: Kategorien <Pfade>; Schwierigkeit <x>; Zeiten <a>/<b>/<c> min; <kcal> kcal<(geschätzt)>.
<n> Zutaten · <m> Schritte · Bild: ja/nein
```
Die Liste „Danach in Chefkoch setzen“ nach dem Ergebnis des Import-Tests (README, Abschnitt „Chefkoch-Importverhalten“) anpassen.

## Regeln
- Keine personenbezogenen Daten auf Seiten (keine Adressen, keine Namen aus privaten Notizen). Klarname von Jens nirgends verwenden.
- Rohbilder nie nach `docs/` kopieren, nur das aufbereitete `bild.jpg`.
- Zubereitung paraphrasieren; Quelle als „nach: …“ nennen.
- Bei `idea` immer Kennzeichnung „KI-generiert“ (macht der Build über `source.type`).
- Antworten kurz; keine Erklärung des Prozesses, nur Prüftabelle und Ergebnis.
