"""Build scripts/es_overrides.json from the current seed + reviewed titles + styler.

Run after scripts/build_seed.py (so English and first-pass ES exist):
  python3 scripts/generate_es_overrides.py
  python3 scripts/build_seed.py
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from colombian import style, style_list
from es_titles import TITLE_EN, TITLES

APP = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SEED = os.path.join(APP, "public/seed/recipes.json")
ROWS = "/workspace/recipes/capture/rows_v6.json"
OUT = os.path.join(APP, "scripts/es_overrides.json")

SPECIALS = {
    "SL-001": {
        "title_es": "Brownie proteico húmedo y saludable",
        "ingredients_es": [
            "1 huevo grande",
            "1/3 taza de queso cottage",
            "2-3 cucharadas de cacao en polvo sin azúcar",
            "3 cucharadas de edulcorante sin azúcar",
            "1/2 cucharadita de vainilla",
            "1/2 cucharadita de polvo para hornear",
            "1/4 taza de chispas de chocolate sin azúcar",
        ],
        "steps_es": [
            "Mezcle todos los ingredientes excepto las chispas de chocolate.",
            "Vierta en un ramequín y mezcle algunas chispas de chocolate en el centro, para el centro de lava.",
            "Cubra con el resto de las chispas de chocolate y hornee a 175 °C (350 °F) por 20-30 minutos. Sáquelo, deje enfriar y disfrute.",
        ],
        "es_reviewed": True,
    },
    "SL-088": {
        "title_es": "Bocaditos crujientes de papel de arroz con queso",
        "ingredients_es": [
            "4 hojas de papel de arroz (para 2 porciones)",
            "Queso para pizza, al gusto",
        ],
        "steps_es": [
            "Moje el papel de arroz con agua.",
            "Esparza queso para pizza, cubra con otra hoja mojada y enrolle; repita para hacer un segundo rollo.",
            "Corte en bocados, colóquelos sobre papel apto para microondas y caliente a 600 W durante 2 minutos hasta que estén crujientes.",
        ],
        "es_reviewed": True,
    },
    "CK-043": {
        "title_es": "Brownies de 2 ingredientes con claras de huevo y chocolate",
        "ingredients_es": [
            "4 claras de huevo grandes, batidas a punto de nieve",
            "1 taza (170 g) de chispas de chocolate semiamargo, derretidas",
            "2 cucharadas de chispas de chocolate, para decorar",
        ],
        "steps_es": [
            "Bata las claras a punto de nieve.",
            "Incorpore las chispas derretidas con movimientos envolventes.",
            "Vierta en un molde de pan pequeño forrado con papel de hornear (unos 15 × 10 cm) y cubra con las chispas.",
            "Hornee a 165 °C (325 °F) por 30 minutos.",
        ],
        "es_reviewed": True,
    },
    "CK-015": {
        "ingredients_es": [
            "2 huevos grandes",
            "2 cucharadas de mantequilla de almendra natural",
            "Aceite de aguacate en spray, para la sartén",
            "Jarabe de maple NuNaturals endulzado con estevia, sin azúcar",
        ],
        "steps_es": [
            "Ponga los huevos y la mantequilla de almendra en una licuadora personal.",
            "Licúe hasta que la mezcla quede completamente suave y cremosa.",
            "Caliente una sartén antiadherente o de acero inoxidable a fuego medio.",
            "Rocíe un poco de aceite de aguacate en la sartén.",
            "Vierta la mezcla en círculos de 8 a 10 cm para formar panqueques pequeños.",
            "Cocine hasta que la base esté dorada y los bordes empiecen a cuajar.",
            "Voltee con cuidado cada panqueque y cocine hasta que el otro lado también esté dorado.",
            "Sirva caliente con jarabe de maple NuNaturals endulzado con estevia, sin azúcar.",
        ],
        "es_reviewed": True,
    },
}


def main() -> None:
    seed = json.load(open(SEED))
    src_titles = {r["ID"]: (r.get("Title") or "").strip() for r in json.load(open(ROWS))}
    out = {}
    missing_titles = []
    reviewed = 0
    for r in seed:
        code = r["code"]
        if code in SPECIALS:
            ov = dict(SPECIALS[code])
            ov["es_reviewed"] = True
            ov["src_title"] = r.get("title_en") or src_titles.get(code)
            if code in TITLES:
                ov["title_es"] = TITLES[code]
            out[code] = ov
            reviewed += 1
            continue
        ov = {"es_reviewed": True, "src_title": r.get("title_en") or src_titles.get(code)}
        if code in TITLE_EN:
            ov["title_en"] = TITLE_EN[code]
        if code in TITLES:
            ov["title_es"] = TITLES[code]
        else:
            missing_titles.append(code)
            if r.get("title_es"):
                ov["title_es"] = style(r["title_es"])
        if r.get("ingredients_es"):
            ov["ingredients_es"] = style_list(r["ingredients_es"])
        if r.get("steps_es"):
            ov["steps_es"] = style_list(r["steps_es"])
        out[code] = ov
        reviewed += 1
    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=1)
    print(f"wrote {len(out)} overrides ({reviewed} reviewed) to {OUT}")
    if missing_titles:
        print("missing titles", missing_titles)


if __name__ == "__main__":
    main()
