"""Genera cartas de constelación (SVG) y ficha de objetos desde datos reales.

Lee:
  src/data/constellations.json  (líneas RA/Dec de la figura)
  src/data/stars.json           (catálogo Hipparcos)
  src/data/deep-sky.json        (objetos Messier)

Produce:
  assets/constellation-charts/<slug>.svg   carta vectorial de cada constelación
  src/data/constellation-info.json         { nombre: {slug, stars[], objects[]} }
"""

import json
import os
import re

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
    # RA crece hacia la IZQUIERDA (este a la izquierda, como en mapas celestes).
    # Normaliza la RA al mismo sistema que el recuadro (enrollado a [0,360)) para
    # que los puntos con RA negativa no se dibujen fuera del canvas.
    if ra < 0:
        ra += 360.0
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


def fig_bbox(lines):
    """Devuelve (ra_min, ra_max, dec_min, dec_max) de la figura, con RA enrollada
    a [0,360) para que constelaciones que cruzan el meridiano 180° (p.ej. Osa
    Mayor, RA -176..+178) no produzcan un recuadro de 354° de ancho."""
    ras, decs = [], []
    for ln in lines:
        for ra, dec in ln:
            if ra < 0:
                ra += 360.0
            ras.append(ra)
            decs.append(dec)
    if not ras:
        return None
    return min(ras), max(ras), min(decs), max(decs)


def constellation_of(s, conss):
    """Devuelve la constelación real de una estrella: usa el campo 'con' si
    existe, si no lo deduce por el recuadro de la figura (RA enrollada)."""
    con = s.get("con")
    if con:
        return con
    ra = s["ra"]
    if ra < 0:
        ra += 360.0
    for c in conss:
        bb = fig_bbox(c["lines"])
        if not bb:
            continue
        rmin, rmax, dmin, dmax = bb
        if rmin <= ra <= rmax and dmin <= s["dec"] <= dmax:
            return c["name"]
    return None


def obj_constellation(o, conss):
    """Constelación real de un objeto Messier: la primera cuya figura (recuadro
    RA enrollada) lo contiene. Devuelve None si no cae en ninguna."""
    ra = o.get("ra")
    dec = o.get("dec")
    if ra is None or dec is None:
        return None
    if ra < 0:
        ra += 360.0
    for c in conss:
        bb = fig_bbox(c["lines"])
        if not bb:
            continue
        rmin, rmax, dmin, dmax = bb
        if rmin <= ra <= rmax and dmin <= dec <= dmax:
            return c["name"]
    return None


info = {}

# Mapa objeto Messier -> constelación real (para filtrar las cartas).
obj_const = {}
for _o in deep:
    _id = _o.get("name") or _o.get("desig") or _o.get("id")
    obj_const[_id] = obj_constellation(_o, conss)

for c in conss:
    name = c["name"]
    lines = c["lines"]

    # Solo las estrellas que realmente pertenecen a esta constelación.
    cstars = [s for s in stars if constellation_of(s, conss) == name and s["mag"] <= 5.5]

    # Recuadro del SVG: figura + estrellas reales de la constelación (RA enrollada).
    ras, decs = [], []
    for ln in lines:
        for ra, dec in ln:
            ras.append(ra + 360.0 if ra < 0 else ra)
            decs.append(dec)
    for s in cstars:
        ras.append(s["ra"] + 360.0 if s["ra"] < 0 else s["ra"])
        decs.append(s["dec"])
    if not ras:
        continue
    ra_min, ra_max, dec_min, dec_max = min(ras), max(ras), min(decs), max(decs)
    # margen del 14%
    ra_span = max(ra_max - ra_min, 1e-3)
    ra_min -= ra_span * 0.14
    ra_max += ra_span * 0.14
    dec_min -= (dec_max - dec_min) * 0.14 if (dec_max - dec_min) > 0 else 1.0
    dec_max += (dec_max - dec_min) * 0.14 if (dec_max - dec_min) > 0 else 1.0
    ra_span = ra_max - ra_min
    dec_span = dec_max - dec_min

    W, H = 460, 460
    pad = 28

    # Objetos Messier que realmente pertenecen a esta constelación.
    cobjs = [o for o in deep
             if (o.get("name") or o.get("desig") or o.get("id")) in obj_const
             and obj_const.get(o.get("name") or o.get("desig") or o.get("id")) == name]

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
    # estrellas (solo las que pertenecen a esta constelación)
    for s in cstars:
        x = ra_to_x(s["ra"], ra_min, ra_max, W, pad)
        y = dec_to_y(s["dec"], dec_min, dec_max, H, pad)
        r = star_radius(s["mag"])
        bv = float(s["bv"]) if s.get("bv") else 0.0
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

    # objetos Messier (mancha difusa por tipo)
    for o in cobjs:
        x = ra_to_x(o["ra"], ra_min, ra_max, W, pad)
        y = dec_to_y(o["dec"], dec_min, dec_max, H, pad)
        label = o.get("name") or o.get("desig") or o.get("id")
        tname = o.get("typeName") or o.get("type") or ""
        col = type_color(o.get("type"))
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
    for s in cstars:
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

# Lista global de objetos astronómicos (no constelaciones): los Messier,
# con la constelación padre según el recuadro de la figura (RA enrollada).
objects_list = []
for o in deep:
    ra = o.get("ra")
    dec = o.get("dec")
    if ra is None or dec is None:
        continue
    constellation = None
    ora = ra + 360.0 if ra < 0 else ra
    for c in conss:
        bb = fig_bbox(c["lines"])
        if not bb:
            continue
        rmin, rmax, dmin, dmax = bb
        if rmin <= ora <= rmax and dmin <= dec <= dmax:
            constellation = c["name"]
            break
    objects_list.append({
        "id": o.get("name") or o.get("desig") or o.get("id"),
        "ngc": o.get("desig") or "",
        "common": o.get("alt") or "",
        "type": o.get("type") or "",
        "typeName": o.get("typeName") or "",
        "mag": o.get("mag"),
        "ra": round(ra, 3),
        "dec": round(dec, 3),
        "constellation": constellation,
    })
info["__objects__"] = objects_list

with open(os.path.join(DATA, "constellation-info.json"), "w", encoding="utf-8") as f:
    json.dump(info, f, ensure_ascii=False, indent=1)

print(f"Generadas {len(info)} cartas de constelación en {OUT_DIR}")
print(f"Info en src/data/constellation-info.json ({len(info)} entradas)")
