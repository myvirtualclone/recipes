export type Lang = 'en' | 'es';

const dict = {
  appTitle: { en: 'Recipe Box', es: 'Recetario' },
  pinHint: { en: 'Access PIN', es: 'PIN de acceso' },
  pinWrong: { en: 'Wrong PIN', es: 'PIN incorrecto' },
  unlock: { en: 'Unlock', es: 'Entrar' },
  lock: { en: 'Lock', es: 'Bloquear' },
  language: { en: 'Español', es: 'English' },

  tabLibrary: { en: 'Library', es: 'Recetas' },
  tabReview: { en: 'Review', es: 'Revisar' },
  tabDupes: { en: 'Duplicates', es: 'Duplicados' },
  tabLog: { en: 'Capture', es: 'Captura' },

  demoBanner: {
    en: 'Database not set up yet: showing sample recipes',
    es: 'Base de datos aún no configurada: mostrando recetas de ejemplo',
  },
  demoBannerSub: {
    en: 'Changes are saved on this device only.',
    es: 'Los cambios se guardan solo en este dispositivo.',
  },
  loadError: { en: 'Could not load recipes', es: 'No se pudieron cargar las recetas' },
  loading: { en: 'Loading…', es: 'Cargando…' },
  retry: { en: 'Retry', es: 'Reintentar' },

  search: { en: 'Search recipes, ingredients, authors…', es: 'Buscar recetas, ingredientes, autores…' },
  filters: { en: 'Filters', es: 'Filtros' },
  sort: { en: 'Sort', es: 'Ordenar' },
  sort_newest: { en: 'Newest saved', es: 'Guardadas recientemente' },
  sort_oldest: { en: 'Oldest saved', es: 'Guardadas hace más tiempo' },
  sort_protein: { en: 'Most protein', es: 'Más proteína' },
  sort_calories: { en: 'Fewest calories', es: 'Menos calorías' },
  sort_title: { en: 'Title A–Z', es: 'Título A–Z' },
  all: { en: 'All', es: 'Todas' },
  collection: { en: 'Collection', es: 'Colección' },
  tags: { en: 'Tags', es: 'Etiquetas' },
  proteinRange: { en: 'Protein (g)', es: 'Proteína (g)' },
  caloriesRange: { en: 'Calories', es: 'Calorías' },
  min: { en: 'Min', es: 'Mín.' },
  max: { en: 'Max', es: 'Máx.' },
  postedMacrosOnly: { en: 'Macros from the post only', es: 'Solo macros del post' },
  showArchived: { en: 'Include archived', es: 'Incluir archivadas' },
  clearFilters: { en: 'Clear', es: 'Limpiar' },
  showResults: { en: 'Show {n} recipes', es: 'Ver {n} recetas' },
  showResult1: { en: 'Show 1 recipe', es: 'Ver 1 receta' },
  recipesCount: { en: '{n} recipes', es: '{n} recetas' },
  recipesCount1: { en: '1 recipe', es: '1 receta' },
  noResults: { en: 'No recipes match these filters.', es: 'Ninguna receta coincide con estos filtros.' },
  emptyLibrary: { en: 'No recipes yet.', es: 'Aún no hay recetas.' },
  addRecipe: { en: '+ Add', es: '+ Agregar' },
  close: { en: 'Close', es: 'Cerrar' },

  cal: { en: 'cal', es: 'cal' },
  calories: { en: 'calories', es: 'calorías' },
  protein: { en: 'protein', es: 'proteína' },
  carbs: { en: 'carbs', es: 'carbohidratos' },
  fat: { en: 'fat', es: 'grasa' },
  proteinShort: { en: 'P', es: 'P' },
  est: { en: 'est.', es: 'est.' },
  noMacros: { en: 'No macros', es: 'Sin macros' },
  noMacrosLong: {
    en: 'The post did not state macros. Add them in Edit (mark as estimated if you calculate them).',
    es: 'El post no indicó macros. Agrégalos en Editar (márcalos como estimados si los calculas).',
  },
  fromPost: { en: 'from post', es: 'del post' },
  estimated: { en: 'estimated', es: 'estimado' },
  basis: { en: 'Basis', es: 'Base' },
  basis_per_serving: { en: 'per serving', es: 'por porción' },
  basis_per_item: { en: 'per item', es: 'por unidad' },
  basis_total: { en: 'whole recipe', es: 'receta completa' },
  basis_unknown: { en: 'basis not stated', es: 'base no indicada' },

  openOnFb: { en: 'Open original on Facebook', es: 'Abrir original en Facebook' },
  back: { en: '← Back', es: '← Volver' },
  by: { en: 'by', es: 'por' },
  saved: { en: 'saved', es: 'guardada' },
  posted: { en: 'posted', es: 'publicada' },
  ingredients: { en: 'Ingredients', es: 'Ingredientes' },
  steps: { en: 'Steps', es: 'Preparación' },
  caption: { en: 'Original caption', es: 'Texto original del post' },
  notes: { en: 'Notes', es: 'Notas' },
  servings: { en: 'Servings', es: 'Porciones' },
  prepTime: { en: 'Prep', es: 'Preparación' },
  cookTime: { en: 'Cook', es: 'Cocción' },
  cuisine: { en: 'Cuisine', es: 'Cocina' },
  mealType: { en: 'Meal', es: 'Tipo' },
  notTranslated: { en: 'not translated', es: 'sin traducir' },
  autoTranslated: { en: 'auto-translated, not reviewed', es: 'traducción automática, sin revisar' },
  nothingHere: { en: 'Nothing listed yet.', es: 'Aún no hay nada.' },
  edit: { en: 'Edit', es: 'Editar' },
  archive: { en: 'Archive', es: 'Archivar' },
  unarchive: { en: 'Restore', es: 'Restaurar' },
  approve: { en: 'Approve', es: 'Aprobar' },
  notFound: { en: 'Recipe not found.', es: 'Receta no encontrada.' },

  status: { en: 'Status', es: 'Estado' },
  status_draft: { en: 'Draft', es: 'Borrador' },
  status_approved: { en: 'Approved', es: 'Aprobada' },
  status_archived: { en: 'Archived', es: 'Archivada' },

  reviewTitle: { en: 'Review queue', es: 'Por revisar' },
  reviewSub: {
    en: 'New captures land here as drafts. Check them before they join the library.',
    es: 'Las capturas nuevas llegan aquí como borradores. Revísalas antes de pasarlas a tus recetas.',
  },
  reviewEmpty: { en: 'Nothing to review. All caught up!', es: 'Nada por revisar. ¡Todo al día!' },
  approveAllClean: { en: 'Approve all clean ({n})', es: 'Aprobar las completas ({n})' },
  chkRecipe: { en: 'ingredients + steps', es: 'ingredientes + pasos' },
  chkNoRecipe: { en: 'missing ingredients or steps', es: 'faltan ingredientes o pasos' },
  chkMacrosPost: { en: 'macros from post', es: 'macros del post' },
  chkMacrosEst: { en: 'macros est.', es: 'macros est.' },
  chkNoMacros: { en: 'no macros', es: 'sin macros' },
  chkEs: { en: 'Spanish ready', es: 'español listo' },
  chkNoEs: { en: 'no Spanish yet', es: 'sin español' },

  editTitle: { en: 'Edit recipe', es: 'Editar receta' },
  newTitle: { en: 'New recipe', es: 'Nueva receta' },
  english: { en: 'English', es: 'Inglés' },
  spanish: { en: 'Spanish', es: 'Español' },
  title: { en: 'Title', es: 'Título' },
  onePerLine: { en: 'one per line', es: 'uno por línea' },
  macros: { en: 'Macros', es: 'Macros' },
  macroSource: { en: 'Source', es: 'Origen' },
  source_none: { en: 'none', es: 'ninguno' },
  basisPick: { en: 'Basis', es: 'Base' },
  fbUrl: { en: 'Facebook URL', es: 'URL de Facebook' },
  fbPostId: { en: 'Post ID', es: 'ID del post' },
  fbIdNotFound: { en: 'No post ID found in this URL', es: 'No se encontró un ID de post en esta URL' },
  thumbUrl: { en: 'Thumbnail URL', es: 'URL de la miniatura' },
  author: { en: 'Author', es: 'Autor' },
  code: { en: 'Code', es: 'Código' },
  tagsHint: { en: 'comma separated', es: 'separadas por comas' },
  esReviewed: { en: 'Spanish reviewed', es: 'Español revisado' },
  save: { en: 'Save', es: 'Guardar' },
  cancel: { en: 'Cancel', es: 'Cancelar' },
  saved_ok: { en: 'Saved', es: 'Guardado' },
  saveFailed: { en: 'Could not save', es: 'No se pudo guardar' },
  dupeOnSave: {
    en: 'This Facebook post is already saved as “{t}”.',
    es: 'Este post de Facebook ya está guardado como “{t}”.',
  },
  openExisting: { en: 'Open it', es: 'Abrirla' },
  titleRequired: { en: 'Add a title in English or Spanish.', es: 'Agrega un título en inglés o español.' },

  dupesTitle: { en: 'Possible duplicates', es: 'Posibles duplicados' },
  dupesSub: {
    en: 'Grouped by the same Facebook post ID or near-identical titles. Keep one, archive the rest.',
    es: 'Agrupadas por el mismo ID de post de Facebook o títulos casi iguales. Conserva una y archiva las demás.',
  },
  dupesEmpty: { en: 'No duplicates found.', es: 'No se encontraron duplicados.' },
  sameFbId: { en: 'Same Facebook post', es: 'Mismo post de Facebook' },
  similarTitle: { en: 'Similar titles', es: 'Títulos parecidos' },
  keepThis: { en: 'Keep this, archive others', es: 'Conservar esta, archivar las demás' },

  logTitle: { en: 'Capture log', es: 'Registro de capturas' },
  logSub: {
    en: 'Each read-only run over your Facebook Saved collections.',
    es: 'Cada lectura (solo lectura) de tus colecciones guardadas en Facebook.',
  },
  logEmpty: { en: 'No capture runs logged yet.', es: 'Aún no hay capturas registradas.' },
  found: { en: 'found', es: 'encontradas' },
  newCount: { en: 'new', es: 'nuevas' },
  dupCount: { en: 'duplicates', es: 'duplicadas' },
  failedCount: { en: 'failed', es: 'fallidas' },
  running: { en: 'running', es: 'en curso' },
} as const;

export type Key = keyof typeof dict;

export function t(key: Key, lang: Lang, vars?: Record<string, string | number>): string {
  let s: string = dict[key][lang] ?? dict[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Display labels for common tags (data stays in English, lower-case). */
const TAG_ES: Record<string, string> = {
  'high-protein': 'alta en proteína',
  keto: 'keto',
  'sugar-free': 'sin azúcar',
  'low carb': 'baja en carbohidratos',
  'low-carb': 'baja en carbohidratos',
  dessert: 'postre',
  breakfast: 'desayuno',
  christmas: 'navidad',
  cheese: 'queso',
  'baked camembert': 'camembert horneado',
  'cloud bread': 'pan nube',
  pizza: 'pizza',
  'air fryer': 'freidora de aire',
  chicken: 'pollo',
};

export function tagLabel(tag: string, lang: Lang): string {
  return lang === 'es' ? (TAG_ES[tag.toLowerCase()] ?? tag) : tag;
}

export function fmtDate(iso: string | null, lang: Lang): string {
  if (!iso) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function fmtDateTime(iso: string | null, lang: Lang): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === 'es' ? 'es-CO' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
