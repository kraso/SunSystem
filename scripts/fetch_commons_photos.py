#!/usr/bin/env python3
"""Descarga fotos de las constelaciones que NASA no cubrió, usando
Wikimedia Commons (dominio público) como fuente alternativa. Guarda en
assets/constellation-photos/<slug>.jpg con el mismo slug que el chart-generator,
así el panel 'Referencia real' las muestra y se evita el fallback al SVG del
catálogo.

Para cada constelación faltante prueba varias queries en Commons (namespace File),
prefiere imágenes raster (jpg/png) sobre mapas SVG line-art, y convierte a JPG
con Pillow. Si Commons no tiene nada, deja la constelación sin foto (el panel
caerá al SVG del catálogo solo en ese caso).

Uso: python3 scripts/fetch_commons_photos.py
"""
import json
import os
import re
import socket
import sys
import urllib.parse
import urllib.request
from io import BytesIO

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONS_PATH = os.path.join(ROOT, "src", "data", "constellations.json")
OUT_DIR = os.path.join(ROOT, "assets", "constellation-photos")

_UNACCENT = {
    "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n",
    "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ñ": "N",
    "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
}

# id IAU -> nombre en inglés (mismo mapa que fetch_constellation_photos.py)
IAU_EN = {
    "And": "Andromeda", "Ant": "Antlia", "Aps": "Apus", "Aqr": "Aquarius",
    "Aql": "Aquila", "Ara": "Ara", "Ari": "Aries", "Aur": "Auriga",
    "Boo": "Boötes", "Cae": "Caelum", "Cam": "Camelopardalis", "Cnc": "Cancer",
    "CVn": "Canes Venatici", "CMa": "Canis Major", "CMi": "Canis Minor",
    "Cap": "Capricornus", "Car": "Carina", "Cas": "Cassiopeia",
    "Cen": "Centaurus", "Cep": "Cepheus", "Cet": "Cetus", "Cha": "Chamaeleon",
    "Cir": "Circinus", "Col": "Columba", "Com": "Coma Berenices",
    "CrA": "Corona Australis", "CrB": "Corona Borealis", "Crv": "Corvus",
    "Crt": "Crater", "Cru": "Crux", "Cyg": "Cygnus", "Del": "Delphinus",
    "Dor": "Dorado", "Dra": "Draco", "Equ": "Equuleus", "Eri": "Eridanus",
    "For": "Fornax", "Gem": "Gemini", "Gru": "Grus", "Her": "Hercules",
    "Hor": "Horologium", "Hya": "Hydra", "Hyi": "Hydrus", "Ind": "Indus",
    "Lac": "Lacerta", "Leo": "Leo", "LMi": "Leo Minor", "Lep": "Lepus",
    "Lib": "Libra", "Lup": "Lupus", "Lyn": "Lynx", "Lyr": "Lyra",
    "Men": "Mensa", "Mic": "Microscopium", "Mon": "Monoceros", "Mus": "Musca",
    "Nor": "Norma", "Oct": "Octans", "Oph": "Ophiuchus", "Ori": "Orion",
    "Pav": "Pavo", "Peg": "Pegasus", "Per": "Perseus", "Phe": "Phoenix",
    "Pic": "Pictor", "Psc": "Pisces", "PsA": "Piscis Austrinus", "Pup": "Puppis",
    "Pyx": "Pyxis", "Ret": "Reticulum", "Sge": "Sagitta", "Sgr": "Sagittarius",
    "Sco": "Scorpius", "Scl": "Sculptor", "Sct": "Scutum", "Ser": "Serpens",
    "Sex": "Sextans", "Tau": "Taurus", "Tel": "Telescopium",
    "Tri": "Triangulum", "TrA": "Triangulum Australe", "Tuc": "Tucana",
    "UMa": "Ursa Major", "UMi": "Ursa Minor", "Vel": "Vela", "Vir": "Virgo",
    "Vol": "Volans", "Vul": "Vulpecula",
}


