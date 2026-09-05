#!/usr/bin/env python3
"""Rezeptbuch-Build: _data/*.json -> docs/ (Rezeptseiten mit JSON-LD, Katalog, index.json).

Nur Python-3.8-Standardbibliothek. Aufrufe:
  python3 scripts/build.py                 alle Rezepte bauen
  python3 scripts/build.py --slug <slug>   ein Rezept bauen (Index wird immer neu gebaut)
  python3 scripts/build.py --check         nur validieren
  python3 scripts/build.py --slugify "Rote Linsensuppe"
"""
import argparse
import datetime
import html
import json
import os
import re
import shutil
import string
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "_data")
TPL = os.path.join(ROOT, "templates")
DOCS = os.path.join(ROOT, "docs")

UNITS = ["g", "kg", "ml", "l", "cl", "EL", "TL", "Stück", "Prise", "Pck.", "Bund", "Zehe", "Dose",
         "Glas", "Becher", "Scheibe", "Tasse", "Msp.", "Handvoll", "etwas", "n. B.", "Würfel", "Blatt",
         "Zweig", "Stange", "Kugel", "Tropfen", "Spritzer", "Schuss", "Flasche", "Beutel", "Tüte",
         "Riegel", "Kopf", "Knolle", "Schote", "Tafel", "Stiel", "Röhrchen", "cm", "m.-große", "große", "kleine"]
DIFFICULTY = {"simpel": 1, "normal": 2, "pfiffig": 3}
DIET_SCHEMA = {"vegetarisch": "VegetarianDiet", "vegan": "VeganDiet", "glutenfrei": "GlutenFreeDiet",
               "laktosefrei": "LowLactoseDiet", "low carb": "LowCalorieDiet", "halal": "HalalDiet", "koscher": "KosherDiet"}
FRACTIONS = [(0.25, "¼"), (0.33, "⅓"), (0.5, "½"), (0.66, "⅔"), (0.75, "¾")]


# ---------- Hilfsfunktionen ----------
def load_config():
    with open(os.path.join(ROOT, "rezepte.config.json"), encoding="utf-8") as f:
        return json.load(f)


def slugify(text):
    t = text.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t[:60].rstrip("-")


def iso_duration(minutes):
    if not minutes:
        return None
    h, m = divmod(int(minutes), 60)
    return "PT" + (("%dH" % h) if h else "") + (("%dM" % m) if m else "")


def hm(minutes):
    h, m = divmod(int(minutes or 0), 60)
    return "%d Std. %d Min." % (h, m)


def dhm(minutes):
    d, rest = divmod(int(minutes or 0), 1440)
    h, m = divmod(rest, 60)
    return "%d Tage %d Std. %d Min." % (d, h, m)


