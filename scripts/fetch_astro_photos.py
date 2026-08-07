#!/usr/bin/env python3
"""Descarga las 4 mejores fotos reales de cada astro desde NASA Images API.

Las guarda en assets/photos/<name>-N.jpg para que el panel de estadísticas
las sirva localmente (sin depender de red/CORS en runtime).

Uso el endpoint de asset para obtener la imagen original (gran calidad),
no solo el thumbnail de 150px.
"""
import json
import os
import sys
import urllib.request
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "photos")
os.makedirs(OUT, exist_ok=True)

# Astros a descargar (name en inglés usado en celestial-bodies.json)
BODIES = [
    "Mercury", "Venus", "Earth", "Mars",
    "Jupiter", "Saturn", "Uranus", "Neptune",
    "Moon", "Io", "Europa", "Ganymede", "Callisto",
    "Titan", "Iapetus", "Rhea", "Dione", "Tethys",
    "Enceladus", "Mimas", "Triton",
]

# Queries mejoradas para fotos icónicas de alta calidad
QUERY = {
    "Mercury": "mercury planet nasa",
    "Venus": "venus planet nasa",
    "Earth": "earth blue marble nasa",
    "Mars": "mars planet nasa",
    "Jupiter": "jupiter planet cassini hubble",
    "Saturn": "saturn planet rings cassini",
    "Uranus": "uranus planet voyager",
    "Neptune": "neptune planet voyager",
    "Moon": "moon full lunar nasa",
    "Io": "io moon jupiter nasa",
    "Europa": "europa moon jupiter nasa",
    "Ganymede": "ganymede moon jupiter nasa",
    "Callisto": "callisto moon jupiter nasa",
    "Titan": "titan moon saturn cassini",
    "Iapetus": "iapetus moon saturn cassini",
    "Rhea": "rhea moon saturn cassini",
    "Dione": "dione moon saturn cassini",
    "Tethys": "tethys moon saturn cassini",
    "Enceladus": "enceladus moon saturn cassini",
    "Mimas": "mimas moon saturn cassini",
    "Triton": "triton moon neptune voyager",
}

PER_BODY = 4
TIMEOUT = 30


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.load(r)


def orig_url(nasa_id):
    """URL de la imagen original (~orig) servida por images-assets.nasa.gov.
    ~medium/~large dan 403; ~orig y ~thumb funcionan."""
    return f"https://images-assets.nasa.gov/image/{nasa_id}/{nasa_id}~orig.jpg"


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        data = r.read()
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


def main():
    for body in BODIES:
        q = QUERY.get(body, f"{body} planet nasa")
        print(f"== {body} (query: {q}) ==")
        try:
            search = get_json(
                f"https://images-api.nasa.gov/search?q={quote(q)}&media_type=image"
            )
            items = search["collection"]["items"]
        except Exception as e:
            print(f"  search error: {e}")
            continue

        saved = 0
        for it in items:
            if saved >= PER_BODY:
                break
            nasa_id = it["data"][0]["nasa_id"]
            try:
                url = orig_url(nasa_id)
                dest = os.path.join(OUT, f"{body}-{saved+1}.jpg")
                try:
                    size = download(url, dest)
                except Exception:
                    # fallback a thumbnail si ~orig falla
                    url = url.replace("~orig.jpg", "~thumb.jpg")
                    size = download(url, dest)
                print(f"  [{saved+1}] {nasa_id} -> {os.path.basename(dest)} ({size//1024} KB)")
                saved += 1
            except Exception as e:
                print(f"  skip {nasa_id}: {e}")
        print(f"  guardadas: {saved}")


if __name__ == "__main__":
    main()
