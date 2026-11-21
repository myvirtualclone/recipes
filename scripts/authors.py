"""Normalize recipe authors (creators) to a display name.

Rules: trim, strip a leading @, collapse whitespace, title-case multi-word
names, merge obvious aliases of the same creator. Handles (no spaces) keep
their original spelling.
"""
from __future__ import annotations

import re

# lowercase key -> canonical display name (aliases + casing fixes)
DISPLAY = {
    "hungry happens": "Hungry Happens",
    "dani's healthy eats": "Dani's Healthy Eats",
    "high protein low carb recipes": "High Protein Low Carb Recipes",
    "johannes cullberg coach": "Johannes Cullberg Coach",
}

# No obvious same-person merges in the current sheet; keep the map for later imports.
ALIASES: dict[str, str] = {}


def fold_author(raw: str | None) -> str:
    s = (raw or "").strip()
    s = re.sub(r"^@+", "", s).strip()
    s = re.sub(r"\s+", " ", s)
    return s


def author_key(raw: str | None) -> str:
    return fold_author(raw).lower()


SMALL = {"with", "and", "of", "by", "the", "de", "del", "da", "on"}


def _title_word(w: str, first: bool) -> str:
    if not w:
        return w
    low = w.lower().rstrip(".")
    if low in {"md", "phd", "rd", "doac"}:
        return w[0:len(low)].upper() + w[len(low):]
    if not first and w.lower() in SMALL:
        return w.lower()
    # Already camel / inner caps (McCord, etc.)
    if re.search(r"[a-z][A-Z]", w):
        return w
    return w[0].upper() + w[1:]


def titlecase_name(s: str) -> str:
    if " " not in s:
        return s
    parts = []
    for i, p in enumerate(s.split(" ")):
        if p in {"-", "–"}:
            parts.append(p)
            continue
        parts.append(_title_word(p, first=(i == 0)))
    return " ".join(parts)


def normalize_author(raw: str | None) -> str | None:
    s = fold_author(raw)
    if not s:
        return None
    k = s.lower()
    if k in ALIASES:
        k = author_key(ALIASES[k])
        s = ALIASES[s.lower()] if s.lower() in ALIASES else s
    if k in DISPLAY:
        return DISPLAY[k]
    if k in ALIASES:
        return ALIASES[k]
    return titlecase_name(s)
