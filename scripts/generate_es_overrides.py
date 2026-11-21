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
    "SL-077": {
        "title_en": "Rice paper pizza",
        "title_es": "Pizza de papel de arroz",
        "ingredients_en": [
            "2 sheets rice paper",
            "1 egg",
            "30 g light spreadable cheese",
            "5–6 cherry tomatoes",
            "30 g light mozzarella",
            "Fresh basil and oregano, to taste",
            "Sesame seeds (for the crust)",
        ],
        "ingredients_es": [
            "2 hojas de papel de arroz",
            "1 huevo",
            "30 g de queso untable light",
            "5-6 tomates cherry",
            "30 g de mozzarella light",
            "Albahaca fresca y orégano, al gusto",
            "Semillas de sésamo (para el borde)",
        ],
        "steps_en": [
            "Beat the egg in a plate and wet both sides of the 2 rice paper sheets.",
            "Stack them directly on a baking sheet lined with parchment paper.",
            "Spread the light cheese, add the sliced cherry tomatoes, and roll the edges to form a crust.",
            "Add oregano and sesame on the edges, and bake in a convection oven at 190 °C for 15 minutes.",
            "Out of the oven, add the mozzarella and fresh basil.",
        ],
        "steps_es": [
            "Bata el huevo en un plato e hidrate los 2 papeles de arroz por ambos lados.",
            "Superpóngalos directamente sobre una bandeja forrada con papel de horno.",
            "Unte el queso light, agregue los tomates cherry en rodajas y enrolle los bordes para formar el borde.",
            "Agregue orégano y sésamo en los bordes y hornee en horno con ventilador a 190 °C por 15 minutos.",
            "Al salir del horno, agregue la mozzarella y la albahaca fresca.",
        ],
        "es_reviewed": True,
    },
    "CK-009": {
        "title_en": "Rice-paper cheese triangle",
        "title_es": "Triángulo de papel de arroz y queso",
        "ingredients_en": [
            "For 1 person:",
            "2 rice paper sheets",
            "1 egg",
            "Sesame seeds (optional)",
            "Emmental cheese, cut into rectangles",
            "Plus, as used in the base: a slice of tomato, cooked ham, a little more grated cheese, and extra-virgin olive oil",
        ],
        "ingredients_es": [
            "Para 1 persona:",
            "2 hojas de papel de arroz",
            "1 huevo",
            "Semillas de sésamo (opcional)",
            "Queso emmental, cortado en rectángulos",
            "En la base, como en la receta: una tajada de tomate, jamón cocido, un poco más de queso rallado y aceite de oliva extra virgen",
        ],
        "steps_en": [
            "Dip two rice papers in beaten egg and stack them.",
            "Arrange rectangles of Emmental in a triangle on the papers; fold the edges in so you get a triangle with cheese-filled borders.",
            "On the base, add a slice of tomato, cooked ham, and a little more grated cheese. Sprinkle with sesame and drizzle with extra-virgin olive oil.",
            "Air-fry 12 minutes at 180 °C.",
        ],
        "steps_es": [
            "Pase dos papeles de arroz por huevo batido y superpóngalos.",
            "Acomode rectángulos de emmental en triángulo sobre los papeles; pliegue los bordes hacia adentro para formar un triángulo con el queso en los bordes.",
            "En la base, agregue una tajada de tomate, jamón cocido y un poco más de queso rallado. Espolvoree sésamo y rocíe con aceite de oliva extra virgen.",
            "Cocine en la freidora de aire 12 minutos a 180 °C.",
        ],
        "es_reviewed": True,
    },
    "CK-015": {
        "title_en": "Low-GI pancakes",
        "title_es": "Panqueques de bajo índice glucémico",
        "ingredients_en": [
            "2 large eggs",
            "2 tablespoons natural almond butter",
            "Avocado oil spray for the pan",
            "NuNaturals Sugar-Free Stevia Sweetened Maple Syrup",
        ],
        "ingredients_es": [
            "2 huevos grandes",
            "2 cucharadas de mantequilla de almendra natural",
            "Aceite de aguacate en spray, para la sartén",
            "Jarabe de maple NuNaturals endulzado con estevia, sin azúcar",
        ],
        "steps_en": [
            "Add the eggs and almond butter to a bullet blender.",
            "Blend until the mixture is completely smooth and creamy.",
            "Heat a nonstick or stainless steel skillet over medium heat.",
            "Lightly coat the pan with avocado oil spray.",
            "Pour the batter into 3- to 4-inch circles to make small pancakes.",
            "Cook until the bottom is golden brown and the edges begin to set.",
            "Carefully flip each pancake and cook until the second side is golden brown.",
            "Serve warm with NuNaturals Sugar-Free Stevia Sweetened Maple Syrup.",
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
    "CK-057": {
        "title_en": "Chicken chicharrón",
        "title_es": "Chicharrón de pollo",
        "ingredients_en": [
            "2 chicken breasts",
            "Garlic powder, paprika, chili powder, salt and pepper",
            "A drizzle of olive oil",
            "2 teaspoons baking soda",
            "For the guacamole:",
            "2 avocados",
            "1 pear tomato",
            "1 red onion",
            "1 lemon or lime",
            "Cilantro",
        ],
        "ingredients_es": [
            "2 pechugas de pollo",
            "Ajo en polvo, pimentón, ají molido, sal y pimienta",
            "1 chorrito de aceite de oliva",
            "2 cucharaditas de bicarbonato",
            "Para el guacamole:",
            "2 aguacates",
            "1 tomate pera",
            "1 cebolla morada",
            "1 limón",
            "Cilantro",
        ],
        "steps_en": [
            "Pound or stretch the chicken very thin on a baking sheet.",
            "Season with garlic powder, paprika, chili powder, salt and pepper.",
            "Add a drizzle of olive oil and the baking soda.",
            "Cook slowly in a medium oven, or in the air fryer.",
            "Serve with guacamole.",
        ],
        "steps_es": [
            "Estire el pollo bien delgado sobre una bandeja.",
            "Sazone con ajo en polvo, pimentón, ají molido, sal y pimienta.",
            "Agregue un chorrito de aceite de oliva y el bicarbonato.",
            "Cocine despacio en horno medio, o en la freidora de aire.",
            "Sirva con guacamole.",
        ],
        "es_reviewed": True,
    },
    "SL-088": {
        "title_en": "Crispy rice paper cheese bites",
        "title_es": "Bocaditos crujientes de queso en papel de arroz",
        "ingredients_en": [
            "Rice paper, 4 sheets (for 2 servings)",
            "Pizza cheese, as needed",
        ],
        "ingredients_es": [
            "Papel de arroz, 4 hojas (para 2 porciones)",
            "Queso para pizza, la cantidad necesaria",
        ],
        "steps_en": [
            "Wet the rice paper with water.",
            "Scatter pizza cheese over it, top with another wetted sheet, and roll. Repeat to make a second roll.",
            "Cut into bite-size pieces, arrange on microwave-safe parchment, and microwave at 600 W for 2 minutes until crisp.",
        ],
        "steps_es": [
            "Humedezca el papel de arroz con agua.",
            "Esparza el queso para pizza, cubra con otra hoja humedecida y enrolle. Repita para hacer un segundo rollo.",
            "Corte en bocaditos, acomódelos sobre papel de horno apto para microondas y caliente a 600 W por 2 minutos, hasta que queden crujientes.",
        ],
        "es_reviewed": True,
    },
}


def main() -> None:
    seed = json.load(open(SEED))
    out = {}
    missing_titles = []
    reviewed = 0
    for r in seed:
        code = r["code"]
        if code in SPECIALS:
            ov = dict(SPECIALS[code])
            ov["es_reviewed"] = True
            out[code] = ov
            reviewed += 1
            continue
        ov = {"es_reviewed": True}
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
