import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import { localize } from '../lib/recipe';
import type { Recipe } from '../types';
import { needsReview } from '../types';
import { MacroChips } from './Macros';
import { Thumb } from './Thumb';

export function RecipeCard({ r, lang, onOpen }: { r: Recipe; lang: Lang; onOpen: () => void }) {
  const L = localize(r, lang);
  const flag = needsReview(r);
  return (
    <div className={`recipe-card ${r.status === 'archived' ? 'archived' : ''}`}>
      <button type="button" className="recipe-card-main" onClick={onOpen}>
        <Thumb url={r.thumbnail_url} tags={r.ingredient_tags} alt={L.title} className="recipe-card-visual" />
        {flag && <span className="needs-dot" title={t('needsReview', lang)} aria-label={t('needsReview', lang)} />}
        <div className="recipe-card-body">
          <span className="recipe-card-title">{L.title}</span>
          <MacroChips r={r} lang={lang} />
        </div>
      </button>
      <div className="recipe-card-foot">
        {r.collection && (
          <span className={`coll-badge ${r.collection === 'Cooking - SL' ? 'sl' : ''}`}>
            {r.collection === 'Cooking - SL' ? 'SL' : 'Cooking'}
          </span>
        )}
        {r.is_substitute && <span className="sub-badge">{t('substituteBadge', lang)}</span>}
        {r.fb_url && (
          <a className="fb-mini" href={r.fb_url} target="_blank" rel="noopener noreferrer">
            FB ↗
          </a>
        )}
      </div>
    </div>
  );
}
