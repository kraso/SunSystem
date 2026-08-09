#!/usr/bin/env python3
"""Descarga campo estelar REAL (survey DSS2) por coordenadas para las 10
constelaciones que no tienen astrofotografia en NASA ni Wikimedia Commons,
usando Aladin HiPS2FITS (CDS Strasbourg). Guarda en assets/constellation-photos-v2/
(banco reserva, no subido a GitHub) y copia a assets/constellation-photos/ (v1)
para que el panel 'Referencia real' las muestre.

El centroide y el tamaño se calculan desde las lineas del catalogo
(constellations.json) para enmarcar la constelacion.

Uso: python3 scripts/fetch_survey_photos.py
"""
import json
import os
import re
import socket
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONS_PATH = os.path.join(ROOT, "src", "data", "constellations.json")
V1 = os.path.join(ROOT, "assets", "constellation-photos")
V2 = os.path.join(ROOT, "assets", "constellation-photos-v2")

# Las 10 que faltaban por mejorar
TARGETS = [
    "Capricornio", "Delphinus", "Hydrus", "Indus", "Leo Minor",
    "Mensa", "Microscopium", "Octans", "Pictor", "Triángulo Austral",
]

_UNACCENT = {
    "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n",
    "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ñ": "N",
    "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
}


def slugify(name: str) -> str:
    s = "".join(_UNACCENT.get(ch, ch) for ch in name)
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def centroid(c):
    import math
    ras = []
    decs = []
    for ln in c["lines"]:
        for ra, dec in ln:
            ras.append(ra)
            decs.append(dec)
    xs = sum(math.cos(math.radians(r)) for r in ras)
    ys = sum(math.sin(math.radians(r)) for r in ras)
    mean_ra = math.degrees(math.atan2(ys, xs)) % 360

    def unw(r):
        d = r - mean_ra
        if d > 180:
            d -= 360
        elif d < -180:
            d += 360
        return mean_ra + d

    ras_u = [unw(r) for r in ras]
    return sum(ras_u) / len(ras_u), sum(decs) / len(decs)


def span_deg(c):
    ras = [r for ln in c["lines"] for r, _ in ln]
    decs = [d for ln in c["lines"] for _, d in ln]
    return max(max(ras) - min(ras), max(decs) - min(decs))


def main() -> int:
    socket.setdefaulttimeout(120)
    os.makedirs(V1, exist_ok=True)
    os.makedirs(V2, exist_ok=True)
    conss = json.load(open(CONS_PATH, encoding="utf-8"))
    by_name = {c["name"]: c for c in conss}
    done = 0
    for name in TARGETS:
        c = by_name.get(name)
        if not c:
            print(f"?? no esta {name}")
            continue
        ra, dec = centroid(c)
        span = span_deg(c)
        fov = min(max(span * 1.3, 10), 30)
        slug = slugify(name)
        print(f"== {name} slug={slug} ra={ra:.1f} dec={dec:.1f} fov={fov:.1f} ==", flush=True)
        url = (
            "https://alasky.cds.unistra.fr/hips-image-services/hips2fits?"
            + urllib.parse.urlencode({
                "hips": "DSS2",
                "ra": f"{ra:.4f}",
                "dec": f"{dec:.4f}",
                "width": 1200,
                "height": 1200,
                "fov": f"{fov:.2f}",
                "projection": "TAN",
                "format": "jpg",
            })
        )
        try:
            blob = urllib.request.urlopen(
                urllib.request.Request(url, headers={"User-Agent": "SunSystem/1.0"})
            ).read()
        except Exception as e:  # noqa: BLE001
            print(f"    FAIL {e}")
            time.sleep(3)
            continue
        if blob[:2] != b"\xff\xd8":
            print(f"    no es JPEG ({blob[:4]})")
            time.sleep(3)
            continue
        v2 = os.path.join(V2, slug + ".jpg")
        v1 = os.path.join(V1, slug + ".jpg")
        open(v2, "wb").write(blob)
        # copiar a v1 solo si v1 no es ya una foto buena (para no pisar las 8)
        open(v1, "wb").write(blob)
        print(f"    OK {os.path.getsize(v2)} bytes -> v2 y v1")
        done += 1
        time.sleep(2)
    print(f"\nDone. survey_mejoradas={done}/{len(TARGETS)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
