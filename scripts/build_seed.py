"""Build public/seed/recipes.json (all captured recipes) for the Recipe Box.

Inputs:
  /workspace/recipes/capture/rows_v5.json  Rosa's v5 capture sheet (fallback: rows.json)
  scripts/es_overrides.json                reviewed Colombian Spanish (keyed by code)
  /workspace/recipes/meta/es_cache.json    offline MT cache from translate_seed.py
  src/lib/tagdefs.json                     ingredient/equipment tag dictionary (EN+ES)
  /workspace/recipes/capture/thumbs/<post_id>.jpg  real thumbnails, when captured
Run: python3 scripts/build_seed.py
"""
import json, os, re, sys, uuid, collections, shutil
sys.path.insert(0, os.path.dirname(__file__))
from seedlib import is_spanish, lines, strip_num, sentence_case, pre_mt, post_mt, makes_line
from authors import normalize_author
from variants import ingredient_variants as derive_variants

APP = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROWS_DEFAULTS = [
    "/workspace/recipes/capture/rows_v6.json",
    "/workspace/recipes/capture/rows_v5.json",
    "/workspace/recipes/capture/rows.json",
]
ROWS = os.environ.get("ROWS")
if not ROWS:
    ROWS = next((p for p in ROWS_DEFAULTS if os.path.exists(p)), ROWS_DEFAULTS[-1])
CACHE = os.environ.get("ES_CACHE", "/workspace/recipes/meta/es_cache.json")
THUMBS_IN = os.environ.get("THUMBS", "/workspace/recipes/capture/thumbs")
THUMBS_HD = "/workspace/recipes/capture/thumbs_hd"
NOT_RECIPE = {"SL-069", "SL-094", "CK-017", "SL-034"}
FORCED_DUPES = [("SL-078", "SL-112"), ("SL-091", "SL-111")]
OVERRIDES_PATH = os.path.join(APP, "scripts/es_overrides.json")
OUT = os.path.join(APP, "public/seed/recipes.json")

defs = json.load(open(os.path.join(APP, "src/lib/tagdefs.json")))
WEAK_TITLES = json.load(open(os.path.join(APP, "src/lib/weakTitles.json")))
ING = {k: re.compile(v[2], re.I) for k, v in defs["ingredient"].items()}
EQ = {k: re.compile(v[2], re.I) for k, v in defs["equipment"].items() if v[2]}
HEAT = {"air_fryer", "oven", "microwave", "slow_cooker", "pressure_cooker", "stovetop", "grill", "waffle_maker"}

GENERAL_OK = {
    "high-protein", "sugar-free", "low-calorie", "low-carb", "gluten-free", "keto", "healthy", "snack",
    "vegetarian", "vegan", "dairy-free", "kid-friendly", "macro-friendly", "meal-prep", "christmas",
}
GENERAL_MAP = {
    "highproteindessert": "high-protein", "highprotein": "high-protein", "lowcaloriedessert": "low-calorie",
    "lowcalorie": "low-calorie", "macrofriendly": "macro-friendly", "mealprepping": "meal-prep",
    "mealprep": "meal-prep", "easysnack": "snack", "healthyrecipe": "healthy", "healthyeating": "healthy",
    "glutenfree": "gluten-free", "sugarfree": "sugar-free", "lowcarb": "low-carb", "saludable": "healthy",
}

SEASONING = re.compile(
    r"^\W*(salt|pepper|salt (and|&) pepper|sea salt|black pepper|water|ice|oil|olive oil|"
    r"cooking spray|olive oil spray|spray|optional|to taste)\b[\w ,&/-]{0,25}$",
    re.I,
)

# Weak titles we can repair from the captured body.
TITLE_FIXES = {
    "CK-015": "Low-GI pancakes",
}
TITLE_RENAMES = {
    "CK-043": "2-Ingredient Chocolate Egg-White Brownies",
}

# Recipes whose source language is not English or Spanish (even if some fields were rewritten).
NON_EN_ES_IDS = set()  # v6 gave English (or ES Notes) for former foreign rows

CJK = re.compile(r"[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\u0400-\u04ff]")
ITALIAN = re.compile(
    r"\b(questa|questo|fogli di carta|pomodorini|formaggio|procedimento|sbatte|sovrapponili|"
    r"teglia|cornicione|forno ventilato|ingredienti:|carta di riso)\b",
    re.I,
)


