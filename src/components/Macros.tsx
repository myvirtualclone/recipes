import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import { fmtNum } from '../lib/recipe';
import type { Recipe } from '../types';
import { hasMacros } from '../types';

/** Compact chips for library cards: calories + protein, "est." when estimated. */
export function MacroChips({ r, lang }: { r: Recipe; lang: Lang }) {
  if (!hasMacros(r)) return <div className="macro-chips"><span className="macro-chip none">{t('noMacros', lang)}</span></div>;
  const est = r.macro_source === 'estimated';
  return (
    <div className="macro-chips">
      {r.calories != null && (
        <span className={`macro-chip cal ${est ? 'est' : ''}`}>
          {est && <i>{t('est', lang)} </i>}
          {fmtNum(r.calories)} {t('cal', lang)}
        </span>
      )}
      {r.protein_g != null && (
        <span className={`macro-chip pro ${est ? 'est' : ''}`}>
          {est && <i>{t('est', lang)} </i>}
          {fmtNum(r.protein_g)}g {t('proteinShort', lang)}
        </span>
      )}
    </div>
  );
}

export function basisLabel(r: Recipe, lang: Lang): string {
  return r.macro_basis ? t(`basis_${r.macro_basis}`, lang) : t('basis_unknown', lang);
}

/** Big 4-up macro tiles for the detail page. */
export function MacroTiles({ r, lang }: { r: Recipe; lang: Lang }) {
  if (!hasMacros(r)) {
    return (
      <div className="macro-empty">
        <strong>{t('noMacros', lang)}</strong>
        <span>{t('noMacrosLong', lang)}</span>
      </div>
    );
  }
  const est = r.macro_source === 'estimated';
  const tiles: { v: number | null; unit: string; label: string; cls: string }[] = [
    { v: r.calories, unit: '', label: t('calories', lang), cls: 'cal' },
    { v: r.protein_g, unit: 'g', label: t('protein', lang), cls: 'pro' },
    { v: r.carbs_g, unit: 'g', label: t('carbs', lang), cls: 'carb' },
    { v: r.fat_g, unit: 'g', label: t('fat', lang), cls: 'fat' },
  ];
  return (
    <div className="macro-block">
      <div className="macro-tiles">
        {tiles.map((x) => (
          <div key={x.cls} className={`macro-tile ${x.cls} ${est ? 'est' : ''}`}>
            <strong>
              {fmtNum(x.v)}
              {x.v != null && x.unit && <small>{x.unit}</small>}
            </strong>
            <span>{x.label}</span>
          </div>
        ))}
      </div>
      <div className="macro-basis">
        {t('basis', lang)}: {basisLabel(r, lang)}
        {r.servings ? ` · ${t('servings', lang)}: ${r.servings}` : ''}
        <span className={`source-pill ${est ? 'est' : 'post'}`}>
          {est ? t('estimated', lang) : t('fromPost', lang)}
        </span>
      </div>
    </div>
  );
}
