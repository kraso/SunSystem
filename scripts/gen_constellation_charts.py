"""Genera cartas de constelación (SVG) y ficha de objetos desde datos reales.

Lee:
  src/data/constellations.json  (líneas RA/Dec de la figura)
  src/data/stars.json           (catálogo Hipparcos, con 'con' = constelación)
  src/data/deep-sky.json        (objetos Messier)

Produce:
  assets/constellation-charts/<slug>.svg   carta vectorial de cada constelación
  src/data/constellation-info.json         { nombre: {slug, stars[], objects[]} }
"""
import json
import os
import re
import math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
DATA = os.path.join(ROOT, "src", "data")
OUT_DIR = os.path.join(ROOT, "assets", "constellation-charts")
os.makedirs(OUT_DIR, exist_ok=True)

conss = json.load(open(os.path.join(DATA, "constellations.json"), encoding="utf-8"))
stars = json.load(open(os.path.join(DATA, "stars.json"), encoding="utf-8"))
deep = json.load(open(os.path.join(DATA, "deep-sky.json"), encoding="utf-8"))


def slug(name: str) -> str:
    s = name.lower()
    s = s.replace("á", "a").replace("é", "e").replace("í", "i")
    s = s.replace("ó", "o").replace("ú", "u").replace("ñ", "n")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def ra_to_x(ra, ra_min, ra_max, w, pad):
    # RA crece hacia la IZQUIERDA (este a la izquierda, como en mapas celestes)
    if ra_max == ra_min:
        return w / 2
    return pad + (ra_max - ra) / (ra_max - ra_min) * (w - 2 * pad)


def dec_to_y(dec, dec_min, dec_max, h, pad):
    if dec_max == dec_min:
        return h / 2
    return pad + (dec - dec_min) / (dec_max - dec_min) * (h - 2 * pad)


def star_radius(mag):
    # estrellas más brillantes (mag menor) -> radio mayor
    r = 4.2 - mag * 0.55
    return max(1.0, min(6.5, r))


def type_color(t: str) -> str:
    t = (t or "").lower()
    if t in ("s", "s0", "e", "i", "irr", "sab", "sb", "sb0", "sba", "sbap", "sbapb", "sbcd"):
        return "#9fc4ff"  # galaxia (azulado)
    if t in ("neb", "snr", "hii", "rnes", "dark", "emneb"):
        return "#ff9b7a"  # nebulosa (rojizo)
    if t == "gc":
        return "#88ffcc"  # cúmulo globular (verde)
    if t == "oc":
        return "#d6ff8c"  # cúmulo abierto (verde amarillento)
    if t == "pn":
        return "#ff8ce0"  # nebulosa planetaria (magenta)
    return "#88ffcc"


info = {}

for c in conss:
    name = c["name"]
    lines = c["lines"]
    # Bounding box de todas las líneas
    ras, decs = [], []
    for ln in lines:
        for ra, dec in ln:
            ras.append(ra)
            decs.append(dec)
    if not ras:
        continue
    ra_min, ra_max = min(ras), max(ras)
    dec_min, dec_max = min(decs), max(decs)
    # margen del 12%
    ra_span = max(ra_max - ra_min, 1e-3)
    dec_span = max(dec_max - dec_min, 1e-3)
    ra_min -= ra_span * 0.12
    ra_max += ra_span * 0.12
    dec_min -= dec_span * 0.12
    dec_max += dec_span * 0.12
    ra_span = ra_max - ra_min
    dec_span = dec_max - dec_min

    W, H = 460, 460
    pad = 28

    # Estrellas de esta constelación (las que ya traen 'con' asignado)
    cstars = [s for s in stars if s.get("con") == name]
    # También las que caen dentro del bbox aunque no traigan con
    for s in stars:
        if s.get("con") == name:
            continue
        ra, dec = s["ra"], s["dec"]
        if ra_min <= ra <= ra_max and dec_min <= dec <= dec_max:
            cstars.append(s)
    # Dedupe por hip
    seen = set()
    uniq = []
    for s in cstars:
        if s["hip"] in seen:
            continue
        seen.add(s["hip"])
        uniq.append(s)
    cstars = uniq

    # Objetos Messier en el área
    cobjs = []
    for o in deep:
        ra, dec = o.get("ra"), o.get("dec")
        if ra is None or dec is None:
            continue
        if ra_min <= ra <= ra_max and dec_min <= dec <= dec_max:
            cobjs.append(o)

    # --- Construir SVG ---
    parts = []
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'font-family="Audiowide, Segoe UI, sans-serif">'
    )
    parts.append(f'<rect width="{W}" height="{H}" fill="#05060c"/>')
    # líneas de la figura
    for ln in lines:
        pts = []
        for ra, dec in ln:
            x = ra_to_x(ra, ra_min, ra_max, W, pad)
            y = dec_to_y(dec, dec_min, dec_max, H, pad)
            pts.append(f"{x:.1f},{y:.1f}")
        parts.append(f'<polyline points="{" ".join(pts)}" fill="none" '
                     f'stroke="#7fb0ff" stroke-width="1.3" stroke-opacity="0.85"/>')
    # estrellas
    for s in cstars:
        x = ra_to_x(s["ra"], ra_min, ra_max, W, pad)
        y = dec_to_y(s["dec"], dec_min, dec_max, H, pad)
        r = star_radius(s["mag"])
        bv = float(s["bv"]) if s.get("bv") else 0.0
        # color por temperatura (bv)
        if bv < 0:
            col = "#cfe0ff"
        elif bv < 0.5:
            col = "#ffffff"
        elif bv < 1.0:
            col = "#fff2cc"
        elif bv < 1.5:
            col = "#ffd699"
        else:
            col = "#ffb366"
        parts.append(f'<circle class="star" cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" '
                     f'fill="{col}" data-name="{s.get("name") or "HIP " + str(s["hip"])}" '
                     f'data-meta="mag {s["mag"]}"/>')
        if s.get("name"):
            parts.append(f'<text x="{x + r + 3:.1f}" y="{y + 3:.1f}" '
                         f'fill="#aebfe0" font-size="9">{s["name"]}</text>')

