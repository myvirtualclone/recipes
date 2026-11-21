import type { Lang } from '../lib/i18n';
import { fmtDate, sourceTypeLabel, t, tagLabel } from '../lib/i18n';
import { displayIngredientKeys, localize } from '../lib/recipe';
import type { Recipe } from '../types';
import { needsReview } from '../types';
import { MacroTiles } from './Macros';
import { Thumb } from './Thumb';
import { TagLinks } from './TagChips';
import type { TagKind } from '../lib/tags';

interface Props {
  r: Recipe;
  lang: Lang;
  onBack: () => void;
  onEdit: () => void;
  onTag: (tag: string) => void;
  onKindTag: (kind: TagKind, key: string) => void;
  onSetStatus: (s: Recipe['status']) => void;
}

function NotTranslated({ show, lang }: { show: boolean; lang: Lang }) {
  return show ? <span className="nt-badge">{t('notTranslated', lang)}</span> : null;
}

export function RecipeDetail({ r, lang, onBack, onEdit, onTag, onKindTag, onSetStatus }: Props) {
  const L = localize(r, lang);
  const showAuto = lang === 'es' && !r.es_reviewed && !L.titleFallback && Boolean(r.title_es);
  const meta: [string, string | null][] = [
    [t('servings', lang), r.servings],
    [t('prepTime', lang), r.prep_time],
    [t('cookTime', lang), r.cook_time],
    [t('cuisine', lang), r.cuisine],
    [t('mealType', lang), r.meal_type],
  ];
  return (
    <div className="detail">
      <div className="detail-top">
        <button type="button" className="back-link" onClick={onBack}>
          {t('back', lang)}
        </button>
        <div className="detail-actions">
          <button type="button" className="btn sm" onClick={onEdit}>
            ✎ {t('edit', lang)}
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-media">
          <Thumb url={r.thumbnail_url} alt={L.title} className="detail-thumb" tags={r.ingredient_tags} />
          {r.fb_url && (
            <a className="btn primary full fb-btn" href={r.fb_url} target="_blank" rel="noopener noreferrer">
              ▶ {t('openOnFb', lang)} ↗
            </a>
          )}
        </div>

        <div className="detail-main">
          <div className="status-row tight">
            {r.collection && (
              <span className={`coll-badge ${r.collection === 'Cooking - SL' ? 'sl' : ''}`}>{r.collection}</span>
            )}
            {r.status !== 'approved' && <span className={`status-pill ${r.status}`}>{t(`status_${r.status}`, lang)}</span>}
            {r.is_substitute && <span className="sub-badge">{t('substituteBadge', lang)}</span>}
            {needsReview(r) && <span className="reason-chip">{t('needsReview', lang)}</span>}
            {r.code && <span className="muted small">{r.code}</span>}
          </div>
          <h2 className="detail-title">
            {L.title} <NotTranslated show={L.titleFallback} lang={lang} />
          </h2>
          <p className="muted small detail-byline">
            {r.author && (
              <>
                {t('by', lang)} {r.author}
              </>
            )}
            {r.post_date && ` · ${t('posted', lang)} ${fmtDate(r.post_date, lang)}`}
            {r.captured_at && ` · ${t('saved', lang)} ${fmtDate(r.captured_at, lang)}`}
          </p>
          {r.source_type && (
            <p className="muted small source-line">
              {t('sourceLabel', lang)}: {sourceTypeLabel(r.source_type, lang)}
            </p>
          )}
          {showAuto && <p className="auto-hint">{t('autoTranslated', lang)}</p>}

          <MacroTiles r={r} lang={lang} />

          {meta.some(([, v]) => v) && (
            <dl className="meta-list">
              {meta
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
          )}
        </div>
      </div>

      <section className="category detail-section">
        <h3>
          {t('ingredients', lang)} <NotTranslated show={L.ingredientsFallback} lang={lang} />
        </h3>
        {L.ingredients.length ? (
          <ul className="ing-list">
            {L.ingredients.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('nothingHere', lang)}</p>
        )}
      </section>

      <section className="category detail-section">
        <h3>
          {t('steps', lang)} <NotTranslated show={L.stepsFallback} lang={lang} />
        </h3>
        {L.steps.length ? (
          <ol className="step-list">
            {L.steps.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">{t('nothingHere', lang)}</p>
        )}
      </section>

      {(r.ingredient_tags.length > 0 || r.equipment_tags.length > 0 || r.tags.length > 0) && (
        <section className="category detail-section tag-section">
          {r.ingredient_tags.length > 0 && (
            <>
              <h3 className="tag-heading">{t('keyIngredients', lang)}</h3>
              <TagLinks lang={lang} kind="ingredient" keys={displayIngredientKeys(r)} onTap={(k) => onKindTag('ingredient', k)} />
            </>
          )}
          {r.equipment_tags.length > 0 && (
            <>
              <h3 className="tag-heading">{t('equipmentMethod', lang)}</h3>
              <TagLinks lang={lang} kind="equipment" keys={r.equipment_tags} onTap={(k) => onKindTag('equipment', k)} />
            </>
          )}
          {r.tags.length > 0 && (
            <>
              <h3 className="tag-heading">{t('generalTags', lang)}</h3>
              <div className="tag-row">
                {r.tags.map((tg) => (
                  <button type="button" key={tg} className="tag-chip" onClick={() => onTag(tg)}>
                    #{tagLabel(tg, lang)}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {r.notes && (
        <section className="category detail-section">
          <h3>{t('notes', lang)}</h3>
          <p className="notes-text">{r.notes}</p>
        </section>
      )}

      {r.caption && (
        <details className="category detail-section caption-box">
          <summary>{t('caption', lang)}</summary>
          <p className="notes-text">{r.caption}</p>
        </details>
      )}

      <div className="btn-row detail-foot">
        {r.status === 'draft' && (
          <button type="button" className="btn primary" onClick={() => onSetStatus('approved')}>
            ✓ {t('approve', lang)}
          </button>
        )}
        {r.status === 'archived' ? (
          <button type="button" className="btn" onClick={() => onSetStatus('approved')}>
            {t('unarchive', lang)}
          </button>
        ) : (
          <button type="button" className="btn ghost" onClick={() => onSetStatus('archived')}>
            {t('archive', lang)}
          </button>
        )}
      </div>
    </div>
  );
}