def minutes_label(minutes):
    minutes = int(minutes or 0)
    if minutes >= 60 and minutes % 60 == 0:
        return "%d Std." % (minutes // 60)
    if minutes >= 60:
        return "%d Std. %d Min." % divmod(minutes, 60)
    return "%d Min." % minutes


def format_amount(a):
    if a is None:
        return ""
    whole = int(a + 1e-9)
    rest = round(a - whole, 2)
    for f, sym in FRACTIONS:
        if abs(rest - f) < 0.03:
            return ("%d " % whole if whole else "") + sym
    if abs(rest) < 0.03:
        return str(whole)
    return ("%.1f" % a).replace(".", ",")


def ingredient_line(ing):
    """Zeile im Chefkoch-Stil: '250 g Mehl' / 'n. B. Salz' / '2 EL Butter (zum Ausbacken)'."""
    parts = []
    if ing.get("amount") is not None:
        parts.append(format_amount(ing["amount"]))
    if ing.get("unit"):
        parts.append(ing["unit"])
    parts.append(ing["name"])
    line = " ".join(parts)
    if ing.get("note"):
        line += " (%s)" % ing["note"]
    return line


def esc(s):
    return html.escape("" if s is None else str(s), quote=True)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write_if_changed(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and read(path) == text:
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return True


# ---------- Validierung ----------
def validate(r):
    errs, warns = [], []
    slug = r.get("slug", "")
    if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", slug) or len(slug) > 60:
        errs.append("slug ungültig: %r" % slug)
    if not (3 <= len(r.get("title") or "") <= 120):
        errs.append("title fehlt oder Länge nicht 3–120")
    if not isinstance(r.get("servings"), int) or not (1 <= r["servings"] <= 50):
        errs.append("servings muss int 1–50 sein")
    if not r.get("ingredients"):
        errs.append("ingredients leer")
    for i, ing in enumerate(r.get("ingredients") or []):
        if not ing.get("name"):
            errs.append("Zutat %d ohne name" % (i + 1))
        a = ing.get("amount")
        if a is not None and not isinstance(a, (int, float)):
            errs.append("Zutat %d: amount muss Zahl oder null sein" % (i + 1))
        if ing.get("grams") is not None and not isinstance(ing["grams"], (int, float)):
            errs.append("Zutat %d: grams muss Zahl oder null sein" % (i + 1))
        u = ing.get("unit")
        if u and u not in UNITS:
            warns.append("Zutat %d: Einheit %r nicht in Chefkoch-Liste" % (i + 1, u))
    if not r.get("steps"):
        errs.append("steps leer")
    if r.get("difficulty") not in DIFFICULTY:
        errs.append("difficulty muss simpel/normal/pfiffig sein")
    t = r.get("times") or {}
    for k in ("prep_min", "cook_min", "rest_min"):
        if not isinstance(t.get(k, 0), int) or t.get(k, 0) < 0:
            errs.append("times.%s muss int >= 0 sein" % k)
    if len(r.get("categories") or []) > 5:
        warns.append("mehr als 5 Kategorien")
    if r.get("status") not in ("published", "draft"):
        errs.append("status muss published/draft sein")
    for k in ("created", "updated"):
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", r.get(k) or ""):
            errs.append("%s muss YYYY-MM-DD sein" % k)
    return errs, warns


# ---------- JSON-LD ----------
def build_jsonld(r, cfg, url):
    t = r.get("times") or {}
    total = (t.get("prep_min") or 0) + (t.get("cook_min") or 0) + (t.get("rest_min") or 0)
    ld = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": r["title"],
        "description": r.get("description") or r.get("subtitle") or "",
        "url": url,
        "mainEntityOfPage": url,
        "author": {"@type": "Person", "name": r.get("author") or cfg.get("author") or "Rezeptbuch"},
        "datePublished": r["created"],
        "dateModified": r["updated"],
        "inLanguage": "de",
        "recipeYield": [str(r["servings"]), "%d Portionen" % r["servings"]],
        "recipeIngredient": [ingredient_line(i) for i in r["ingredients"]],
        "recipeInstructions": [{"@type": "HowToStep", "position": n + 1, "text": s} for n, s in enumerate(r["steps"])],
    }
    if r.get("image"):
        ld["image"] = [url + r["image"]]
    for key, field in (("prepTime", "prep_min"), ("cookTime", "cook_min")):
        if t.get(field):
            ld[key] = iso_duration(t[field])
    if total:
        ld["totalTime"] = iso_duration(total)
    per, _src, _rows = compute_nutrition(r)
    if per:
        n = {"@type": "NutritionInformation", "calories": "%d kcal" % round(per["kcal"]), "servingSize": "1 Portion"}
        if per.get("carbs_g") is not None: n["carbohydrateContent"] = "%d g" % round(per["carbs_g"])
        if per.get("protein_g") is not None: n["proteinContent"] = "%d g" % round(per["protein_g"])
        if per.get("fat_g") is not None: n["fatContent"] = "%d g" % round(per["fat_g"])
        ld["nutrition"] = n
    cats = [c.split(">")[-1].strip() for c in (r.get("categories") or [])]
    if cats:
        ld["recipeCategory"] = cats
    if r.get("cuisine"):
        ld["recipeCuisine"] = r["cuisine"]
    diets = [("https://schema.org/" + DIET_SCHEMA[d]) for d in (r.get("diet") or []) if d in DIET_SCHEMA]
    if diets:
        ld["suitableForDiet"] = diets
    kw = list(r.get("keywords") or []) + list(r.get("diet") or []) + [r["difficulty"]]
    ld["keywords"] = ", ".join(dict.fromkeys(kw))
    return ld


# ---------- Rendering ----------
def render_ingredients(r, micro):
    rows, last_group = [], None
    groups = {i.get("group") for i in r["ingredients"]}
    show_groups = len([g for g in groups if g]) > 0 and len(groups) > 1 or (len(groups) == 1 and None not in groups and len(r["ingredients"]) > 3)
    for ing in r["ingredients"]:
        g = ing.get("group")
        if show_groups and g != last_group and g:
            rows.append('<tr class="grp"><th colspan="3">%s</th></tr>' % esc(g))
        last_group = g
        amount = ing.get("amount")
        prop = ' itemprop="recipeIngredient"' if micro else ""
        cell_n = '<td class="n"%s>%s</td>' % ((' data-amount="%s"' % amount) if amount is not None else "", esc(format_amount(amount)))
        cell_u = '<td class="u">%s</td>' % esc(ing.get("unit") or "")
        note = ('<small>%s</small>' % esc(ing["note"])) if ing.get("note") else ""
        cell_i = '<td class="i"><span class="p-ingredient"%s>%s</span>%s</td>' % (prop, esc(ing["name"]), note)
        rows.append("<tr>%s%s%s</tr>" % (cell_n, cell_u, cell_i))
    return "\n        ".join(rows)


def render_steps(r, micro):
    out = []
    for s in r["steps"]:
        if micro:
            out.append('<li itemprop="recipeInstructions" itemscope itemtype="https://schema.org/HowToStep"><p itemprop="text">%s</p></li>' % esc(s))
        else:
            out.append("<li><p>%s</p></li>" % esc(s))
    return "\n        ".join(out)


def render_times(r, micro):
    t = r.get("times") or {}
    total = (t.get("prep_min") or 0) + (t.get("cook_min") or 0) + (t.get("rest_min") or 0)
    items = [("i-clock", total, "Gesamtzeit", "totalTime"), ("i-work", t.get("prep_min") or 0, "Arbeitszeit", "prepTime"),
             ("i-cook", t.get("cook_min") or 0, "Koch-/Backzeit", "cookTime"), ("i-rest", t.get("rest_min") or 0, "Ruhezeit", None)]
    out = []
    for icon, mins, label, prop in items:
        if not mins and label not in ("Gesamtzeit", "Arbeitszeit"):
            continue
        meta = ('<meta itemprop="%s" content="%s">' % (prop, iso_duration(mins))) if (micro and prop and mins) else ""
        out.append('<div><svg class="icon"><use href="#%s"/></svg><span><b>%s</b><small>%s</small></span>%s</div>' % (icon, minutes_label(mins), label, meta))
    return "\n        ".join(out)


def compute_nutrition(r):
    """Nährwerte pro Portion. Bevorzugt Berechnung aus Zutaten (grams + per100), sonst Rezeptangabe.
    Rückgabe: (werte-dict oder None, quelle: 'berechnet'|'angabe'|'geschaetzt'|None, zeilen für die Aufschlüsselung)."""
    rows, tot = [], {"kcal": 0.0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0}
    complete = True
    for ing in r["ingredients"]:
        g, p = ing.get("grams"), ing.get("per100") or {}
        if g is None or p.get("kcal") is None:
            if ing.get("amount") is not None:
                complete = False
            continue
        row = {"name": ing["name"], "grams": g}
        for k, pk in (("kcal", "kcal"), ("protein_g", "protein_g"), ("fat_g", "fat_g"), ("carbs_g", "carbs_g")):
            v = (p.get(pk) or 0) * g / 100.0
            row[k] = v
            tot[k] += v
        rows.append(row)
    n = max(1, r["servings"])
    if rows and complete:
        per = {k: v / n for k, v in tot.items()}
        return per, "berechnet", rows
    if r.get("calories_per_serving"):
        nu = r.get("nutrition") or {}
        per = {"kcal": float(r["calories_per_serving"]), "protein_g": nu.get("protein_g"), "fat_g": nu.get("fat_g"), "carbs_g": nu.get("carbs_g")}
        return per, ("geschaetzt" if "calories" in (r.get("estimated") or []) or "all" in (r.get("estimated") or []) else "angabe"), rows
    return None, None, rows


def fmt_g(v):
    return "–" if v is None else ("%d" % round(v))


def render_nutrition(r, micro):
    per, src, rows = compute_nutrition(r)
    if not per:
        return ""
    label = {"berechnet": "berechnet aus den Zutaten", "angabe": "laut Quelle", "geschaetzt": "geschätzt"}[src]
    scope = ' itemprop="nutrition" itemscope itemtype="https://schema.org/NutritionInformation"' if micro else ""
    tiles = [("i-flame", "%d kcal" % round(per["kcal"]), "Energie", "calories", "%d kcal" % round(per["kcal"])),
             ("i-egg", fmt_g(per["protein_g"]) + " g", "Eiweiß", "proteinContent", None),
             ("i-drop", fmt_g(per["fat_g"]) + " g", "Fett", "fatContent", None),
             ("i-bread", fmt_g(per["carbs_g"]) + " g", "Kohlenhydrate", "carbohydrateContent", None)]
    t_html = []
    for icon, val, name, prop, _ in tiles:
        meta = ""
        if micro and per.get({"calories": "kcal", "proteinContent": "protein_g", "fatContent": "fat_g", "carbohydrateContent": "carbs_g"}[prop]) is not None:
            meta = '<meta itemprop="%s" content="%s">' % (prop, val)
        t_html.append('<div><svg class="icon"><use href="#%s"/></svg><span><b>%s</b><small>%s</small></span>%s</div>' % (icon, val, name, meta))
    calc = ""
    if src == "berechnet" and rows:
        trs = "".join('<tr><td>%s</td><td class="r">%d g</td><td class="r">%d</td><td class="r">%s</td><td class="r">%s</td><td class="r">%s</td></tr>' % (
            esc(x["name"]), round(x["grams"]), round(x["kcal"]), fmt_g(x["protein_g"]), fmt_g(x["fat_g"]), fmt_g(x["carbs_g"])) for x in rows)
        n = r["servings"]
        tot = {k: sum(x[k] for x in rows) for k in ("kcal", "protein_g", "fat_g", "carbs_g")}
        calc = ('<details class="nutri-calc"><summary><svg class="icon"><use href="#i-chevron"/></svg>Berechnung anzeigen</summary>'
                '<div style="overflow-x:auto"><table><thead><tr><th>Zutat</th><th class="r">Menge</th><th class="r">kcal</th><th class="r">Eiweiß g</th><th class="r">Fett g</th><th class="r">KH g</th></tr></thead>'
                '<tbody>%s<tr class="sum"><td>Gesamt (%d Portionen)</td><td></td><td class="r">%d</td><td class="r">%d</td><td class="r">%d</td><td class="r">%d</td></tr></tbody></table></div>'
                '<p style="color:var(--muted);font-size:.88rem;margin:8px 0 0">Richtwerte je 100 g aus üblichen Nährwerttabellen, Mengen in Gramm geschätzt. Abweichungen je nach Produkt möglich.</p></details>'
                % (trs, n, round(tot["kcal"]), round(tot["protein_g"]), round(tot["fat_g"]), round(tot["carbs_g"])))
    return ('<section class="nutri-sect" aria-labelledby="h-nutri"%s><div class="sect-head"><h2 id="h-nutri">Nährwerte pro Portion</h2><small>%s</small></div>'
            '<div class="nutri-tiles">%s</div>%s</section>') % (scope, label, "".join(t_html), calc)


def _unused_render_nutrition(r, micro):
    if not r.get("calories_per_serving"):
        return ""
    nu = r.get("nutrition") or {}
    bits = ['<span><svg class="icon"><use href="#i-flame"/></svg>%s kcal pro Portion%s</span>' % (
        r["calories_per_serving"], ' <span class="est">geschätzt</span>' if "calories" in (r.get("estimated") or []) else "")]
    for k, label in (("carbs_g", "Kohlenhydrate"), ("protein_g", "Eiweiß"), ("fat_g", "Fett")):
        if nu.get(k) is not None:
            bits.append("<span>%s g %s</span>" % (nu[k], label))
    scope = ' itemprop="nutrition" itemscope itemtype="https://schema.org/NutritionInformation"' if micro else ""
    cal = ('<meta itemprop="calories" content="%d kcal">' % r["calories_per_serving"]) if micro else ""
    return '<div class="nutri"%s>%s%s</div>' % (scope, cal, "".join(bits))


def render_recipe(r, cfg, tpl, icons, stamp):
    micro = not r.get("_test_jsonld_only")
    base = cfg["base_url"].rstrip("/")
    rdir = cfg.get("recipe_dir", "rezepte")
    url = "%s/%s/%s/" % (base, rdir, r["slug"])
    ld = build_jsonld(r, cfg, url)
    t = r.get("times") or {}
    est = set(r.get("estimated") or [])
    if "all" in est:
        est |= {"times", "calories", "difficulty"}
    author = r.get("author") or cfg.get("author") or "Rezeptbuch"
    desc = r.get("description") or r.get("subtitle") or r["title"]
    og = ""
    if micro:
        og = "\n".join([
            '<meta property="og:type" content="article">', '<meta property="og:locale" content="de_DE">',
            '<meta property="og:title" content="%s">' % esc(r["title"]),
            '<meta property="og:description" content="%s">' % esc(desc),
            '<meta property="og:url" content="%s">' % esc(url),
            '<meta property="og:site_name" content="%s">' % esc(cfg["site_title"]),
        ] + (['<meta property="og:image" content="%s">' % esc(url + r["image"])] if r.get("image") else []))
    if r.get("image"):
        image_html = '<div class="hero-img"><img src="%s" alt="%s"%s></div>' % (
            esc(r["image"]), esc(r["title"]), ' itemprop="image"' if micro else "")
    else:
        image_html = '<div class="hero-img empty" aria-hidden="true"><svg class="icon"><use href="#i-hat"/></svg></div>'
    diet_meta = ""
    if r.get("diet"):
        diet_meta = '<li><svg class="icon"><use href="#i-leaf"/></svg><span><b>%s</b><small>Ernährung</small></span></li>' % esc(", ".join(r["diet"]))
    tags = [esc(x) for x in (r.get("tags") or [])]
    tags_html = ""
    if tags or r.get("cuisine"):
        chips = ['<span class="tag">%s</span>' % x for x in tags]
        if r.get("cuisine"):
            chips.append('<span class="tag neutral"><svg class="icon"><use href="#i-globe"/></svg>%s</span>' % esc(r["cuisine"]))
        tags_html = '<div class="tags">%s</div>' % "".join(chips)
    src = r.get("source") or {}
    src_map = {"text": "Aus Text übernommen", "photo": "Aus Foto übernommen", "pdf": "Aus PDF übernommen",
               "screenshot": "Aus Screenshot übernommen", "idea": "KI-generiert aus einer Idee", "url": "Aus Webseite übernommen"}
    source_label = src_map.get(src.get("type"), "")
    if src.get("note"):
        source_label += (" · " if source_label else "") + esc(src["note"])
    est_names = {"times": "Zeiten", "calories": "Kalorien", "difficulty": "Schwierigkeit", "servings": "Portionen", "all": "alle Angaben"}
    estimated_label = ""
    if est:
        estimated_label = " · Geschätzt: " + ", ".join(est_names.get(e, e) for e in sorted(est))
    copy_ings = "\n".join("%s\t%s\t%s" % (format_amount(i.get("amount")), i.get("unit") or "", i["name"] + ((" (%s)" % i["note"]) if i.get("note") else "")) for i in r["ingredients"])
    copy_steps = "\n".join("%d. %s" % (n + 1, s) for n, s in enumerate(r["steps"]))
    values = {
        "build_stamp": stamp, "site_title": esc(cfg["site_title"]), "brand_html": cfg.get("site_title_html") or esc(cfg["site_title"]), "root": "../..",
        "title": esc(r["title"]), "title_attr": esc(r["title"]), "description_attr": esc(desc),
        "url": esc(url), "og_tags": og,
        "jsonld": json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/"),
        "icons": icons,
        "recipe_scope": 'class="h-recipe" itemscope itemtype="https://schema.org/Recipe"' if micro else "",
        "p_name": 'class="p-name" itemprop="name"' if micro else "",
        "p_author": 'itemprop="author"' if micro else "",
        "p_yield": 'itemprop="recipeYield"' if micro else "",
        "image_html": image_html,
        "subtitle_html": ('<p class="sub"%s>%s</p>' % (' itemprop="description"' if micro else "", esc(r["subtitle"]))) if r.get("subtitle") else "",
        "prep_label": minutes_label(t.get("prep_min") or 0), "prep_est": ' <span class="est">geschätzt</span>' if "times" in est else "",
        "difficulty_level": DIFFICULTY[r["difficulty"]], "difficulty_label": r["difficulty"].capitalize(),
        "difficulty_est": ' <span class="est">geschätzt</span>' if "difficulty" in est else "",
        "diet_meta": diet_meta, "author": esc(author), "tags_html": tags_html,
        "servings": r["servings"],
        "ingredients_html": render_ingredients(r, micro), "times_html": render_times(r, micro),
        "steps_html": render_steps(r, micro), "nutrition_html": render_nutrition(r, micro),
        "tip_html": ('<div class="tip"><svg class="icon"><use href="#i-bulb"/></svg><p><b>Tipp:</b> %s</p></div>' % esc(r["tip"])) if r.get("tip") else "",
        "categories_label": esc(" · ".join(r.get("categories") or [])) or "–",
        "prep_hm": hm(t.get("prep_min")), "cook_hm": hm(t.get("cook_min")), "rest_dhm": dhm(t.get("rest_min")),
        "calories_label": ("%d kcal pro Portion" % round(compute_nutrition(r)[0]["kcal"])) if compute_nutrition(r)[0] else "–",
        "source_label": source_label, "estimated_label": estimated_label,
        "copy_ingredients": esc(copy_ings), "copy_steps": esc(copy_steps), "updated": r["updated"],
    }
    page = string.Template(tpl).substitute(values)
    # Selbsttest: JSON-LD zurückparsen
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', page, re.S)
    json.loads(m.group(1).replace("<\\/", "</"))
    return page, url, ld


def index_entry(r, cfg, url):
    t = r.get("times") or {}
    total = (t.get("prep_min") or 0) + (t.get("cook_min") or 0) + (t.get("rest_min") or 0)
    search = " ".join([r["title"], r.get("subtitle") or "", r.get("description") or ""] + [i["name"] for i in r["ingredients"]]
                      + list(r.get("tags") or []) + list(r.get("keywords") or []) + list(r.get("categories") or []) + [r.get("cuisine") or ""])
    rdir = cfg.get("recipe_dir", "rezepte")
    return {"slug": r["slug"], "title": r["title"], "subtitle": r.get("subtitle"), "url": "%s/%s/" % (rdir, r["slug"]),
            "image": r.get("image"), "prep_min": t.get("prep_min") or 0, "total_min": total, "difficulty": r["difficulty"],
            "calories": (round(compute_nutrition(r)[0]["kcal"]) if compute_nutrition(r)[0] else None), "diet": r.get("diet") or [], "categories": r.get("categories") or [],
            "tags": r.get("tags") or [], "cuisine": r.get("cuisine"), "servings": r["servings"],
            "created": r["created"], "updated": r["updated"], "search": search, "absolute_url": url}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--slugify")
    ap.add_argument("--base-url")
    args = ap.parse_args()
    if args.slugify:
        print(slugify(args.slugify))
        return 0

    cfg = load_config()
    if args.base_url:
        cfg["base_url"] = args.base_url
    stamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    today = datetime.date.today().isoformat()

    recipes = []
    for fn in sorted(os.listdir(DATA)):
        if fn.endswith(".json"):
            with open(os.path.join(DATA, fn), encoding="utf-8") as f:
                r = json.load(f)
            if r.get("slug") != fn[:-5]:
                print("FEHLER %s: slug %r passt nicht zum Dateinamen" % (fn, r.get("slug")))
                return 1
            recipes.append(r)

    failed = False
    for r in recipes:
        errs, warns = validate(r)
        for w in warns:
            print("WARNUNG %s: %s" % (r["slug"], w))
        for e in errs:
            print("FEHLER %s: %s" % (r["slug"], e))
        failed = failed or bool(errs)
    if failed:
        return 1
    if args.check:
        print("OK: %d Rezepte gültig" % len(recipes))
        return 0

    icons = read(os.path.join(TPL, "icons.svg"))
    tpl_r = read(os.path.join(TPL, "rezept.html"))
    tpl_i = read(os.path.join(TPL, "index.html"))
    rdir = cfg.get("recipe_dir", "rezepte")
    written = []

    entries = []
    for r in recipes:
        page, url, ld = render_recipe(r, cfg, tpl_r, icons, stamp)
        if args.slug is None or args.slug == r["slug"]:
            out_dir = os.path.join(DOCS, rdir, r["slug"])
            if write_if_changed(os.path.join(out_dir, "index.html"), page):
                written.append(os.path.relpath(os.path.join(out_dir, "index.html"), ROOT))
            pub = {k: v for k, v in r.items() if not k.startswith("_")}
            write_if_changed(os.path.join(out_dir, "rezept.json"), json.dumps(pub, ensure_ascii=False, indent=2) + "\n")
            if r.get("image") and not os.path.exists(os.path.join(out_dir, r["image"])):
                print("WARNUNG %s: Bild %s fehlt in %s" % (r["slug"], r["image"], out_dir))
        if r.get("status") == "published":
            entries.append(index_entry(r, cfg, url))
    entries.sort(key=lambda e: e["updated"], reverse=True)

    n = len(entries)
    count_label = "1 Rezept" if n == 1 else "%d Rezepte" % n
    idx = string.Template(tpl_i).substitute({
        "build_stamp": stamp, "site_title": esc(cfg["site_title"]), "brand_html": cfg.get("site_title_html") or esc(cfg["site_title"]), "count_label": count_label, "today": today,
        "icons": icons, "index_json": json.dumps(entries, ensure_ascii=False).replace("</", "<\\/"),
    })
    if write_if_changed(os.path.join(DOCS, "index.html"), idx):
        written.append("docs/index.html")
    write_if_changed(os.path.join(DOCS, "index.json"), json.dumps(entries, ensure_ascii=False, indent=1) + "\n")
    for static in ("style.css", "app.js"):
        shutil.copyfile(os.path.join(TPL, static), os.path.join(DOCS, static))
    open(os.path.join(DOCS, ".nojekyll"), "a").close()

    for w in written:
        print("geschrieben:", w)
    for r in recipes:
        if args.slug is None or args.slug == r["slug"]:
            print("%s: %d Zutaten, %d Schritte, %s" % (r["slug"], len(r["ingredients"]), len(r["steps"]), r["status"]))
    print("Build-Stempel:", stamp)
    return 0


if __name__ == "__main__":
    sys.exit(main())