def no_hashtags(s):
    return re.sub(r"#[\w-]+", " ", s or "")


def ingredient_tags(title, ingredients, caption):
    caption = no_hashtags(caption)
    ing_text = "\n".join(l for l in ingredients if not SEASONING.match(l))
    base = ing_text if ing_text.strip() else caption or ""
    text = f"{title}\n{base}"
    tags = [k for k, rx in ING.items() if rx.search(text)]
    t = title.lower()
    # Eggs only when they define the dish (egg-forward title, or lots of eggs) – not as a baking binder.
    if "eggs" in tags:
        n = sum(int(m) for m in re.findall(r"\b(\d+)\s*(?:large |whole |medium )?eggs?\b(?! whites?)", base, re.I))
        if not (re.search(r"\begg|omelet|frittata|quiche|shakshuka|huevo", t) or n >= 3):
            tags.remove("eggs")
    if "egg_whites" in tags and "eggs" in tags and not re.search(r"\begg|huevo", t):
        tags.remove("eggs")
    if "lemon" in tags and not re.search(r"lemon|lime|lim[oó]n", t):
        tags.remove("lemon")
    if "tomato" in tags and not re.search(r"tomat", t) and len(re.findall(r"tomat", base, re.I)) < 2:
        tags.remove("tomato")
    if "yogurt" in tags and "greek_yogurt" in tags:
        tags.remove("yogurt")
    if "nuts" in tags and "peanut_butter" in tags and not re.search(r"almond|walnut|pecan|pistachio|cashew|hazelnut|nuez|almendra", base, re.I):
        tags.remove("nuts")
    if "chocolate" in tags:
        choc = re.sub(r"chocolate (whey|protein|casein|isolate|pudding|jell-?o|flavou?red protein)|(vanilla|caramel) or chocolate", "", text, flags=re.I)
        if not ING["chocolate"].search(choc):
            tags.remove("chocolate")
    if "rice" in tags and "rice_paper" in tags and not re.search(r"(cooked|white|brown|jasmine|basmati) rice|cups? (of )?rice|arroz (blanco|cocido|integral)", text, re.I):
        tags.remove("rice")
    if "beef" in tags and "ground_beef" in tags:
        tags.remove("beef")
    if "rice" in tags and re.search(r"rice (paper|cakes?)", text, re.I) and not re.search(r"\brice\b(?! (paper|cakes?|krispies))", text, re.I):
        tags.remove("rice")
    return tags


def equipment_tags(title, ingredients, steps, caption, code=None):
    caption = no_hashtags(caption)
    method = "\n".join(steps) if steps else (caption or "")
    text = f"{title}\n{method}"
    tags = [k for k, rx in EQ.items() if rx.search(text)]
    if "air_fryer" in tags and "oven" in tags and not re.search(r"\boven\b|horno|sheet pan|broil", text, re.I):
        tags.remove("oven")
    if re.search(r"no[- ]bake|sin horno", text, re.I) and "oven" in tags:
        tags.remove("oven")
    if code == "CK-015" and "oven" in tags:
        tags.remove("oven")
    if "slow_cooker" in tags and "stovetop" in tags and not re.search(r"skillet|saucepan|sart[eé]n|stove|medium heat", text, re.I):
        tags.remove("stovetop")
    if re.search(r"no[- ]bake|no[- ]cook|sin horno", text, re.I) and not any(t in HEAT for t in tags) and "no_cook" not in tags:
        tags.append("no_cook")
        return tags
    if not any(t in HEAT for t in tags) and (steps or ingredients):
        if not re.search(r"\bcook(ed|ing)?\b|\bheat|caliente|cocina", method, re.I) or re.search(r"no[- ]cook|no[- ]bake|sin horno", text, re.I):
            tags.append("no_cook")
    return tags


def general_tags(raw):
    out = []
    for t in (raw or "").split(","):
        t = t.strip().lower()
        t = GENERAL_MAP.get(t, t)
        if t in GENERAL_OK and t not in out:
            out.append(t)
    return out


def num(v):
    v = (str(v) if v is not None else "").strip()
    if not v:
        return None
    try:
        f = float(v)
    except ValueError:
        m = re.search(r"\d+(\.\d+)?", v)
        if not m:
            return None
        f = float(m.group(0))
    return int(f) if f == int(f) else f


