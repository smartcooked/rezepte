#!/usr/bin/env python3
"""Wartet, bis eine Seite mit dem gegebenen Build-Stempel live ist, und prüft das JSON-LD.
Aufruf: python3 scripts/check.py <url> <build_stamp> [timeout_s]
"""
import json
import re
import sys
import time
import urllib.request


def fetch(url):
    req = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "User-Agent": "rezepte-check/1"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status, r.read().decode("utf-8", "replace")


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    url, stamp = sys.argv[1], sys.argv[2]
    timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 240
    t0 = time.time()
    body = None
    while time.time() - t0 < timeout:
        try:
            status, body = fetch(url + ("&" if "?" in url else "?") + "v=" + stamp)
            if status == 200 and stamp in body:
                break
        except Exception as e:  # noqa
            status = str(e)
        print("Warte auf Deploy … %ds (%s)" % (int(time.time() - t0), status))
        time.sleep(15)
    else:
        print("TIMEOUT: Seite noch nicht mit Stempel %s live." % stamp)
        return 1
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', body, re.S)
    if not m:
        print("FEHLER: kein JSON-LD auf der Live-Seite")
        return 1
    ld = json.loads(m.group(1))
    missing = [k for k in ("name", "recipeIngredient", "recipeInstructions") if not ld.get(k)]
    if missing:
        print("FEHLER: JSON-LD ohne", missing)
        return 1
    print("LIVE: %s – %s, %d Zutaten, %d Schritte, Bild: %s" % (
        url, ld["name"], len(ld["recipeIngredient"]), len(ld["recipeInstructions"]), "ja" if ld.get("image") else "nein"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
