"""Build public/seed/recipes.json (all captured recipes) for the Recipe Box.

Inputs:
  /workspace/recipes/capture/rows.json   Rosa's capture rows (SL-006.., CK-...)
  scripts/seed_base.json                 the 5 hand-translated originals (SL-001..005)
  /workspace/recipes/meta/es_cache.json  offline MT cache from translate_seed.py
  src/lib/tagdefs.json                   ingredient/equipment tag dictionary (EN+ES)
  /workspace/recipes/capture/thumbs/<post_id>.jpg  real thumbnails, when captured
Run: python3 scripts/build_seed.py
"""
import json, os, re, sys, uuid, collections, shutil
sys.path.insert(0, os.path.dirname(__file__))
from seedlib import is_spanish, lines, strip_num, sentence_case, pre_mt, post_mt, makes_line

APP = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROWS = os.environ.get("ROWS", "/workspace/recipes/capture/rows.json")
CACHE = os.environ.get("ES_CACHE", "/workspace/recipes/meta/es_cache.json")
THUMBS_IN = os.environ.get("THUMBS", "/workspace/recipes/capture/thumbs")
OUT = os.path.join(APP, "public/seed/recipes.json")

defs = json.load(open(os.path.join(APP, "src/lib/tagdefs.json")))
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

SEASONING = re.compile(r"^\W*(salt|pepper|salt (and|&) pepper|sea salt|black pepper|water|ice|oil|olive oil|cooking spray|olive oil spray|spray|optional|to taste)\b[\w ,&/-]{0,25}$", re.I)


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


def equipment_tags(title, ingredients, steps, caption):
    caption = no_hashtags(caption)
    method = "\n".join(steps) if steps else (caption or "")
    text = f"{title}\n{method}"
    tags = [k for k, rx in EQ.items() if rx.search(text)]
    if "air_fryer" in tags and "oven" in tags and not re.search(r"\boven\b|horno|sheet pan|broil", text, re.I):
        tags.remove("oven")
    if re.search(r"no[- ]bake|sin horno", text, re.I) and "oven" in tags:
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


cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
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


rows = json.load(open(ROWS))
base = json.load(open(os.path.join(APP, "scripts/seed_base.json")))
os.makedirs(os.path.join(APP, "public/thumbs"), exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)

recipes = []
for r in base:
    r = dict(r)
    r["ingredient_tags"] = ingredient_tags(r["title_en"], r["ingredients_en"], r.get("caption"))
    r["equipment_tags"] = equipment_tags(r["title_en"], r["ingredients_en"], r["steps_en"], r.get("caption"))
    recipes.append(r)

seen = {r["fb_post_id"] for r in recipes}
real_photos = 0
for row in rows:
    pid = str(row["post_id"]).strip()
    if pid in seen:
        continue
    seen.add(pid)
    code = row["ID"]
    collection = "Cooking - SL" if code.startswith("SL") else "Cooking"
    caption = (row.get("Caption Text") or row.get("raw_caption") or "").strip() or None
    title_src = (row.get("Title") or "").strip()
    ing = lines(row.get("Ingredients"))
    steps = [strip_num(x) for x in lines(row.get("Steps"))]
    spanish_src = is_spanish(" ".join([title_src, row.get("Ingredients", ""), row.get("Steps", ""), caption or ""]))
    if spanish_src:
        t_en, t_es = None, title_src or None
        i_en, i_es, s_en, s_es = [], ing, [], steps
    else:
        t_en = title_src or None
        i_en, s_en = ing, steps
        latin = not re.search(r"[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\u0400-\u04ff]", title_src)
        t_es = es_of(sentence_case(title_src), "title") if title_src and latin else None
        i_es = translate_list(ing, "ing")
        s_es = translate_list(steps, "step")
        if (title_src and not t_es) or (ing and not i_es) or (steps and not s_es):
            missing_es.append(code)
    cal, pro, carb, fat = (num(row.get(k)) for k in ("Calories", "Protein (g)", "Carbs (g)", "Fat (g)"))
    has_macros = any(v is not None for v in (cal, pro, carb, fat))
    mb, servings = basis(row.get("Macros Basis"), (row.get("Servings") or "").strip() or None)
    thumb = None
    src_thumb = os.path.join(THUMBS_IN, f"{pid}.jpg")
    if os.path.exists(src_thumb) and os.path.getsize(src_thumb) > 2000:
        dst = os.path.join(APP, "public/thumbs", f"{code.lower()}.jpg")
        try:
            from PIL import Image
            im = Image.open(src_thumb).convert("RGB")
            im.thumbnail((480, 480))
            im.save(dst, quality=82)
        except Exception:
            shutil.copy(src_thumb, dst)
        thumb = f"thumbs/{code.lower()}.jpg"
        real_photos += 1
    title_for_tags = title_src
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
        "notes": (row.get("Notes") or "").strip() or None,
        "author": (row.get("Author") or "").strip() or None,
        "caption": caption,
        "collection": collection,
        "tags": general_tags(row.get("Tags")),
        "ingredient_tags": ingredient_tags(title_for_tags, ing, caption),
        "equipment_tags": equipment_tags(title_for_tags, ing, steps, caption),
        "fb_url": (row.get("Source URL") or "").strip() or f"https://www.facebook.com/watch/?v={pid}",
        "fb_post_id": pid,
        "thumbnail_url": thumb,
        "screenshot_url": None,
        "post_date": None,
        "captured_at": row.get("captured_at") or (row.get("Saved Date") + "T12:00:00-05:00"),
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
        "macro_source": "post" if has_macros else None,
        "es_reviewed": False,
        "created_at": row.get("captured_at") or (row.get("Saved Date") + "T12:00:00-05:00"),
        "updated_at": row.get("captured_at") or (row.get("Saved Date") + "T12:00:00-05:00"),
    }
    if spanish_src:
        rec["notes"] = ((rec["notes"] + " ") if rec["notes"] else "") + "Original post is in Spanish; English not translated."
    recipes.append(rec)

json.dump(recipes, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))

ic = collections.Counter(t for r in recipes for t in r["ingredient_tags"])
ec = collections.Counter(t for r in recipes for t in r["equipment_tags"])
with_es = sum(1 for r in recipes if r["title_es"] and (r["ingredients_es"] or not r["ingredients_en"]) and (r["steps_es"] or not r["steps_en"]))
stats = {
    "recipes": len(recipes),
    "with_macros": sum(1 for r in recipes if r["macro_source"] == "post"),
    "with_spanish": with_es,
    "missing_spanish": missing_es,
    "spanish_source": [r["code"] for r in recipes if r["title_en"] is None and r["title_es"]],
    "no_title": [r["code"] for r in recipes if not (r["title_en"] or r["title_es"])],
    "real_photos": real_photos + sum(1 for r in base if r.get("thumbnail_url")),
    "ingredient_tags": ic.most_common(),
    "equipment_tags": ec.most_common(),
    "bytes": os.path.getsize(OUT),
}
json.dump(stats, open("/workspace/recipes/meta/seed_stats.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps({k: v for k, v in stats.items() if k not in ("ingredient_tags",)}, ensure_ascii=False)[:1500])
print("ING", ic.most_common(30))