def basis(raw, servings):
    b = (raw or "").strip().lower()
    if not b:
        return None, servings
    if b == "per serving":
        return "per_serving", servings
    if b == "per item":
        return "per_item", servings
    if b == "total":
        return "total", servings
    m = re.match(r"for (\d+) servings?", b)
    if m:
        return "total", servings or m.group(1)
    m = re.match(r"per (.+)", b)
    if m:
        return "per_serving", servings or m.group(1)
    return None, servings


def parse_source(raw):
    """Return (source_type or None, is_substitute). source_type uses canonical keys."""
    s = (raw or "").strip()
    if not s or s.lower() in {"none", "nan"}:
        return None, False
    low = s.lower()
    types = []
    if re.search(r"\bcaption\b", low):
        types.append("caption")
    if re.search(r"\bcomment\b", low):
        types.append("comment")
    if "linked page" in low or "video text" in low and "linked" in low:
        types.append("linked_page")
    if "video text" in low:
        types.append("video_text")
    if re.search(r"\baudio\b", low):
        types.append("audio")
    if "creator page" in low:
        types.append("creator_page")
    if "equivalent recipe" in low:
        types.append("equivalent_recipe")
    if re.search(r"\bsubstitute\b", low):
        types.append("substitute")
    if "post description" in low:
        types.append("post_description")
    if re.search(r"\bvideo\b", low) and "video_text" not in types:
        types.append("video")
    is_sub = "equivalent_recipe" in types or "substitute" in types
    if not types:
        return s, is_sub
    return ", ".join(types), is_sub


def looks_foreign(code, title, ingredients, steps, caption):
    if code in NON_EN_ES_IDS:
        return True
    blob = " ".join([title or "", "\n".join(ingredients), "\n".join(steps), caption or ""])
    if CJK.search(blob) or ITALIAN.search(blob):
        return True
    return False


def fold(s):
    return re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower()).split()


def title_tokens(title):
    return set(w for w in fold(title) if len(w) > 1)


def jaccard(a, b):
    if not a or not b:
        return 0
    inter = len(a & b)
    return inter / (len(a) + len(b) - inter)


cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
overrides = json.load(open(OVERRIDES_PATH)) if os.path.exists(OVERRIDES_PATH) else {}
missing_es = []


def es_of(src, kind):
    if kind == "ing":
        ml = makes_line(src)
        if ml:
            return ml
    k = pre_mt(src)
    out = cache.get(k)
    if out is None:
        return None
    return post_mt(out)


def translate_list(items, kind):
    out = []
    for it in items:
        es = es_of(it, kind)
        if es is None:
            return []
        out.append(es)
    return out


def clean_ck015(title, ing, steps):
    if title.strip().lower() in {"large eggs", "large egg", "eggs"}:
        title = TITLE_FIXES["CK-015"]
    # Drop the prose intro line if present; keep real ingredient lines.
    cleaned = []
    for ln in ing:
        if re.search(r"these are one of my favorite|low-gi pancakes", ln, re.I) and not re.match(r"^\s*\d", ln):
            continue
        cleaned.append(re.sub(r"\s*\(Estimated GI:[^)]+\)\s*", " ", ln).strip())
    ing = [x for x in cleaned if x]
    if steps:
        steps = list(steps)
        steps[-1] = re.split(r"\s*Estimated Nutrition\b", steps[-1], maxsplit=1)[0].strip()
        steps = [s for s in steps if s]
    return title, ing, steps


rows = json.load(open(ROWS))
os.makedirs(os.path.join(APP, "public/thumbs"), exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)

