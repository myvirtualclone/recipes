import { useMemo, useState } from 'react';
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import { extractFbPostId } from '../lib/fb';
import { localize } from '../lib/recipe';
import type { Collection, MacroBasis, MacroSource, Recipe, RecipeStatus } from '../types';
import { COLLECTIONS, MACRO_BASES } from '../types';
import { Thumb } from './Thumb';
import { TagEditor } from './TagEditor';
import weakTitles from '../lib/weakTitles.json';

interface Props {
  lang: Lang;
  recipe: Recipe;
  isNew: boolean;
  all: Recipe[];
  onCancel: () => void;
  onSave: (r: Recipe) => Promise<void>;
  onOpen: (id: string) => void;
}

const toLines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));

export function EditForm({ lang, recipe, isNew, all, onCancel, onSave, onOpen }: Props) {
  const [r, setR] = useState<Recipe>(recipe);
  const [ingEn, setIngEn] = useState(recipe.ingredients_en.join('\n'));
  const [ingEs, setIngEs] = useState(recipe.ingredients_es.join('\n'));
  const [stEn, setStEn] = useState(recipe.steps_en.join('\n'));
  const [stEs, setStEs] = useState(recipe.steps_es.join('\n'));
  const [tags, setTags] = useState(recipe.tags.join(', '));
  const [macros, setMacros] = useState({
    calories: recipe.calories?.toString() ?? '',
    protein_g: recipe.protein_g?.toString() ?? '',
    carbs_g: recipe.carbs_g?.toString() ?? '',
    fat_g: recipe.fat_g?.toString() ?? '',
  });
  const [ingTags, setIngTags] = useState<string[]>(recipe.ingredient_tags);
  const [eqTags, setEqTags] = useState<string[]>(recipe.equipment_tags);
  const knownIng = useMemo(() => [...new Set(all.flatMap((x) => x.ingredient_tags))], [all]);
  const knownEq = useMemo(() => [...new Set(all.flatMap((x) => x.equipment_tags))], [all]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Recipe>) => setR((x) => ({ ...x, ...patch }));

  const fbId = useMemo(() => extractFbPostId(r.fb_url), [r.fb_url]);
  const clash = useMemo(
    () => (fbId ? all.find((x) => x.id !== r.id && x.fb_post_id === fbId) : undefined),
    [all, fbId, r.id],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!r.title_en?.trim() && !r.title_es?.trim()) {
      setError(t('titleRequired', lang));
      return;
    }
    if (clash) return;
    const anyMacro = Object.values(macros).some((v) => v.trim() !== '');
    const out: Recipe = {
      ...r,
      title_en: r.title_en?.trim() || null,
      title_es: r.title_es?.trim() || null,
      ingredients_en: toLines(ingEn),
      ingredients_es: toLines(ingEs),
      steps_en: toLines(stEn).map((s) => s.replace(/^\d+[.)]\s*/, '')),
      steps_es: toLines(stEs).map((s) => s.replace(/^\d+[.)]\s*/, '')),
      tags: tags
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
      ingredient_tags: ingTags,
      equipment_tags: eqTags,
      fb_post_id: fbId ?? r.fb_post_id ?? null,
      calories: numOrNull(macros.calories),
      protein_g: numOrNull(macros.protein_g),
      carbs_g: numOrNull(macros.carbs_g),
      fat_g: numOrNull(macros.fat_g),
      macro_source: anyMacro ? (r.macro_source ?? 'estimated') : null,
    };
    setSaving(true);
    try {
      await onSave(out);
    } catch (err) {
      setError(`${t('saveFailed', lang)}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="edit-form" onSubmit={submit}>
      <div className="detail-top">
        <button type="button" className="back-link" onClick={onCancel}>
          {t('back', lang)}
        </button>
      </div>
      <h2 className="screen-title">{isNew ? t('newTitle', lang) : t('editTitle', lang)}</h2>

      <div className="bi-head">
        <span>🇺🇸 {t('english', lang)}</span>
        <span>🇨🇴 {t('spanish', lang)}</span>
      </div>
      <Field label={t('title', lang)}>
        {(() => {
          const sug = r.code ? (weakTitles as Record<string, string>)[r.code] : '';
          return sug && sug !== r.title_en ? (
            <p className="suggest-title small">
              {t('suggestedTitle', lang)}: <strong>{sug}</strong>{' '}
              <button type="button" className="btn sm" onClick={() => set({ title_en: sug })}>
                {t('useSuggestion', lang)}
              </button>
            </p>
          ) : null;
        })()}
        <div className="bi-grid">
          <input value={r.title_en ?? ''} onChange={(e) => set({ title_en: e.target.value })} lang="en" aria-label={`${t('title', lang)} EN`} />
          <input value={r.title_es ?? ''} onChange={(e) => set({ title_es: e.target.value })} lang="es" aria-label={`${t('title', lang)} ES`} />
        </div>
      </Field>
      <Field label={`${t('ingredients', lang)} (${t('onePerLine', lang)})`}>
        <div className="bi-grid">
          <textarea rows={7} value={ingEn} onChange={(e) => setIngEn(e.target.value)} lang="en" aria-label={`${t('ingredients', lang)} EN`} />
          <textarea rows={7} value={ingEs} onChange={(e) => setIngEs(e.target.value)} lang="es" aria-label={`${t('ingredients', lang)} ES`} />
        </div>
      </Field>
      <Field label={`${t('steps', lang)} (${t('onePerLine', lang)})`}>
        <div className="bi-grid">
          <textarea rows={8} value={stEn} onChange={(e) => setStEn(e.target.value)} lang="en" aria-label={`${t('steps', lang)} EN`} />
          <textarea rows={8} value={stEs} onChange={(e) => setStEs(e.target.value)} lang="es" aria-label={`${t('steps', lang)} ES`} />
        </div>
      </Field>
      <label className="check-row">
        <input type="checkbox" checked={r.es_reviewed} onChange={(e) => set({ es_reviewed: e.target.checked })} />
        {t('esReviewed', lang)}
      </label>

      <Field label={t('macros', lang)}>
        <div className="macro-inputs">
          {(
            [
              ['calories', t('calories', lang)],
              ['protein_g', `${t('protein', lang)} (g)`],
              ['carbs_g', `${t('carbs', lang)} (g)`],
              ['fat_g', `${t('fat', lang)} (g)`],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="mini-field">
              <span>{label}</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={macros[k]}
                onChange={(e) => setMacros((m) => ({ ...m, [k]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="two-col">
          <label className="mini-field">
            <span>{t('basisPick', lang)}</span>
            <select value={r.macro_basis ?? ''} onChange={(e) => set({ macro_basis: (e.target.value || null) as MacroBasis | null })}>
              <option value="">{t('basis_unknown', lang)}</option>
              {MACRO_BASES.map((b) => (
                <option key={b} value={b}>
                  {t(`basis_${b}`, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="mini-field">
            <span>{t('macroSource', lang)}</span>
            <select value={r.macro_source ?? ''} onChange={(e) => set({ macro_source: (e.target.value || null) as MacroSource | null })}>
              <option value="">{t('source_none', lang)}</option>
              <option value="post">{t('fromPost', lang)}</option>
              <option value="estimated">{t('estimated', lang)}</option>
            </select>
          </label>
        </div>
        <label className="mini-field">
          <span>{t('servings', lang)}</span>
          <input value={r.servings ?? ''} onChange={(e) => set({ servings: e.target.value || null })} />
        </label>
      </Field>

      <div className="two-col">
        <label className="mini-field">
          <span>{t('collection', lang)}</span>
          <select value={r.collection ?? ''} onChange={(e) => set({ collection: (e.target.value || null) as Collection | null })}>
            {COLLECTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="mini-field">
          <span>{t('status', lang)}</span>
          <select value={r.status} onChange={(e) => set({ status: e.target.value as RecipeStatus })}>
            {(['draft', 'approved', 'archived'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`status_${s}`, lang)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Field label={t('keyIngredients', lang)} heading>
        <TagEditor lang={lang} kind="ingredient" value={ingTags} onChange={setIngTags} known={knownIng} />
      </Field>
      <Field label={t('equipmentMethod', lang)} heading>
        <TagEditor lang={lang} kind="equipment" value={eqTags} onChange={setEqTags} known={knownEq} />
      </Field>
      <label className="mini-field">
        <span>
          {t('tags', lang)} ({t('tagsHint', lang)})
        </span>
        <input value={tags} onChange={(e) => setTags(e.target.value)} />
      </label>

      <label className="mini-field">
        <span>{t('fbUrl', lang)}</span>
        <input type="url" value={r.fb_url ?? ''} onChange={(e) => set({ fb_url: e.target.value || null })} />
      </label>
      <p className="muted small fb-id-line">
        {t('fbPostId', lang)}: {fbId ?? (r.fb_url ? t('fbIdNotFound', lang) : '—')}
      </p>
      {clash && (
        <div className="form-error">
          {t('dupeOnSave', lang, { t: localize(clash, lang).title })}{' '}
          <button type="button" className="linkish" onClick={() => onOpen(clash.id)}>
            {t('openExisting', lang)}
          </button>
        </div>
      )}

      <div className="thumb-field">
        <Thumb url={r.thumbnail_url} alt="" className="review-thumb" />
        <label className="mini-field grow">
          <span>{t('thumbUrl', lang)}</span>
          <input value={r.thumbnail_url ?? ''} onChange={(e) => set({ thumbnail_url: e.target.value || null })} />
        </label>
      </div>

      <div className="two-col">
        <label className="mini-field">
          <span>{t('author', lang)}</span>
          <input value={r.author ?? ''} onChange={(e) => set({ author: e.target.value || null })} />
        </label>
        <label className="mini-field">
          <span>{t('code', lang)}</span>
          <input value={r.code ?? ''} onChange={(e) => set({ code: e.target.value || null })} />
        </label>
      </div>
      <label className="mini-field">
        <span>{t('notes', lang)}</span>
        <textarea rows={3} value={r.notes ?? ''} onChange={(e) => set({ notes: e.target.value || null })} />
      </label>
      <label className="mini-field">
        <span>{t('caption', lang)}</span>
        <textarea rows={4} value={r.caption ?? ''} onChange={(e) => set({ caption: e.target.value || null })} />
      </label>

      {error && <div className="form-error">{error}</div>}
      <div className="edit-foot">
        <button type="button" className="btn" onClick={onCancel}>
          {t('cancel', lang)}
        </button>
        <button type="submit" className="btn primary" disabled={saving || Boolean(clash)}>
          {saving ? '…' : t('save', lang)}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, heading }: { label: string; children: React.ReactNode; heading?: boolean }) {
  return (
    <fieldset className={`field${heading ? ' tag-field' : ''}`}>
      <legend className={heading ? 'tag-heading' : undefined}>{label}</legend>
      {children}
    </fieldset>
  );
}
