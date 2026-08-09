#!/usr/bin/env python3
"""Procesa catálogos astronómicos crudos (d3-celestial) a JSON locales del proyecto.

Genera:
  src/data/stars.json          - estrellas brillantes (Hipparcos, mag<=5)
  src/data/constellations.json - líneas IAU de constelaciones
  src/data/deep-sky.json       - objetos Messier destacados
  src/data/spanish-provinces.json - 50 provincias ES con lat/lon
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data_raw")
OUT = os.path.join(ROOT, "src", "data")
os.makedirs(OUT, exist_ok=True)


def load(name):
    with open(os.path.join(RAW, name), encoding="utf-8") as f:
        return json.load(f)


# ─── Estrellas (Hipparcos) ───────────────────────────────────────────────
def build_stars():
    data = load("stars.6.json")
    # Nombres propios / Bayer de las estrellas más brillantes (HIP -> nombre)
    names = {
        32349: "Alkaid", 62956: "Polaris", 91262: "Deneb", 677: "Alpheratz",
        2081: "Mirach", 3419: "Almach", 5447: "Hamal", 7461: "Sheratan",
        8903: "Mesarthim", 9884: "Menkar", 14135: "Algol", 15863: "Mirfak",
        21421: "Aldebaran", 25336: "Capella", 25428: "Rigel", 27989: "Bellatrix",
        30438: "Betelgeuse", 35904: "Procyon", 37279: "Pollux", 37826: "Castor",
        39953: "Sirio", 43025: "Lynx", 46390: "Alphard", 49669: "Regulus",
        54879: "Denebola", 57632: "Zosma", 60009: "Chertan", 60742: "Zubenelgenubi",
        65474: "Arcturus", 66249: "Izar", 68756: "Spica", 69673: "Arich",
        72105: "Vindemiatrix", 72607: "Heze", 75177: "Syrma", 76267: "Unukalhai",
        78401: "Rasalhague", 79275: "Sabik", 80112: "Rasalague", 85927: "Vega",
        89080: "Albireo", 90039: "Albirio", 91262: "Deneb", 93085: "Enif",
        95947: "Alnair", 97649: "Markab", 9884: "Menkar", 25336: "Capella",
        24608: "Elnath", 28360: "Hassaleh", 32607: "Alhena", 33160: "Mebsuta",
        35468: "Wasat", 36850: "Meissa", 41704: "Alphard", 53410: "Adhafera",
        57853: "Zubeneschamali", 67301: "Alkaid", 70027: "Zaniah", 70249: "Porrima",
        70957: "Auva", 73967: "Kraz", 76229: "Yed Prior", 77070: "Sargas",
        80763: "Tarazed", 81693: "Altair", 87308: "Sadr", 87769: "Gienah",
        90088: "Deneb Algedi", 93429: "Fomalhaut", 54061: "Dubhe", 53910: "Merak",
        58001: "Phecda", 59774: "Megrez", 62956: "Alioth", 65378: "Mizar", 67315: "Seginus",
        60009: "Chertan", 60742: "Zubenelgenubi", 65474: "Arcturus", 66249: "Izar",
        68756: "Spica", 69673: "Arich", 72105: "Vindemiatrix", 72607: "Heze",
        75177: "Syrma", 76267: "Unukalhai", 78401: "Rasalhague", 79275: "Sabik",
        80112: "Rasalague", 85927: "Vega", 89080: "Albireo", 90039: "Albirio",
        91262: "Deneb", 93085: "Enif", 95947: "Alnair", 97649: "Markab",
        6734: "Botein",
    }
    # Constelación correcta por nombre propio (corrige casos visibles)
    name_to_const = {
        "Alkaid": "Osa Mayor", "Polaris": "Osa Menor", "Deneb": "Cisne",
        "Alpheratz": "Andrómeda", "Mirach": "Andrómeda", "Almach": "Andrómeda",
        "Hamal": "Aries", "Sheratan": "Aries", "Mesarthim": "Aries",
        "Menkar": "Cetus", "Algol": "Perseo", "Mirfak": "Perseo",
        "Aldebaran": "Tauro", "Capella": "Cochero", "Rigel": "Orión",
        "Bellatrix": "Orión", "Betelgeuse": "Orión", "Meissa": "Orión",
        "Alhena": "Géminis", "Mebsuta": "Géminis", "Wasat": "Géminis",
        "Procyon": "Can Menor", "Pollux": "Géminis", "Castor": "Géminis",
        "Sirio": "Can Mayor", "Lynx": "Lynx", "Alphard": "Hydra",
        "Regulus": "Leo", "Denebola": "Leo", "Zosma": "Leo", "Chertan": "Leo",
        "Zubenelgenubi": "Libra", "Zubeneschamali": "Libra",
        "Arcturus": "Bootes", "Izar": "Bootes", "Muphrid": "Bootes",
        "Seginus": "Bootes", "Spica": "Virgo", "Arich": "Virgo",
        "Zaniah": "Virgo", "Porrima": "Virgo", "Auva": "Virgo",
        "Vindemiatrix": "Virgo", "Heze": "Virgo", "Kraz": "Cuervo",
        "Unukalhai": "Serpens", "Yed Prior": "Ofiuco", "Sargas": "Escorpio",
        "Rasalhague": "Ofiuco", "Sabik": "Ofiuco", "Rasalague": "Ofiuco",
        "Vega": "Lira", "Albireo": "Cisne", "Albirio": "Cisne", "Sadr": "Cisne",
        "Gienah": "Cisne", "Tarazed": "Águila", "Altair": "Águila",
        "Enif": "Pegaso", "Alnair": "Grus", "Markab": "Pegaso",
        "Fomalhaut": "Pez Austral", "Deneb Algedi": "Capricornio",
        "Elnath": "Tauro", "Hassaleh": "Auriga", "Adhafera": "Leo",
        "Mizar": "Osa Mayor", "Coxa": "Leo", "Acrab": "Escorpio",
        "Dschubba": "Escorpio", "Pi Scorpii": "Escorpio", "Graffias": "Escorpio",
        "Botein": "Aries",
    }
    out = []
    for feat in data["features"]:
        mag = float(feat["properties"].get("mag", 99))
        if mag > 5.0:
            continue
        ra, dec = feat["geometry"]["coordinates"]
        hip = feat["id"]
        nm = names.get(hip)
        out.append({
            "hip": hip,
            "ra": round(ra, 4),
            "dec": round(dec, 4),
            "mag": round(mag, 2),
            "bv": feat["properties"].get("bv"),
            "name": nm,
            "con": name_to_const.get(nm) if nm else None,
        })
    out.sort(key=lambda s: s["mag"])
    with open(os.path.join(OUT, "stars.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=0)
    print(f"stars.json: {len(out)} estrellas (mag<=5)")


# ─── Constelaciones (líneas IAU) ─────────────────────────────────────────
def build_constellations():
    data = load("constellations.lines.json")
    # Nombre legible por id
    names = {
        "And": "Andrómeda", "Ant": "Antlia", "Aps": "Apus", "Aqr": "Acuario",
        "Aql": "Águila", "Ara": "Ara", "Ari": "Aries", "Aur": "Cochero",
        "Boo": "Bootes", "Cae": "Caelum", "Cam": "Camelopardalis", "Cnc": "Cáncer",
        "CVn": "Canes Venatici", "CMa": "Can Mayor", "CMi": "Can Menor",
        "Cap": "Capricornio", "Car": "Carina", "Cas": "Casiopea", "Cen": "Centauro",
        "Cep": "Cefeo", "Cet": "Cetus", "Cha": "Chamaeleon", "Cir": "Circinus",
        "Col": "Columba", "Com": "Coma Berenices", "CrA": "Corona Austral",
        "CrB": "Corona Borealis", "Crv": "Cuervo", "Crt": "Cráter", "Cru": "Cruz",
        "Cyg": "Cisne", "Del": "Delphinus", "Dor": "Dorado", "Dra": "Dragón",
        "Equ": "Equuleus", "Eri": "Eridanus", "For": "Fornax", "Gem": "Géminis",
        "Gru": "Grus", "Her": "Hércules", "Hor": "Horologium", "Hya": "Hydra",
        "Hyi": "Hydrus", "Ind": "Indus", "Lac": "Lacerta", "Leo": "Leo",
        "Lep": "Lepus", "Lib": "Libra", "LMi": "Leo Minor", "Lup": "Lupus",
        "Lyn": "Lynx", "Lyr": "Lira", "Men": "Mensa", "Mic": "Microscopium",
        "Mon": "Monoceros", "Mus": "Musca", "Nor": "Norma", "Oct": "Octans",
        "Oph": "Ofiuco", "Ori": "Orión", "Pav": "Pavo", "Peg": "Pegaso",
        "Per": "Perseo", "Phe": "Phoenix", "Pic": "Pictor", "PsA": "Pez Austral",
        "Psc": "Piscis", "Pup": "Popa", "Pyx": "Brujula", "Ret": "Reticulum",
        "Sge": "Sagitta", "Sgr": "Sagitario", "Sco": "Escorpio", "Scl": "Escultor",
        "Sct": "Scutum", "Ser": "Serpens", "Sex": "Sextans", "Tau": "Tauro",
        "Tel": "Telescopium", "TrA": "Triángulo Austral", "Tri": "Triángulo",
        "Tuc": "Tucana", "UMa": "Osa Mayor", "UMi": "Osa Menor", "Vel": "Vela",
        "Vir": "Virgo", "Vol": "Volans", "Vul": "Vulpecula",
    }
    seen = set()
    out = []
    for feat in data["features"]:
        cid = feat["id"]
        if cid in seen:
            continue
        seen.add(cid)
        coords = feat["geometry"]["coordinates"]  # lista de líneas, cada una lista de [ra,dec]
        lines = []
        for line in coords:
            lines.append([[round(p[0], 3), round(p[1], 3)] for p in line])
        out.append({
            "id": cid,
            "name": names.get(cid, cid),
            "lines": lines,
        })
    out.sort(key=lambda c: c["id"])
    with open(os.path.join(OUT, "constellations.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=0)
    print(f"constellations.json: {len(out)} constelaciones")


# ─── Objetos deep-sky (Messier) ──────────────────────────────────────────
def build_deepsky():
    data = load("messier.json")
    type_names = {
        "galaxy": "Galaxia", "glob": "Cúmulo globular", "open": "Cúmulo abierto",
        "neb": "Nebulosa", "snr": "Resto de supernova", "planet": "Nebulosa planetaria",
        "dn": "Nebulosa oscura", "asterism": "Asterismo",
    }
    out = []
    for feat in data["features"]:
        props = feat["properties"]
        ra, dec = feat["geometry"]["coordinates"]
        out.append({
            "id": feat["id"],
            "name": props.get("name") or props.get("desig"),
            "desig": props.get("desig"),
            "alt": props.get("alt"),
            "type": props.get("type"),
            "typeName": type_names.get(props.get("type"), props.get("type")),
            "mag": props.get("mag"),
            "ra": round(ra, 4),
            "dec": round(dec, 4),
        })
    out.sort(key=lambda o: o["id"])
    with open(os.path.join(OUT, "deep-sky.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=0)
    print(f"deep-sky.json: {len(out)} objetos Messier")


# ─── Provincias españolas (lat/lon) ──────────────────────────────────────
def build_provinces():
    provinces = [
        ("Álava", 42.8467, -2.6746), ("Albacete", 38.9943, -1.8560),
        ("Alicante", 38.3453, -0.4818), ("Almería", 36.8402, -2.4584),
        ("Asturias", 43.3614, -5.8593), ("Ávila", 40.6564, -4.6866),
        ("Badajoz", 38.8783, -6.9706), ("Barcelona", 41.3851, 2.1734),
        ("Burgos", 42.3439, -3.6969), ("Cáceres", 39.4703, -6.3720),
        ("Cádiz", 36.5298, -6.2926), ("Cantabria", 43.2046, -3.7916),
        ("Castellón", 39.9868, -0.0491), ("Ceuta", 35.8894, -5.3150),
        ("Ciudad Real", 38.9849, -3.9274), ("Córdoba", 37.8882, -4.7794),
        ("La Coruña", 43.2630, -8.4155), ("Cuenca", 40.0706, -2.1374),
        ("Gerona", 41.9793, 2.8214), ("Granada", 37.1773, -3.5986),
        ("Guadalajara", 40.6333, -3.1667), ("Guipúzcoa", 43.3183, -1.9810),
        ("Huelva", 37.2614, -6.9447), ("Huesca", 42.1408, -0.4089),
        ("Islas Baleares", 39.6953, 2.6489), ("Jaén", 37.7692, -3.7907),
        ("León", 42.5987, -5.5671), ("Lérida", 41.6176, 0.6201),
        ("Lugo", 43.0099, -7.5566), ("Madrid", 40.4168, -3.7038),
        ("Málaga", 36.7213, -4.4214), ("Melilla", 35.2923, -2.9381),
        ("Murcia", 37.9922, -1.1307), ("Navarra", 42.6954, -1.6761),
        ("Orense", 42.3359, -7.8639), ("Palencia", 42.0098, -4.5261),
        ("Las Palmas", 28.1235, -15.4363), ("Pontevedra", 42.4326, -8.6434),
        ("La Rioja", 42.2871, -2.5396), ("Salamanca", 40.9701, -5.6635),
        ("Segovia", 40.9429, -4.1088), ("Sevilla", 37.3891, -5.9845),
        ("Soria", 41.7648, -2.4683), ("Tarragona", 41.1189, 1.2445),
        ("Santa Cruz de Tenerife", 28.4636, -16.2518), ("Teruel", 40.3440, -1.1069),
        ("Toledo", 39.8628, -4.0273), ("Valencia", 39.4699, -0.3763),
        ("Valladolid", 41.6523, -4.7245), ("Vizcaya", 43.2630, -2.9350),
        ("Zamora", 41.5034, -5.7447), ("Zaragoza", 41.6488, -0.8891),
    ]
    out = [{"name": n, "lat": lat, "lon": lon} for n, lat, lon in provinces]
    with open(os.path.join(OUT, "spanish-provinces.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=0)
    print(f"spanish-provinces.json: {len(out)} provincias")


if __name__ == "__main__":
    build_stars()
    build_constellations()
    build_deepsky()
    build_provinces()
