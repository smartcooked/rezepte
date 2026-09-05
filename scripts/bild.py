#!/usr/bin/env python3
"""Rezeptbild aufbereiten: beliebiges Bild (JPG/PNG/HEIC/TIFF/PDF Seite 1) -> docs/<rdir>/<slug>/bild.jpg
max. 1600 px Kante, Qualität 80, alle Metadaten (EXIF/GPS) entfernt. Nutzt macOS sips, kein Pillow nötig.
Aufruf: python3 scripts/bild.py <datei-oder-url> <slug>   (schneidet zentriert auf 4:3)
"""
import json
import os
import struct
import subprocess
import sys
import tempfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def fetch(src):
    """http(s)-URL -> temporäre Datei; lokale Pfade unverändert."""
    if src.startswith("http://") or src.startswith("https://"):
        req = urllib.request.Request(src, headers={"User-Agent": "rezepte-bild/1"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        fd, tmp = tempfile.mkstemp(suffix=".img", dir=os.path.join(ROOT, "_inbox"))
        os.write(fd, data); os.close(fd)
        return tmp
    return src


def dims(path):
    out = subprocess.run(["/usr/bin/sips", "-g", "pixelWidth", "-g", "pixelHeight", path], capture_output=True, text=True).stdout
    d = [int(l.split(":")[-1]) for l in out.splitlines() if "pixel" in l]
    return d[0], d[1]


def convert(src, dst, max_px=1600, quality=80, ratio=(4, 3)):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    subprocess.run(["/usr/bin/sips", "-s", "format", "jpeg", "-s", "formatOptions", str(quality),
                    "-Z", str(max_px), src, "--out", dst], check=True, stdout=subprocess.DEVNULL)
    if ratio:
        w, h = dims(dst)
        target = ratio[0] / ratio[1]
        if abs(w / h - target) > 0.02:
            if w / h > target:
                cw, ch = int(h * target), h
            else:
                cw, ch = w, int(w / target)
            subprocess.run(["/usr/bin/sips", "-c", str(ch), str(cw), dst], check=True, stdout=subprocess.DEVNULL)


def strip_jpeg_metadata(path):
    """Entfernt APP1–APP15 (EXIF, XMP, ICC …) und COM-Segmente; behält APP0/JFIF."""
    with open(path, "rb") as f:
        data = f.read()
    assert data[:2] == b"\xff\xd8", "kein JPEG"
    out = bytearray(b"\xff\xd8")
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            out += data[i:]
            break
        marker = data[i + 1]
        if marker == 0xDA:  # Start of Scan: Rest unverändert
            out += data[i:]
            break
        seglen = struct.unpack(">H", data[i + 2:i + 4])[0]
        seg = data[i:i + 2 + seglen]
        if not (0xE1 <= marker <= 0xEF or marker == 0xFE):
            out += seg
        i += 2 + seglen
    with open(path, "wb") as f:
        f.write(out)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    src, slug = fetch(sys.argv[1]), sys.argv[2]
    with open(os.path.join(ROOT, "rezepte.config.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    dst = os.path.join(ROOT, "docs", cfg.get("recipe_dir", "rezepte"), slug, "bild.jpg")
    convert(src, dst)
    strip_jpeg_metadata(dst)
    w, h = dims(dst)
    print("%s: %d×%d px, %d KB" % (os.path.relpath(dst, ROOT), w, h, os.path.getsize(dst) // 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
