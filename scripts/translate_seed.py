"""Machine-translate (EN->ES) titles, ingredients and steps of the captured rows, offline.
Model: Helsinki-NLP/opus-mt-en-es (MarianMT, runs locally on CPU; no paid API).
Writes a raw MT cache (pre-processed English -> Spanish); build_seed.py applies post-fixes.
Usage: <venv>/python scripts/translate_seed.py /workspace/recipes/capture/rows.json /workspace/recipes/meta/es_cache.json
"""
import json, sys, os, re, time
sys.path.insert(0, os.path.dirname(__file__))
from seedlib import is_spanish, lines, strip_num, sentence_case, pre_mt

rows = json.load(open(sys.argv[1]))
cache_path = sys.argv[2]
cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}

todo = []
for r in rows:
    if is_spanish(" ".join([r.get("Title", ""), r.get("Ingredients", ""), r.get("Steps", ""), r.get("Caption Text", "")])):
        continue
    items = []
    if r.get("Title"):
        items.append(sentence_case(r["Title"]))
    items += lines(r.get("Ingredients", ""))
    items += [strip_num(x) for x in lines(r.get("Steps", ""))]
    for it in items:
        k = pre_mt(it)
        if k not in cache and k not in todo:
            todo.append(k)
print(f"{len(todo)} strings to translate ({len(cache)} cached)", flush=True)
if todo:
    sys.path.insert(0, "/workspace/recipes")
    from mt3 import translate_many
    t0 = time.time()
    for i in range(0, len(todo), 96):
        chunk = todo[i:i + 96]
        for src, out in zip(chunk, translate_many(chunk)):
            cache[src] = out
        json.dump(cache, open(cache_path, "w"), ensure_ascii=False, indent=0)
        print(f"{min(i+96, len(todo))}/{len(todo)} {time.time()-t0:.0f}s", flush=True)
print("done", len(cache))
