import type { Lang } from '../lib/i18n';
import { fmtDate, t } from '../lib/i18n';
import { localize } from '../lib/recipe';
import type { Recipe } from '../types';
import { hasMacros } from '../types';
import { Thumb } from './Thumb';

interface Props {
  lang: Lang;
  drafts: Recipe[];
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onSetStatus: (r: Recipe, s: Recipe['status']) => void;
  onApproveMany: (rs: Recipe[]) => void;
}

export function isClean(r: Recipe): boolean {
  return Boolean((r.title_en || r.title_es) && (r.ingredients_en.length || r.ingredients_es.length) && (r.steps_en.length || r.steps_es.length));
}

export function ReviewQueue({ lang, drafts, onOpen, onEdit, onSetStatus, onApproveMany }: Props) {
  const clean = drafts.filter(isClean);
  return (
    <div className="screen">
      <h2 className="screen-title">
        {t('reviewTitle', lang)} {drafts.length > 0 && <i className="badge">{drafts.length}</i>}
      </h2>
      <p className="muted small">{t('reviewSub', lang)}</p>
      {drafts.length === 0 ? (
        <p className="muted center empty">✓ {t('reviewEmpty', lang)}</p>
      ) : (
        <>
          <div className="order-cards">
            {drafts.map((r) => {
              const L = localize(r, lang);
              const ok = isClean(r);
              const es = Boolean(r.title_es && r.ingredients_es.length && r.steps_es.length);
              return (
                <div key={r.id} className="order-card review-card">
                  <button type="button" className="review-main" onClick={() => onOpen(r.id)}>
                    <Thumb url={r.thumbnail_url} alt={L.title} className="review-thumb" />
                    <div className="review-text">
                      <strong>{L.title}</strong>
                      <small className="muted">
                        {[r.author, r.collection, fmtDate(r.captured_at, lang)].filter(Boolean).join(' · ')}
                      </small>
                      <div className="check-list">
                        <span className={ok ? 'ok' : 'warn'}>
                          {ok ? '✓' : '⚠'} {ok ? t('chkRecipe', lang) : t('chkNoRecipe', lang)}
                        </span>
                        <span className={hasMacros(r) ? (r.macro_source === 'estimated' ? 'est' : 'ok') : 'warn'}>
                          {hasMacros(r)
                            ? r.macro_source === 'estimated'
                              ? t('chkMacrosEst', lang)
                              : `✓ ${t('chkMacrosPost', lang)}${r.calories != null ? ` · ${r.calories} ${t('cal', lang)}` : ''}`
                            : `⚠ ${t('chkNoMacros', lang)}`}
                        </span>
                        <span className={es ? 'ok' : 'warn'}>
                          {es ? '✓' : '⚠'} {es ? t('chkEs', lang) : t('chkNoEs', lang)}
                        </span>
                      </div>
                    </div>
                  </button>
                  <div className="btn-row">
                    <button type="button" className="btn sm primary" onClick={() => onSetStatus(r, 'approved')}>
                      ✓ {t('approve', lang)}
                    </button>
                    <button type="button" className="btn sm" onClick={() => onEdit(r.id)}>
                      ✎ {t('edit', lang)}
                    </button>
                    <button type="button" className="btn sm ghost" onClick={() => onSetStatus(r, 'archived')}>
                      {t('archive', lang)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {clean.length > 0 && (
            <button type="button" className="btn primary full approve-all" onClick={() => onApproveMany(clean)}>
              ✓ {t('approveAllClean', lang, { n: clean.length })}
            </button>
          )}
        </>
      )}
    </div>
  );
}