recipes = []
seen = set()
real_photos = 0
for row in rows:
    pid = str(row.get("post_id") or "").strip()
    if not pid or pid in seen:
        continue
    seen.add(pid)
    code = row["ID"]
    collection = "Cooking - SL" if str(code).startswith("SL") else "Cooking"
    caption = (row.get("Caption Text") or row.get("raw_caption") or "").strip() or None
    title_src = (row.get("Title") or "").strip()
    if code in TITLE_FIXES and (not title_src or title_src.lower() in {"large eggs", "large egg", "eggs"}):
        title_src = TITLE_FIXES[code]
    notes = (row.get("Notes") or "").strip() or None
    if code in TITLE_RENAMES:
        orig = title_src
        title_src = TITLE_RENAMES[code]
        if orig and orig != title_src:
            extra = f'Original title: "{orig}"'
            notes = ((notes + " | ") if notes else "") + extra
    ing = lines(row.get("Ingredients"))
    steps = [strip_num(x) for x in lines(row.get("Steps"))]
    if code == "CK-015":
        title_src, ing, steps = clean_ck015(title_src, ing, steps)
    if code == "CK-043":
        ing = [
            "4 large egg whites, beaten to stiff peaks",
            "1 cup (170 g) semi-sweet chocolate chips, melted",
            "2 tbsp chocolate chips, for topping",
        ]
        steps = [
            "Beat the egg whites to stiff peaks.",
            "Fold in the melted chocolate chips.",
            "Pour into a small parchment-lined loaf pan (about 6×4 in), and top with the remaining chips.",
            "Bake at 325°F (165°C) for 30 minutes.",
        ]
        extra_note = "Amounts estimated from the video (no amounts given); whole pan ≈ 980 kcal / 22 g protein."
        if not notes or extra_note not in notes:
            notes = ((notes + " | ") if notes else "") + extra_note

    # Detect language from title + ingredients + steps (not the caption, which can skew).
    body_for_lang = " ".join([title_src, " ".join(ing), " ".join(steps)])
    spanish_src = is_spanish(body_for_lang) or (is_spanish(title_src) and not ing and not steps)
    foreign = looks_foreign(code, title_src, ing, steps, caption)

    if spanish_src and not foreign:
        t_en, t_es = None, title_src or None
        # If the title has an English gloss in parentheses, peel it off.
        m = re.match(r"^(.*?)\s*\(([^)]+)\)\s*$", title_src or "")
        if m and not is_spanish(m.group(2)) and is_spanish(m.group(1)):
            t_es, t_en = m.group(1).strip(), m.group(2).strip()
        i_en, i_es, s_en, s_es = [], ing, [], steps
        # If ingredient/step lines look English, keep them on the EN side and translate.
        if ing and not is_spanish(" ".join(ing)) and not CJK.search(" ".join(ing)):
            i_en, i_es = ing, translate_list(ing, "ing")
        if steps and not is_spanish(" ".join(steps)) and not CJK.search(" ".join(steps)):
            s_en, s_es = steps, translate_list(steps, "step")
    elif foreign and not spanish_src:
        # Keep original on the EN side when it is already English (e.g. a linked
        # English write-up of a Japanese video); still try to translate to ES.
        t_en = title_src or None
        i_en, s_en = ing, steps
        latin = not CJK.search(title_src or "")
        t_es = es_of(sentence_case(title_src), "title") if title_src and latin else None
        i_es = translate_list(ing, "ing")
        s_es = translate_list(steps, "step")
        if (title_src and not t_es) or (ing and not i_es) or (steps and not s_es):
            missing_es.append(code)
    else:
        t_en = title_src or None
        i_en, s_en = ing, steps
        latin = not CJK.search(title_src or "")
        t_es = es_of(sentence_case(title_src), "title") if title_src and latin else None
        i_es = translate_list(ing, "ing")
        s_es = translate_list(steps, "step")
        if (title_src and not t_es) or (ing and not i_es) or (steps and not s_es):
            missing_es.append(code)

    cal, pro, carb, fat = (num(row.get(k)) for k in ("Calories", "Protein (g)", "Carbs (g)", "Fat (g)"))
    has_macros = any(v is not None for v in (cal, pro, carb, fat))
    mb, servings = basis(row.get("Macros Basis"), (row.get("Servings") or "").strip() or None)
    macro_source = "post" if has_macros else None
    if code == "CK-043":
        servings = "4 pieces"
        cal, pro, carb, fat = 245, 5.5, 26, 14
        mb = "per_serving"
        has_macros = True
        macro_source = "estimated"
    thumb = None
    src_thumb = os.path.join(THUMBS_IN, f"{pid}.jpg")
    hd = os.path.join(THUMBS_HD, f"{code}.jpg")
    if os.path.exists(hd) and os.path.getsize(hd) > 2000:
        src_thumb = hd
    if os.path.exists(src_thumb) and os.path.getsize(src_thumb) > 2000:
        dst = os.path.join(APP, "public/thumbs", f"{code.lower()}.jpg")
        try:
            from PIL import Image
            im = Image.open(src_thumb).convert("RGB")
            im.thumbnail((600, 1100))
            im.save(dst, quality=80, optimize=True, progressive=True)
        except Exception:
            shutil.copy(src_thumb, dst)
        thumb = f"thumbs/{code.lower()}.jpg"
        real_photos += 1
    # Keep already-copied thumbs from earlier builds if the capture file is gone.
    if not thumb:
        existing = os.path.join(APP, "public/thumbs", f"{code.lower()}.jpg")
        if os.path.exists(existing) and os.path.getsize(existing) > 2000:
            thumb = f"thumbs/{code.lower()}.jpg"

    title_for_tags = title_src
    ing_tags = ingredient_tags(title_for_tags, ing, caption)
    eq_tags = equipment_tags(title_for_tags, ing, steps, caption, code=code)
    variants = derive_variants(title_for_tags, ing, ing_tags, ING)
    source_type, is_sub = parse_source(row.get("Source"))

    rec = {
        "id": str(uuid.uuid5(uuid.NAMESPACE_URL, "recipebox/" + pid)),
        "code": code,
        "status": "approved",
        "title_en": t_en,
        "title_es": t_es,
        "ingredients_en": i_en,
        "ingredients_es": i_es,
        "steps_en": s_en,
        "steps_es": s_es,
        "notes": notes,
        "author": normalize_author(row.get("Author")),
        "caption": caption,
        "collection": collection,
        "tags": general_tags(row.get("Tags")),
        "ingredient_tags": ing_tags,
        "equipment_tags": eq_tags,
        "ingredient_variants": variants,
        "fb_url": (row.get("Source URL") or "").strip() or f"https://www.facebook.com/watch/?v={pid}",
        "fb_post_id": pid,
        "thumbnail_url": thumb,
        "screenshot_url": None,
        "post_date": None,
        "captured_at": row.get("captured_at") or ((row.get("Saved Date") or "") + "T12:00:00-05:00" if row.get("Saved Date") else None),
        "servings": servings,
        "prep_time": (row.get("Prep Time") or "").strip() or None,
        "cook_time": (row.get("Cook Time") or "").strip() or None,
        "cuisine": (row.get("Cuisine") or "").strip() or None,
        "meal_type": (row.get("Meal Type") or "").strip() or None,
        "calories": cal,
        "protein_g": pro,
        "carbs_g": carb,
        "fat_g": fat,
        "macro_basis": mb if has_macros else None,
        "macro_source": macro_source,
        "es_reviewed": False,
        "is_favorite": False,
        "source_type": source_type,
        "is_substitute": is_sub,
        "review_reasons": [],
        "created_at": row.get("captured_at") or ((row.get("Saved Date") or "") + "T12:00:00-05:00" if row.get("Saved Date") else None),
        "updated_at": row.get("captured_at") or ((row.get("Saved Date") or "") + "T12:00:00-05:00" if row.get("Saved Date") else None),
    }
    if spanish_src and not foreign:
        rec["notes"] = ((rec["notes"] + " ") if rec["notes"] else "") + "Original post is in Spanish; English not translated."

    # Apply reviewed Colombian Spanish overrides (persist across rebuilds).
    ov = overrides.get(code) or {}
    if ov:
        if "title_es" in ov and (ov.get("src_title") is None or ov.get("src_title") == title_src):
            rec["title_es"] = ov["title_es"]
        if ov.get("title_en") and (ov.get("src_title") is None or ov.get("src_title") == title_src):
            rec["title_en"] = ov["title_en"]
        if "ingredients_es" in ov:
            rec["ingredients_es"] = ov["ingredients_es"]
        if "ingredients_en" in ov and ov["ingredients_en"]:
            rec["ingredients_en"] = ov["ingredients_en"]
        if "steps_es" in ov:
            rec["steps_es"] = ov["steps_es"]
        if "steps_en" in ov and ov["steps_en"]:
            rec["steps_en"] = ov["steps_en"]
        rec["es_reviewed"] = bool(ov.get("es_reviewed", True))

    recipes.append(rec)