# objetos Messier
    for o in cobjs:
        x = ra_to_x(o["ra"], ra_min, ra_max, W, pad)
        y = dec_to_y(o["dec"], dec_min, dec_max, H, pad)
        label = o.get("name") or o.get("desig") or o.get("id")
        tname = o.get("typeName") or o.get("type") or ""
        col = type_color(o.get("type"))
        # mancha difusa (representa el objeto de cielo profundo)
        parts.append(f'<circle class="star" cx="{x:.1f}" cy="{y:.1f}" r="9" '
                     f'fill="{col}" fill-opacity="0.15" data-name="{label}" '
                     f'data-meta="{tname}"/>')
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.5" '
                     f'fill="{col}" fill-opacity="0.5"/>')
    parts.append('</svg>')
    svg = "\n".join(parts)

    slu = slug(name)
    with open(os.path.join(OUT_DIR, f"{slu}.svg"), "w", encoding="utf-8") as f:
        f.write(svg)

    # --- Info JSON ---
    star_info = []
    for s in sorted(cstars, key=lambda x: x["mag"])[:14]:
        star_info.append({
            "name": s.get("name") or f"HIP {s['hip']}",
            "mag": round(s["mag"], 2),
            "bv": float(s["bv"]) if s.get("bv") else None,
            "ra": round(s["ra"], 3),
            "dec": round(s["dec"], 3),
        })
    obj_info = []
    for o in cobjs:
        obj_info.append({
            "id": o.get("name") or o.get("desig") or o.get("id"),
            "ra": round(o["ra"], 3),
            "dec": round(o["dec"], 3),
        })
    info[name] = {
        "slug": slu,
        "stars": star_info,
        "objects": obj_info,
    }

# Lista global de objetos astronómicos (no constelaciones): los Messier.
# Se les asigna la constelación padre según el bounding box de la figura.
def constellation_of(ra, dec):
    for c in conss:
        ras, decs = [], []
        for ln in c["lines"]:
            for r, d in ln:
                ras.append(r)
                decs.append(d)
        if not ras:
            continue
        rmin, rmax = min(ras), max(ras)
        dmin, dmax = min(decs), max(decs)
        # tolerancia de 3 grados
        if (rmin - 3) <= ra <= (rmax + 3) and (dmin - 3) <= dec <= (dmax + 3):
            return c["name"]
    return None

objects_list = []
for o in deep:
    ra = o.get("ra")
    dec = o.get("dec")
    if ra is None or dec is None:
        continue
    objects_list.append({
        "id": o.get("name") or o.get("desig") or o.get("id"),
        "ngc": o.get("desig") or "",
        "common": o.get("alt") or "",
        "type": o.get("type") or "",
        "typeName": o.get("typeName") or "",
        "mag": o.get("mag"),
        "ra": round(ra, 3),
        "dec": round(dec, 3),
        "constellation": constellation_of(ra, dec),
    })
info["__objects__"] = objects_list

with open(os.path.join(DATA, "constellation-info.json"), "w", encoding="utf-8") as f:
    json.dump(info, f, ensure_ascii=False, indent=1)

print(f"Generadas {len(info)} cartas de constelación en {OUT_DIR}")
print(f"Info en src/data/constellation-info.json ({len(info)} entradas)")
