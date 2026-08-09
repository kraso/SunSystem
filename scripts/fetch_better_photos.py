#!/usr/bin/env python3
"""Descarga fotos de CAMPO ESTELAR REAL (no mapas históricos ni animales) para
las 18 constelaciones cuyas fotos actuales no sirven para el proyecto, y las
guarda en assets/constellation-photos-v2/ (banco reserva, NO subido a GitHub).
Ademas las copia a assets/constellation-photos/ (v1) para que el panel
'Referencia real' las muestre ya.

Fuentes: NASA Images API + Wikimedia Commons. Se filtran los resultados que
parezcan mapas/atlas (Urania's Mirror, Uranometria, Sidney Hall, "sky map",
"constellation chart") y los que no sean campo de estrellas.

Uso: python3 scripts/fetch_better_photos.py
"""
import json
import os
import re
import shutil
import socket
import sys
import time
import urllib.parse
import urllib.request
from io import BytesIO

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V1 = os.path.join(ROOT, "assets", "constellation-photos")
V2 = os.path.join(ROOT, "assets", "constellation-photos-v2")

# Las 18 constelaciones a mejorar: (id IAU, nombre ES)
TARGETS = [
    ("And", "Andrómeda"), ("CMi", "Can Menor"), ("UMi", "Osa Menor"),
    ("Aps", "Apus"), ("Cap", "Capricornio"), ("Cyg", "Cisne"),
    ("Del", "Delphinus"), ("Gem", "Géminis"), ("Hyi", "Hydrus"),
    ("Ind", "Indus"), ("LMi", "Leo Minor"), ("Men", "Mensa"),
    ("Mic", "Microscopium"), ("Oct", "Octans"), ("PsA", "Pez Austral"),
    ("Phe", "Phoenix"), ("Pic", "Pictor"), ("TrA", "Triángulo Austral"),
]

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
    "Tri": "Triangulum", "TrA": "Triangulo Australe", "Tuc": "Tucana",
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
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


# palabras que indican mapa/atlas historico (no sirven para el proyecto)
MAP_WORDS = (
    "map", "urania", "uranometria", "sidney hall", "mirror", "atlas",
    "celestial chart", "sky map", "constellation chart", "starmap",
    "star map", "engraving", "vintage", "antique", "old",
)


def is_map(title: str) -> bool:
    t = title.lower()
    return any(w in t for w in MAP_WORDS)


def _get(url: str, timeout: int = 35) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "SunSystem/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def nasa_search(en: str):
    out = []
    for q in (en + " Milky Way stars", en + " constellation wide field",
              en + " constellation astrophotography"):
        url = ("https://images-api.nasa.gov/search?q=" + urllib.parse.quote(q)
               + "&media_type=image")
        try:
            d = json.loads(_get(url).decode("utf-8", "replace"))
        except Exception:  # noqa: BLE001
            continue
        for it in d.get("collection", {}).get("items", []):
            data = it.get("data", [{}])[0]
            out.append((data.get("nasa_id", ""), data.get("title", "")))
    return out


def nasa_thumb(nasa_id: str):
    for s in ("~orig", "~thumb", ""):
        return f"https://images-assets.nasa.gov/image/{nasa_id}/{nasa_id}{s}.jpg"
    return ""


def commons_search(en: str):
    out = []
    for q in (en + " constellation astrophotography", en + " constellation stars",
              en + " Milky Way", en + " constellation wide field"):
        url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json"
               "&list=search&srnamespace=6&srlimit=8&srsearch="
               + urllib.parse.quote(q))
        try:
            d = json.loads(_get(url).decode("utf-8", "replace"))
        except Exception:  # noqa: BLE001
            continue
        for h in d.get("query", {}).get("search", []):
            if h["title"].startswith("File:"):
                out.append(h["title"])
    return out


def commons_thumb(title: str):
    url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json"
           "&titles=" + urllib.parse.quote(title)
           + "&prop=imageinfo&iiprop=url&iiurlwidth=1600")
    try:
        d = json.loads(_get(url).decode("utf-8", "replace"))
    except Exception:  # noqa: BLE001
        return None
    for p in d.get("query", {}).get("pages", {}).values():
        ii = p.get("imageinfo")
        if ii:
            return ii[0].get("thumburl") or ii[0].get("url")
    return None


def save_as_jpg(blob: bytes, dest: str) -> bool:
    try:
        from PIL import Image
    except Exception:  # noqa: BLE001
        with open(dest, "wb") as f:
            f.write(blob)
        return blob[:2] == b"\xff\xd8"
    if blob[:2] != b"\xff\xd8":
        try:
            Image.open(BytesIO(blob)).convert("RGB").save(dest, "JPEG", quality=90)
            return True
        except Exception:  # noqa: BLE001
            pass
    with open(dest, "wb") as f:
        f.write(blob)
    return blob[:2] == b"\xff\xd8"


def main() -> int:
    socket.setdefaulttimeout(40)
    os.makedirs(V1, exist_ok=True)
    os.makedirs(V2, exist_ok=True)
    done = 0
    for cid, name in TARGETS:
        en = IAU_EN.get(cid, name)
        slug = slugify(name)
        print(f"== {name} ({en}) slug={slug} ==", flush=True)
        picked = None
        # 1) NASA (filtrando mapas por titulo)
        for nasa_id, title in nasa_search(en):
            if not nasa_id or is_map(title):
                continue
            picked = ("nasa", nasa_id, title)
            break
        # 2) Commons (filtrando mapas)
        if not picked:
            for title in commons_search(en):
                if is_map(title):
                    continue
                picked = ("commons", title, title)
                break
        if not picked:
            print("    sin resultado util (solo mapas/animales?)")
            time.sleep(2)
            continue
        kind, ref, title = picked
        print(f"    {kind}: {title[:60]}")
        if kind == "nasa":
            blob = _get(nasa_thumb(ref))
        else:
            tu = commons_thumb(ref)
            if not tu:
                print("    sin thumburl")
                time.sleep(2)
                continue
            blob = _get(tu)
        v2dest = os.path.join(V2, slug + ".jpg")
        v1dest = os.path.join(V1, slug + ".jpg")
        if save_as_jpg(blob, v2dest):
            shutil.copyfile(v2dest, v1dest)  # activar en el panel
            print(f"    OK -> v2/{slug}.jpg y copiado a v1 ({os.path.getsize(v2dest)} bytes)")
            done += 1
        else:
            print("    no valido")
        time.sleep(3)  # respetar rate limit
    print(f"\nDone. mejoradas={done}/{len(TARGETS)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
