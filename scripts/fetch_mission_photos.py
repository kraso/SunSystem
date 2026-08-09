#!/usr/bin/env python3
"""Descarga una imagen propia de cada mision (nave, tripulacion o destino) desde
Wikimedia Commons y la guarda en assets/mission-photos/<id>.jpg. Anade el campo
'image' a cada mision en src/data/missions.json.

Las fotos de misiones son directas (no mapas), pero se filtra para evitar logos,
diagramas SVG y banderas. Usa el thumburl de Commons (JPG) y convierte PNG->JPG
con Pillow. Reintenta ante HTTP 429 (rate limit) con backoff.

Uso: python3 scripts/fetch_mission_photos.py
"""
import json
import os
import socket
import sys
import time
import urllib.parse
import urllib.request

try:
    from PIL import Image
    from io import BytesIO
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MISSIONS_PATH = os.path.join(ROOT, "src", "data", "missions.json")
OUT_DIR = os.path.join(ROOT, "assets", "mission-photos")

QUERY = {
    "sputnik-1": "Sputnik 1 replica",
    "vostok-1": "Yuri Gagarin Vostok",
    "mercury-redstone-3": "Freedom 7 Mercury capsule",
    "voskhod-2": "Alexei Leonov spacewalk",
    "apollo-11": "Apollo 11",
    "apollo-13": "Apollo 13",
    "salyut-1": "Salyut 1 station",
    "skylab": "Skylab station",
    "apollo-soyuz": "Apollo Soyuz docking",
    "viking-1": "Viking 1 lander",
    "voyager-1": "Voyager 1 spacecraft",
    "voyager-2": "Voyager 2 spacecraft",
    "sts-1": "STS-1 Columbia",
    "mir": "Mir space station",
    "sts-51l-challenger": "Space Shuttle Challenger",
    "hst-sts-31": "Hubble Space Telescope",
    "iss-zarya": "International Space Station",
    "mars-climate-orbiter": "Mars Climate Orbiter",
    "cassini-huygens": "Cassini spacecraft",
    "sts-107-columbia": "Space Shuttle Columbia",
    "mer-spirit-opportunity": "Opportunity rover Mars",
    "beagle-2": "Beagle 2 Mars",
    "rosetta": "Rosetta spacecraft Philae",
    "curiosity-msl": "Curiosity rover",
    "orbital-sci-cygnus": "Antares rocket launch",
    "perseverance": "Perseverance rover",
    "artemis-1-orion": "Artemis 1 Orion",
    "starship-ift-1": "SpaceX Starship IFT-1",
    "lucy": "Lucy spacecraft",
}

BAD = ("logo", "svg", "diagram", "flag of", "coat of arms", "icon")


def get_with_retry(url, binary=False, max_retries=4):
    last = None
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SunSystem/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read() if binary else json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 429:
                wait = 20 * (attempt + 1)
                print(f"    429, esperando {wait}s...", flush=True)
                time.sleep(wait)
                continue
            raise
    raise last if last else RuntimeError("sin respuesta")


def commons_search(q):
    url = (
        "https://commons.wikimedia.org/w/api.php?action=query&format=json"
        "&list=search&srnamespace=6&srlimit=12&srsearch=" + urllib.parse.quote(q)
    )
    data = get_with_retry(url)
    return [h["title"] for h in data.get("query", {}).get("search", [])]


def commons_imageinfo(titles):
    params = {
        "action": "query", "format": "json", "titles": "|".join(titles),
        "prop": "imageinfo", "iiprop": "mime|url", "iiurlwidth": "1280",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    data = get_with_retry(url)
    pages = data.get("query", {}).get("pages", {})
    for p in pages.values():
        ii = p.get("imageinfo")
        if not ii:
            continue
        info = ii[0]
        mime = info.get("mime", "")
        if mime not in ("image/jpeg", "image/png"):
            continue
        title = p.get("title", "").lower()
        if any(b in title for b in BAD):
            continue
        return info.get("thumburl") or info.get("url")
    return None


def download(url):
    blob = get_with_retry(url, binary=True)
    if blob[:2] == b"\xff\xd8":
        return blob
    if blob[:8] == b"\x89PNG\r\n\x1a\n" and HAS_PIL:
        im = Image.open(BytesIO(blob)).convert("RGB")
        out = BytesIO()
        im.save(out, "JPEG", quality=88)
        return out.getvalue()
    return blob


def main() -> int:
    socket.setdefaulttimeout(60)
    os.makedirs(OUT_DIR, exist_ok=True)
    missions = json.load(open(MISSIONS_PATH, encoding="utf-8"))
    done = 0
    for m in missions:
        mid = m["id"]
        # Saltar las ya descargadas
        if m.get("image") and os.path.exists(os.path.join(OUT_DIR, m["image"])):
            print(f"== {m['name']} ya tiene foto, skip ==", flush=True)
            continue
        q = QUERY.get(mid, m["name"])
        print(f"== {m['name']} (q='{q}') ==", flush=True)
        try:
            titles = commons_search(q)
        except Exception as e:  # noqa: BLE001
            print(f"    search FAIL {e}")
            time.sleep(5)
            continue
        if not titles:
            print("    sin resultados")
            time.sleep(3)
            continue
        url = commons_imageinfo(titles)
        if not url:
            print("    sin imagen valida (logos/svg?)")
            time.sleep(3)
            continue
        try:
            blob = download(url)
        except Exception as e:  # noqa: BLE001
            print(f"    download FAIL {e}")
            time.sleep(5)
            continue
        if not blob or blob[:2] != b"\xff\xd8":
            print("    no es JPEG valido")
            time.sleep(3)
            continue
        path = os.path.join(OUT_DIR, mid + ".jpg")
        open(path, "wb").write(blob)
        m["image"] = mid + ".jpg"
        print(f"    OK {os.path.getsize(path)} bytes")
        done += 1
        time.sleep(3)
    json.dump(missions, open(MISSIONS_PATH, "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print(f"\nDone. fotos nuevas esta pasada={done}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