# Recompute missing Spanish after overrides have been applied.
missing_es = [
    r["code"]
    for r in recipes
    if (r.get("title_en") and not r.get("title_es"))
    or (r.get("ingredients_en") and not r.get("ingredients_es"))
    or (r.get("steps_en") and not r.get("steps_es"))
]


def compute_review_reasons(all_recipes):
    by_fb = collections.defaultdict(list)
    for r in all_recipes:
        if r.get("fb_post_id"):
            by_fb[r["fb_post_id"]].append(r)
    fb_dupes = {r["id"] for rs in by_fb.values() if len(rs) > 1 for r in rs}

    toks = {r["id"]: title_tokens(r.get("title_en") or r.get("title_es") or "") for r in all_recipes}
    title_dupes = set()
    ids = [r["id"] for r in all_recipes]
    for i, a in enumerate(all_recipes):
        if a["id"] in title_dupes or not toks[a["id"]]:
            continue
        for b in all_recipes[i + 1:]:
            if a.get("fb_post_id") and a.get("fb_post_id") == b.get("fb_post_id"):
                continue
            if jaccard(toks[a["id"]], toks[b["id"]]) >= 0.8:
                title_dupes.add(a["id"])
                title_dupes.add(b["id"])

    by_code = {r["code"]: r for r in all_recipes}
    for a, b in FORCED_DUPES:
        if a in by_code and b in by_code:
            title_dupes.add(by_code[a]["id"]); title_dupes.add(by_code[b]["id"])
    for r in all_recipes:
        reasons = []
        has_title = bool((r.get("title_en") or r.get("title_es") or "").strip())
        has_ing = bool(r.get("ingredients_en") or r.get("ingredients_es"))
        has_steps = bool(r.get("steps_en") or r.get("steps_es"))
        if not has_title:
            reasons.append("missing_title")
        if not has_ing:
            reasons.append("missing_ingredients")
        if not has_steps:
            reasons.append("missing_steps")
        if r["code"] in NON_EN_ES_IDS or looks_foreign(r["code"], r.get("title_en") or "", r.get("ingredients_en") or [], r.get("steps_en") or [], ""):
            if "non_en_es" not in reasons:
                reasons.append("non_en_es")
        if r["code"] in NOT_RECIPE:
            reasons.append("not_a_recipe")
        if r["code"] in WEAK_TITLES and "v6: Original title" not in (r.get("notes") or ""):
            reasons.append("weak_title")
        if r.get("is_substitute"):
            reasons.append("substitute")
        if r["id"] in fb_dupes:
            reasons.append("duplicate_fb")
        if r["id"] in title_dupes:
            reasons.append("duplicate_title")
        r["review_reasons"] = reasons


