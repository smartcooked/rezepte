# Chefkoch-Einheiten und Normalisierung

Gültige Werte für `ingredients[].unit` (Chefkoch-Dropdown, Stand: vor dem Import-Test, nach M1 abgleichen):

`g` · `kg` · `ml` · `l` · `cl` · `EL` · `TL` · `Stück` · `Prise` · `Pck.` · `Bund` · `Zehe` · `Dose` · `Glas` · `Becher` · `Scheibe` · `Tasse` · `Msp.` · `Handvoll` · `etwas` · `n. B.` · `Würfel` · `Blatt` · `Zweig` · `Stange` · `Kugel` · `Tropfen` · `Spritzer` · `Schuss` · `Flasche` · `Beutel` · `Tüte` · `Riegel` · `Kopf` · `Knolle` · `Schote` · `Tafel` · `Stiel` · `Röhrchen` · `cm` · `m.-große` · `große` · `kleine`

Kein Wert (`null`) ist erlaubt, wenn die Zutat ohne Einheit gezählt wird und die Menge im Namen steckt („Ei(er)“ → besser `Stück`).

## Normalisierung (Quelle → Einheit)

| Quelle | → unit | Hinweis |
|---|---|---|
| Esslöffel, Essl., Eßl., EL. | EL | |
| Teelöffel, Teel., TL. | TL | |
| Stk., St., Stck., Stück(e), x | Stück | „3 Eier“ → 3 Stück Ei(er) |
| Pkg., Päckchen, Packung, Pck | Pck. | |
| Knoblauchzehe(n) | Zehe | Name „Knoblauch“ |
| nach Belieben, nach Geschmack, n.B., etwas Salz | n. B. bzw. etwas | Menge `null` |
| Prise(n) | Prise | |
| Messerspitze | Msp. | |
| Liter | l | 0,5 l → amount 0.5 |
| Milliliter | ml | |
| Gramm, gr | g | |
| Kilogramm | kg | |
| Scheiben | Scheibe | |
| Blätter | Blatt | |
| Zweige | Zweig | |
| Stangen | Stange | |
| Dosen | Dose | Note für Inhalt, z.B. „400 ml“ |
| Becher, Cup | Becher / Tasse | US „cup“ → Tasse, ggf. in ml umrechnen (1 cup ≈ 240 ml) |
| Handvoll, Hand voll | Handvoll | |
| Schuss, Spritzer | Schuss / Spritzer | |
| ½, 1/2, halbe | 0.5 | Brüche immer als Dezimalzahl |
| ¼, 1/4 | 0.25 | |
| ¾, 3/4 | 0.75 | |
| ⅓, 1/3 | 0.33 | |
| 1–2, 2-3 | untere Zahl | Bereich als `note`: „1–2“ |
| ca., etwa, gut | Zahl | Zusatz weglassen |

## Schreibweise der Zutatennamen (Chefkoch-Stil)

- Grundform mit Plural in Klammern: „Ei(er)“, „Zwiebel(n)“, „Tomate(n)“, „Kartoffel(n)“, „Möhre(n)“, „Paprikaschote(n)“.
- Zusätze wie „light“, „gerieben“, „frisch“, „gehackt“ als `note`, nicht im Namen. Ausnahme: fester Begriff („Käse, geriebener“ ist Chefkoch-Stil, akzeptabel).
- Kein „Salz und Pfeffer“ in einer Zeile, wenn Mengen unterschiedlich sind; sonst erlaubt mit `n. B.`.
