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


def ra_to_x(ra, ra_min, ra_max, scale, w, pad):
    # RA crece hacia la IZQUIERDA (este a la izquierda, como en mapas celestes).
    # Desenrolla la RA respecto al centroide del recuadro (diferencia angular en
    # [-180,180)) para que constelaciones que cruzan 180° se mapeen sin saltos.
    # Usa 'scale' (grados por eje) comun con dec_to_y para no deformar.
    cx = (ra_min + ra_max) / 2
    d = ra - cx
    if d > 180.0:
        ra -= 360.0
    elif d < -180.0:
        ra += 360.0
    inner = w - 2 * pad
    return w / 2 - (cx - ra) / scale * inner


def dec_to_y(dec, dec_min, dec_max, scale, h, pad):
    # Dec alta = ARRIBA (norte arriba), como en mapas celestes reales.
    # Usa 'scale' comun con ra_to_x para no deformar la figura.
    inner = h - 2 * pad
    cy = (dec_min + dec_max) / 2
    return h / 2 - (dec - cy) / scale * inner


def star_radius(mag):
    # estrellas más brillantes (mag menor) -> radio mayor
    r = 7.0 - mag * 0.6
    return max(2.2, min(11.0, r))


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
    """Devuelve (ra_min, ra_max, dec_min, dec_max) de la figura, con RA desenrollada
    circularmente respecto a su centroide (diferencia angular en [-180,180)). Así
    constelaciones que cruzan el meridiano 180° (p.ej. Osa Menor, RA 38 y 263) no
    producen un recuadro de 225° de ancho ni estiran a Polaris al otro extremo."""
    ras, decs = [], []
    for ln in lines:
        for ra, dec in ln:
            ras.append(ra)
            decs.append(dec)
    if not ras:
        return None
    # centroide RA circular
    import math
    xs = sum(math.cos(math.radians(r)) for r in ras)
    ys = sum(math.sin(math.radians(r)) for r in ras)
    mean_ra = math.degrees(math.atan2(ys, xs)) % 360.0

    def unwrap(r):
        d = r - mean_ra
        if d > 180.0:
            d -= 360.0
        elif d < -180.0:
            d += 360.0
        return mean_ra + d

    ras_u = [unwrap(r) for r in ras]
    return min(ras_u), max(ras_u), min(decs), max(decs)


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

# Para algunas constelaciones el catálogo dibuja la figura completa (incluidas
# patas muy largas) y el asterismo principal es más reconocible. En esos casos
# dibujamos solo las líneas indicadas (índices sobre c["lines"]).
ASTERISM_LINES = {
    "Osa Mayor": [0],  # el Carro (Big Dipper), línea 0 = las 7 estrellas del cazo
}

for c in conss:
    name = c["name"]
    lines = c["lines"]

    # Líneas a dibujar: todas salvo override de asterismo principal.
    draw_idx = ASTERISM_LINES.get(name)
    draw_lines = [lines[i] for i in draw_idx] if draw_idx else lines

    # Solo las estrellas que realmente pertenecen a esta constelación.
    cstars = [s for s in stars if constellation_of(s, conss) == name and s["mag"] <= 5.5]

    # Recuadro del SVG: las líneas que se dibujan (el asterismo principal),
    # para que ocupe casi todo el lienzo y quede centrado.
    bb = fig_bbox(draw_lines)
    if not bb:
        continue
    ra_min, ra_max, dec_min, dec_max = bb
    # margen pequeño: la figura ocupa casi todo el lienzo (carta expansiva)
    ra_span = max(ra_max - ra_min, 1e-3)
    dec_span = max(dec_max - dec_min, 1e-3)
    ra_min -= ra_span * 0.04
    ra_max += ra_span * 0.04
    dec_min -= dec_span * 0.04
    dec_max += dec_span * 0.04
    ra_span = ra_max - ra_min
    dec_span = dec_max - dec_min

    # Lienzo con el ASPECTO REAL de la constelacion: ancho/alto = RA/Dec.
    # Misma escala (scale) en ambos ejes -> no se deforma ni se aplasta.
    # Base más ancha para más resolución y marcadores grandes.
    scale = max(ra_span, dec_span)
    W = 760
    H = max(280, int(round(W * dec_span / ra_span)))
    pad = min(34, int(H * 0.12))

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

    # estrellas del asterismo (vértices de las líneas dibujadas) siempre visibles,
    # resueltas a estrellas reales de stars.json por cercanía. Así el asterismo
    # principal se dibuja completo aunque el catálogo asigne esas estrellas a
    # otra constelación por solapamiento de recuadros (p.ej. Dragón envuelve al Carro).
    def nearest_star(ra, dec):
        rra = ra + 360.0 if ra < 0 else ra
        best = None
        best_d = 1.2  # grados
        for s in stars:
            sra = s["ra"] + 360.0 if s["ra"] < 0 else s["ra"]
            d = ((sra - rra) ** 2 + (s["dec"] - dec) ** 2) ** 0.5
            if d < best_d:
                best_d = d
                best = s
        return best

    # líneas de la figura (asterismo seleccionado)
    for ln in draw_lines:
        seq = []
        pts = []
        for ra, dec in ln:
            x = ra_to_x(ra, ra_min, ra_max, scale, W, pad)
            y = dec_to_y(dec, dec_min, dec_max, scale, H, pad)
            s = nearest_star(ra, dec)
            vid = s["hip"] if s and s.get("hip") is not None else f"v{len(seq)}"
            seq.append(str(vid))
            pts.append(f"{x:.1f},{y:.1f}")
        parts.append(f'<polyline class="fig-line" points="{" ".join(pts)}" fill="none" '
                     f'stroke="#a6ccff" stroke-width="2.4" stroke-opacity="0.95" '
                     f'stroke-linejoin="round" data-seq="{",".join(seq)}"/>')

    asterism = []
    seen_hip = set()
    for ln in draw_lines:
        for ra, dec in ln:
            s = nearest_star(ra, dec)
            if s and s.get("hip") not in seen_hip:
                seen_hip.add(s.get("hip"))
                asterism.append(s)

    # estrellas (las del asterismo siempre + las que pertenecen a la constelación)
    drawn_hip = set()
    for s in asterism + cstars:
        if s.get("hip") in drawn_hip:
            continue
        drawn_hip.add(s.get("hip"))
        x = ra_to_x(s["ra"], ra_min, ra_max, scale, W, pad)
        y = dec_to_y(s["dec"], dec_min, dec_max, scale, H, pad)
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
        vid = s.get("hip")
        parts.append(f'<circle class="star" cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" '
                     f'fill="{col}" data-name="{s.get("name") or "HIP " + str(s["hip"])}" '
                     f'data-meta="mag {s["mag"]}" data-vid="{vid}"/>')
        if s.get("name"):
            parts.append(f'<text class="star-label" x="{x + r + 4:.1f}" y="{y + 4:.1f}" '
                         f'fill="#cfe0ff" font-size="13" font-weight="bold" '
                         f'data-vid="{vid}">{s.get("name")}</text>')

    # objetos Messier (mancha difusa por tipo)
    for o in cobjs:
        x = ra_to_x(o["ra"], ra_min, ra_max, scale, W, pad)
        y = dec_to_y(o["dec"], dec_min, dec_max, scale, H, pad)
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

    # --- Info JSON (estrellas del asterismo + las de la constelación) ---
    star_info = []
    info_hip = set()
    for s in asterism + cstars:
        if s.get("hip") in info_hip:
            continue
        info_hip.add(s.get("hip"))
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