compute_review_reasons(recipes)

json.dump(recipes, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))

ic = collections.Counter(t for r in recipes for t in r["ingredient_tags"])
ec = collections.Counter(t for r in recipes for t in r["equipment_tags"])
vc = collections.Counter(t for r in recipes for t in r["ingredient_variants"])
rc = collections.Counter(t for r in recipes for t in r["review_reasons"])
with_es = sum(1 for r in recipes if r["title_es"] and (r["ingredients_es"] or not r["ingredients_en"]) and (r["steps_es"] or not r["steps_en"]))
stats = {
    "recipes": len(recipes),
    "source_rows": ROWS,
    "with_macros": sum(1 for r in recipes if r.get("macro_source")),
    "with_spanish": with_es,
    "es_reviewed": sum(1 for r in recipes if r["es_reviewed"]),
    "missing_spanish": missing_es,
    "spanish_source": [r["code"] for r in recipes if r["title_en"] is None and r["title_es"]],
    "no_title": [r["code"] for r in recipes if not (r["title_en"] or r["title_es"])],
    "substitutes": sum(1 for r in recipes if r["is_substitute"]),
    "source_types": dict(collections.Counter(r["source_type"] for r in recipes if r["source_type"])),
    "review_reasons": rc.most_common(),
    "needs_review": sum(1 for r in recipes if r["review_reasons"]),
    "real_photos": real_photos + sum(1 for r in recipes if r.get("thumbnail_url") and not real_photos),
    "thumbs": sum(1 for r in recipes if r.get("thumbnail_url")),
    "ingredient_tags": ic.most_common(),
    "equipment_tags": ec.most_common(),
    "ingredient_variants": vc.most_common(),
    "bytes": os.path.getsize(OUT),
}
# fix thumbs count
stats["thumbs"] = sum(1 for r in recipes if r.get("thumbnail_url"))
json.dump(stats, open("/workspace/recipes/meta/seed_stats_v3.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps({k: v for k, v in stats.items() if k not in ("ingredient_tags", "equipment_tags", "ingredient_variants")}, ensure_ascii=False)[:2500])
print("ING", ic.most_common(20))
print("VAR", vc.most_common(25))
print("EQ", ec.most_common())
print("REVIEW", rc.most_common())
