"""Shared helpers for building the Recipe Box seed (used by build_seed.py and translate_seed.py)."""
import re

ES_WORDS = re.compile(r"\b(el|la|los|las|de|del|y|con|para|que|una?|en|por|es|esto|queda|tenés|tienes|receta|ingredientes|cucharadas?|taza)\b", re.I)
EN_WORDS = re.compile(r"\b(the|and|with|for|of|to|you|your|this|is|cup|tbsp|tsp|recipe|ingredients|until|add|mix)\b", re.I)


def is_spanish(text: str) -> bool:
    if not text:
        return False
    es = len(ES_WORDS.findall(text))
    en = len(EN_WORDS.findall(text))
    return es >= 3 and es > en * 1.5


def lines(s: str):
    return [l.strip() for l in (s or "").split("\n") if l.strip()]


def strip_num(s: str) -> str:
    return re.sub(r"^\s*(step\s*)?\d+\s*[.):-]\s*", "", s, flags=re.I)


def sentence_case(title: str) -> str:
    t = title.strip()
    if not t:
        return t
    words = t.split()
    caps = sum(1 for w in words if w[:1].isupper())
    if caps >= max(2, len(words) // 2) or t.isupper():
        t = t.lower()
        t = t[0].upper() + t[1:]
    return t


def pre_mt(s: str) -> str:
    """Normalise English before machine translation (fixes known MT confusions)."""
    s = s.replace("&amp;", "&")
    s = re.sub(r"\btbsps?\b|\btbs\b", "tablespoons", s, flags=re.I)
    s = re.sub(r"\btsps?\b", "teaspoons", s, flags=re.I)
    s = re.sub(r"\bair[- ]?fr(y|ied|ying)\b(?!er)", "cook in the air fryer", s, flags=re.I)
    s = re.sub(r"\bairfryer\b", "air fryer", s, flags=re.I)
    s = re.sub(r"\bcapsicum\b", "bell pepper", s, flags=re.I)
    s = re.sub(r"\bcourgettes?\b", "zucchini", s, flags=re.I)
    s = re.sub(r"\bprawns\b", "shrimp", s, flags=re.I)
    return s


FIXES = [
    (r"&amp;", "&"),
    (r"\b[Pp]ara (probar|saborear|degustar)\b", "al gusto"),
    (r"\bqueso (de cabaña|casero|cottage cheese)\b", "queso cottage"),
    (r"\brequesón\b", "queso cottage"),
    (r"\byogur griego (plano|llano|liso|simple)\b", "yogur griego natural"),
    (r"\b(pasteles|tortas|tortitas|bizcochos) de arroz\b", "galletas de arroz"),
    (r"\b(pastel|torta|tortita|bizcocho) de arroz\b", "galleta de arroz"),
    (r"\bpolvo de proteína\b", "proteína en polvo"),
    (r"\bpatatas? dulces?\b", "batata"),
    (r"\bdulce de patata\b", "de batata"),
    (r"\bpuré dulce de patata\b", "puré de batata"),
    (r"\bpatatas\b", "papas"),
    (r"\bpatata\b", "papa"),
    (r"\bPatatas\b", "Papas"),
    (r"\bPatata\b", "Papa"),
    (r"\bcacahuetes?\b", "maní"),
    (r"\bcacahuate\b", "maní"),
    (r"\bzumo\b", "jugo"),
    (r"\bnata\b", "crema de leche"),
    (r"\bgambas\b", "camarones"),
    (r"\bjudías\b", "fríjoles"),
    (r"\bmelocotón\b", "durazno"),
    (r"\bfrigorífico\b", "nevera"),
    (r"\b(beicon|bacón|tocino)\b", "tocineta"),
    (r"\b[Cc]lavos? (grandes )?de ajo\b", "dientes de ajo"),
    (r"\bpepitas\b", "nuggets"),
    (r"\b[Ll]lovizna\b", "Rocía"),
    (r"\b[Ll]lovizne\b", "Rocíe"),
    (r"\b[Ll]loviznar\b", "rociar"),
    (r"\bcapsicum\b", "pimentón"),
    (r"\b[Pp]imiento negro\b", "pimienta negra"),
    (r"\bpimienta negra (agrietada|craqueada|agrietado|craqueado|rajada)\b", "pimienta negra recién molida"),
    (r"\b[Zz]est de\b", "Ralladura de"),
    (r"\bcucharada sopera\b", "cucharada"),
    (r"\b1 cucharadas\b", "1 cucharada"),
    (r"\b1 cucharaditas\b", "1 cucharadita"),
    (r"\b1 tazas\b", "1 taza"),
    (r"\bcoger\b", "tomar"),
    (r"\bordenador\b", "computador"),
    (r"\bmiga(ja)?s de pan\b", "pan rallado"),
    (r"\bfreidora\b(?! de aire)", "freidora de aire"),
    (r"\bfreidora de aire de aire\b", "freidora de aire"),
    (r"\bmicroondas seguro\b", "apto para microondas"),
    (r"\bharina de todo uso\b", "harina común"),
    (r"\bharina de uso múltiple\b", "harina común"),
    (r"\b[Ss]ervir con\b", "Sirve con"),
    (r"\s+([,.;:!?])", r"\1"),
    (r"\s{2,}", " "),
]


def post_mt(s: str) -> str:
    for a, b in FIXES:
        s = re.sub(a, b, s)
    s = s.strip()
    return s[:1].upper() + s[1:] if s else s


def makes_line(src: str):
    m = re.match(r"^\s*(makes|serves|yields?)\s*:?\s*(.+)$", src, flags=re.I)
    if not m:
        return None
    word = {"makes": "Rinde", "serves": "Porciones:", "yield": "Rinde", "yields": "Rinde"}[m.group(1).lower()]
    return None if len(m.group(2)) > 25 else f"{word} {m.group(2)}"