def slugify(name: str) -> str:
    s = "".join(_UNACCENT.get(ch, ch) for ch in name)
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def _get(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "SunSystem/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def commons_search(q: str):
    url = (
        "https://commons.wikimedia.org/w/api.php?action=query&format=json"
        "&list=search&srnamespace=6&srlimit=10&srsearch=" + urllib.parse.quote(q)
    )
    try:
        d = json.loads(_get(url).decode("utf-8", "replace"))
    except Exception as e:  # noqa: BLE001
        print(f"    search fail: {e}")
        return []
    return [h["title"] for h in d.get("query", {}).get("search", [])
            if h["title"].startswith("File:")]


def commons_thumburl(title: str):
    url = (
        "https://commons.wikimedia.org/w/api.php?action=query&format=json"
        "&titles=" + urllib.parse.quote(title)
        + "&prop=imageinfo&iiprop=url&iiurlwidth=1600"
    )
    try:
        d = json.loads(_get(url).decode("utf-8", "replace"))
    except Exception:  # noqa: BLE001
        return None
    for p in d.get("query", {}).get("pages", {}).values():
        ii = p.get("imageinfo")
        if ii:
            return ii[0].get("thumburl") or ii[0].get("url")
    return None


def alt_queries(cid: str, name: str, en: str):
    q = [
        en + " constellation",
        en,
        name + " constelación",
        en + " constellation map",
        en + " CC",
        cid.upper(),
    ]
    seen = set()
    out = []
    for x in q:
        if x.lower() not in seen:
            seen.add(x.lower())
            out.append(x)
    return out


def save_as_jpg(blob: bytes, dest: str) -> bool:
    try:
        from PIL import Image
        have_pil = True
    except Exception:  # noqa: BLE001
        have_pil = False
    if have_pil and blob[:2] != b"\xff\xd8":  # no es JPEG crudo
        try:
            im = Image.open(BytesIO(blob)).convert("RGB")
            im.save(dest, "JPEG", quality=90)
            return True
        except Exception:  # noqa: BLE001
            pass
    # guardar tal cual (funciona si es JPEG; el navegador deduce por contenido)
    with open(dest, "wb") as f:
        f.write(blob)
    return blob[:2] == b"\xff\xd8"


def main() -> int:
    import time
    socket.setdefaulttimeout(40)
    os.makedirs(OUT_DIR, exist_ok=True)
    conss = json.load(open(CONS_PATH, encoding="utf-8"))
    ok = 0
    for c in conss:
        cid = c.get("id", "")
        name = c.get("name", "")
        slug = slugify(name)
        dest = os.path.join(OUT_DIR, slug + ".jpg")
        if os.path.exists(dest) and os.path.getsize(dest) > 2000:
            continue  # ya tiene foto (de NASA u otra pasada)
        en = IAU_EN.get(cid, name)
        print(f"== {name} ({en}) slug={slug} ==", flush=True)
        title = None
        for q in alt_queries(cid, name, en):
            hits = commons_search(q)
            if not hits:
                continue
            # preferir raster (no .svg) si hay alternativa
            raster = [t for t in hits if not t.lower().endswith(".svg")]
            title = (raster or hits)[0]
            print(f"    query OK: {q} -> {title}")
            break
        if not title:
            print("    no results en Commons")
            time.sleep(3)
            continue
        tu = commons_thumburl(title)
        if not tu:
            print("    sin thumburl")
            time.sleep(3)
            continue
        try:
            blob = _get(tu)
        except Exception as e:  # noqa: BLE001
            print(f"    download fail: {e}")
            time.sleep(5)
            continue
        if save_as_jpg(blob, dest):
            print(f"    OK -> {slug}.jpg ({os.path.getsize(dest)} bytes)")
            ok += 1
        else:
            print("    guardado pero no es JPEG válido")
        time.sleep(3)  # respetar rate limit de Commons


if __name__ == "__main__":
    sys.exit(main())
