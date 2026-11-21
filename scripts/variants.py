"""Derive ingredient variant keys (parent:variant) from recipe text.

Only variants that actually appear in the recipe's ingredient/title lines are
emitted. Labels live in src/lib/variantdefs.json; matching rules live here so
the frontend bundle stays regex-free.
"""
from __future__ import annotations

import re

# parent -> list of (variant_key, regex). Order matters: more specific first.
# Flavor/type matches are applied only on lines that mention that parent.
RULES: dict[str, list[tuple[str, re.Pattern]]] = {
    "protein_powder": [
        ("cookies_and_cream", re.compile(r"cookies?\s*(&|and)\s*cream", re.I)),
        ("cinnamon_toast", re.compile(r"cinnamon toast", re.I)),
        ("speculoos", re.compile(r"speculoos|biscoff", re.I)),
        ("peanut_butter", re.compile(r"peanut butter", re.I)),
        ("caramel", re.compile(r"\bcaramel\b", re.I)),
        ("white_chocolate", re.compile(r"white chocolate", re.I)),
        ("chocolate", re.compile(r"chocolate|cocoa|dutch chocolate", re.I)),
        ("vanilla", re.compile(r"vanilla(?! extract)", re.I)),
        ("unflavored", re.compile(r"unflavou?red", re.I)),
        ("whey_casein", re.compile(r"whey\s*([+/&]|and)?\s*casein|casein\s*([+/&]|and)?\s*whey|50/50 whey", re.I)),
        ("casein", re.compile(r"\bcasein\b", re.I)),
        ("whey", re.compile(r"\bwhey\b", re.I)),
    ],
    "pudding_jello": [
        ("white_chocolate", re.compile(r"white chocolate", re.I)),
        ("cheesecake", re.compile(r"cheesecake", re.I)),
        ("pistachio", re.compile(r"pistachio", re.I)),
        ("chocolate", re.compile(r"chocolate", re.I)),
        ("vanilla", re.compile(r"vanilla(?! extract)", re.I)),
        ("sugar_free", re.compile(r"sugar[ -]?free|zero sugar|\bSF\b", re.I)),
    ],
    "greek_yogurt": [
        ("skyr", re.compile(r"\bskyr\b", re.I)),
        ("vanilla", re.compile(r"vanilla(?! extract)", re.I)),
        ("plain", re.compile(r"\bplain\b|\bnatural\b", re.I)),
        ("nonfat", re.compile(r"\b0\s*%|non[ -]?fat|fat[ -]?free", re.I)),
        ("five_percent", re.compile(r"\b5\s*%", re.I)),
        ("low_fat", re.compile(r"low[ -]?fat|\b2\s*%", re.I)),
    ],
    "cottage_cheese": [
        ("fat_free", re.compile(r"\b0\s*%|non[ -]?fat|fat[ -]?free", re.I)),
        ("whole_milk", re.compile(r"whole milk|full[ -]?fat|\b4\s*%", re.I)),
        ("low_fat", re.compile(r"low[ -]?fat|\b2\s*%", re.I)),
    ],
    "chocolate": [
        ("cocoa", re.compile(r"cocoa powder|cacao powder|unsweetened cocoa|\bcocoa\b|\bcacao\b", re.I)),
        ("chips", re.compile(r"chocolate chips|chispas de chocolate", re.I)),
        ("white", re.compile(r"white chocolate", re.I)),
        ("dark", re.compile(r"dark chocolate|chocolate oscuro|70\s*%", re.I)),
        ("milk", re.compile(r"milk chocolate|chocolate con leche", re.I)),
        ("sugar_free", re.compile(r"sugar[ -]?free chocolate|chocolate sin az[uú]car", re.I)),
    ],
    "peanut_butter": [
        ("powdered", re.compile(r"powdered peanut|peanut (butter )?powder|pb2|pbfit|peanut butter powder", re.I)),
        ("creamy", re.compile(r"\bcreamy\b|natural (creamy )?peanut", re.I)),
    ],
    "chicken": [
        ("ground", re.compile(r"ground chicken|chicken mince|pollo molido", re.I)),
        ("breast", re.compile(r"chicken breasts?|pechugas? de pollo", re.I)),
        ("thigh", re.compile(r"chicken thighs?|muslos? de pollo", re.I)),
    ],
    "cream_cheese": [
        ("whipped", re.compile(r"\bwhipped\b", re.I)),
        ("light", re.compile(r"\blight\b|low[ -]?fat|reduced fat", re.I)),
    ],
}


def ingredient_variants(title: str, ingredients: list[str], parent_tags: list[str], parent_rx: dict) -> list[str]:
    """Return unique parent:variant keys for parents already tagged on the recipe."""
    out: list[str] = []
    seen: set[str] = set()
    title = title or ""
    for parent in parent_tags:
        rules = RULES.get(parent)
        if not rules:
            continue
        rx = parent_rx.get(parent)
        scoped = [title] + [ln for ln in ingredients if rx is None or rx.search(ln)]
        if rx is not None and not any(rx.search(ln) for ln in scoped):
            scoped = [title, "\n".join(ingredients)]
        blob = "\n".join(scoped)
        for key, vrx in rules:
            if vrx.search(blob):
                tag = f"{parent}:{key}"
                if tag not in seen:
                    seen.add(tag)
                    out.append(tag)
    return out
