#!/usr/bin/env python3
"""Descarga fotos REALES de cada constelación desde NASA Images API (institución
oficial, con API por query). Las guarda en assets/constellation-photos/<slug>.jpg
usando el mismo slug que genera gen_constellation_charts.py, para que el panel
'Referencia real' las muestre al lado del recuadro editable.

Las fuentes de divulgación citadas por el usuario (IAC, Naukas, astroandalucia,
Shutterstock, etc.) no exponen API de descarga por constelación (y Shutterstock es
de pago), así que se usa NASA Images API como fuente institucional oficial.
Si una constelación no tiene foto en NASA, el panel de referencia cae al mapa del
catálogo (SVG con estrellas en posición/color/magnitud reales).

Uso: python3 scripts/fetch_constellation_photos.py
"""
import json
import os
import re
import socket
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONS_PATH = os.path.join(ROOT, "src", "data", "constellations.json")
OUT_DIR = os.path.join(ROOT, "assets", "constellation-photos")

# id IAU de constellations.json -> nombre en inglés (estándar de las 88)
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

_UNACCENT = {
    "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n",
    "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ñ": "N",
    "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
}


def slugify(name: str) -> str:
    s = "".join(_UNACCENT.get(ch, ch) for ch in name)
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s


def http_get(url: str, timeout: int = 25) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "SunSystem/1.0 (educational constellation photos)"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def search_nasa_id(query: str):
    url = (
        "https://images-api.nasa.gov/search?q="
        + urllib.parse.quote(query)
        + "&media_type=image"
    )
    try:
        data = json.loads(http_get(url).decode("utf-8", "replace"))
    except Exception as e:  # noqa: BLE001
        print(f"    search fail: {e}")
        return None
    items = data.get("collection", {}).get("items", [])
    for it in items:
        nasa_id = it.get("data", [{}])[0].get("nasa_id")
        if nasa_id:
            return nasa_id
    return None


def download_asset(nasa_id: str, dest: str) -> bool:
    for suffix in ("~orig", "~thumb", ""):
        url = f"https://images-assets.nasa.gov/image/{nasa_id}/{nasa_id}{suffix}.jpg"
        try:
            blob = http_get(url)
        except Exception:  # noqa: BLE001
            continue
        if blob[:2] == b"\xff\xd8" or blob[:4] == b"\x89PNG":
            with open(dest, "wb") as f:
                f.write(blob)
            return True
    return False


def main() -> int:
    socket.setdefaulttimeout(30)
    os.makedirs(OUT_DIR, exist_ok=True)
    conss = json.load(open(CONS_PATH, encoding="utf-8"))
    ok = 0
    skip = 0
    for c in conss:
        cid = c.get("id", "")
        name = c.get("name", "")
        slug = slugify(name)
        dest = os.path.join(OUT_DIR, slug + ".jpg")
        if os.path.exists(dest) and os.path.getsize(dest) > 2000:
            skip += 1
            continue
        en = IAU_EN.get(cid, name)
        query = en + " constellation"
        print(f"== {name} ({en}) slug={slug} ==", flush=True)
        nasa_id = search_nasa_id(query)
        if not nasa_id:
            # segundo intento: solo el nombre en inglés
            nasa_id = search_nasa_id(en)
        if not nasa_id:
            print("    no results")
            continue
        if download_asset(nasa_id, dest):
            print(f"    OK {nasa_id} -> {slug}.jpg")
            ok += 1
        else:
            print(f"    download failed for {nasa_id}")
    print(f"\nDone. downloaded={ok} skipped_existing={skip}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
