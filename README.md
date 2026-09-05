# Rezepte – KI-gestützter Rezept-Import für Chefkoch

Rezepte werden hier als JSON gepflegt (`_data/`), daraus entstehen öffentliche Rezeptseiten
(`docs/`, veröffentlicht über GitHub Pages) mit schema.org-Daten, die Chefkoch per URL importieren kann.

## Einmalige Einrichtung von GitHub (ca. 15 Minuten)

Du brauchst dafür nur den Browser. Claude gibt niemals Passwörter oder Token ein.

**Anonymität:** Das Projekt läuft unter einem Künstlernamen. Lege das GitHub-Konto mit einer separaten, privaten E-Mail-Adresse an (nicht die 21one-Adresse), verwende nirgends deinen Klarnamen und aktiviere in GitHub unter Settings → Emails „Keep my email addresses private“.

### 1. GitHub-Konto anlegen
1. https://github.com/signup öffnen.
2. E-Mail, Passwort und einen **Benutzernamen** wählen (kurz, nur Kleinbuchstaben/Ziffern, frei erfunden, **nicht** dein Klarname, z.B. ein Künstlername).
   Dieser Benutzername wird Teil aller Rezept-URLs: `https://<benutzername>.github.io/rezepte/...`
3. E-Mail bestätigen. Der kostenlose Plan reicht.

### 2. Repository „rezepte“ anlegen
1. Oben rechts auf **+** → **New repository**.
2. Repository name: `rezepte`
3. Sichtbarkeit: **Public** (nötig, damit GitHub Pages im Free-Plan funktioniert).
4. **Keine** Häkchen bei „Add a README“, „.gitignore“ oder „license“ setzen.
5. **Create repository** klicken. Die dann angezeigte Seite kannst du ignorieren.

### 3. Zugangs-Token erstellen (ersetzt das Passwort beim Hochladen)
1. Oben rechts auf dein Profilbild → **Settings** → ganz unten links **Developer settings**.
2. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
3. Token name: `rezepte-mac`; Expiration: **1 year** (oder „Custom“ länger).
4. Repository access: **Only select repositories** → `rezepte` auswählen.
5. Permissions → Repository permissions → **Contents** → **Read and write**.
6. **Generate token**. Den Token **sofort kopieren** (er wird nur einmal angezeigt) und z.B. in 1Password ablegen.

### 4. Erster Upload (einmalig im Terminal)
Sag Claude deinen GitHub-Benutzernamen (= Künstlername). Claude trägt ihn in `rezepte.config.json` und die Seiten ein
und verbindet den Ordner mit GitHub. Danach führst du **einmal** im Terminal aus:

```bash
cd "/Users/jenswolfhagen/Claude/Projects/Apps/Rezepte" && git push -u origin main
```

Abfrage `Username`: dein GitHub-Benutzername. Abfrage `Password`: den **Token** einfügen (nicht dein Passwort).
Der Mac-Schlüsselbund merkt sich das; alle weiteren Uploads laufen automatisch aus Claude Code.

### 5. GitHub Pages einschalten
1. Im Browser: `https://github.com/<benutzername>/rezepte` → **Settings** → links **Pages**.
2. Unter „Build and deployment“: Source **Deploy from a branch**; Branch **main**, Ordner **/docs** → **Save**.
3. Nach 1–2 Minuten ist die Seite unter `https://<benutzername>.github.io/rezepte/` erreichbar.

## Chefkoch-Import-Test (Meilenstein M1)

Testseiten nach der Einrichtung:
- `https://<benutzername>.github.io/rezepte/rezepte/test-pfannkuchen/` (JSON-LD + Microdata + Open Graph)
- `https://<benutzername>.github.io/rezepte/rezepte/test-pfannkuchen-jsonld/` (nur JSON-LD, Isolationstest)

In Chefkoch: Kochbuch → Rezept importieren → erste URL einfügen. Dann diese Checkliste ausfüllen
(Screenshot des importierten Rezepts an Claude reicht):

| Feld | Erwartet | Angekommen? |
|---|---|---|
| Rezeptname | Klassische Pfannkuchen | |
| Zusätzliche Informationen | Fluffige Pfannkuchen aus Mehl, Milch und Eiern… | |
| Portionen | 4 | |
| Zutaten: Menge im Mengenfeld | 250 / 500 / 3 / 1 / 1 / 2 | |
| Zutaten: Einheit im Dropdown | g / ml / Stück / Prise / EL / EL | welche nicht? |
| Zutaten: Name | Mehl, Milch, Ei(er), Salz, Zucker, Butter | |
| Zubereitung | 4 getrennte Schritte | |
| Arbeitszeit | 10 Min. | |
| Koch-/Backzeit | 20 Min. | |
| Ruhezeit | 15 Min. (oder in Gesamtzeit 45) | |
| Schwierigkeitsgrad | simpel | vermutlich nicht |
| Kalorien | 320 | |
| Kategorien | Hauptspeise, Süßspeise | vermutlich nicht |
| Rezeptbild | gelb-brauner Verlauf | |

Falls der Import klappt: danach die zweite URL (nur JSON-LD) testen.
Falls Chefkoch die URL ablehnt („nicht unterstützt“ o.ä.): Fehlermeldung wörtlich an Claude weitergeben.

## Nutzung

Im Claude-Chat (funktioniert aus jedem Projekt, der Skill ist auch global verlinkt):

- `/rezept` + eingefügter Rezepttext
- `/rezept /Pfad/zum/Foto.jpg` (Kochbuchseite, Zettel, Screenshot; HEIC wird gewandelt)
- `/rezept /Pfad/zur/Datei.pdf`
- `/rezept schnelle Linsensuppe, vegan, für 4` (nur Idee, Rezept wird geschrieben)
- `/rezept update <slug> Portionen auf 6` (bestehendes Rezept ändern)

Claude zeigt eine Prüftabelle, veröffentlicht nach deinem „ok“ und liefert die Import-URL.

Manuell bauen: `python3 scripts/build.py` · prüfen: `python3 scripts/build.py --check` · Bild: `python3 scripts/bild.py <quelle> <slug>`

Rezept löschen: `_data/<slug>.json` und `docs/rezepte/<slug>/` entfernen, `python3 scripts/build.py`, committen und pushen.

## Ordner
- `_data/` kanonische Rezept-JSONs (Quelle der Wahrheit)
- `_inbox/` Rohfotos/PDFs, wird nicht hochgeladen
- `templates/`, `scripts/` Build-System (Python 3, keine Zusatzpakete)
- `docs/` veröffentlichte Seiten (GitHub Pages)
