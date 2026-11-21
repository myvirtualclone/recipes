import type { Lang } from '../lib/i18n';
import { fmtDate, t } from '../lib/i18n';
import type { DupeGroup } from '../lib/recipe';
import { localize } from '../lib/recipe';
import type { Recipe } from '../types';
import { Thumb } from './Thumb';

interface Props {
  lang: Lang;
  groups: DupeGroup[];
  onOpen: (id: string) => void;
  onKeep: (keep: Recipe, archive: Recipe[]) => void;
}

export function Duplicates({ lang, groups, onOpen, onKeep }: Props) {
  return (
    <div className="screen">
      <h2 className="screen-title">{t('dupesTitle', lang)}</h2>
      <p className="muted small">{t('dupesSub', lang)}</p>
      {groups.length === 0 ? (
        <p className="muted center empty">✓ {t('dupesEmpty', lang)}</p>
      ) : (
        groups.map((g) => (
          <div key={`${g.kind}-${g.key}`} className="category dupe-group">
            <div className="category-head static">
              <span>{g.kind === 'fb' ? t('sameFbId', lang) : t('similarTitle', lang)}</span>
              <span className="cat-meta">{g.kind === 'fb' ? g.key : `${g.recipes.length}×`}</span>
            </div>
            {g.recipes.map((r) => {
              const L = localize(r, lang);
              return (
                <div key={r.id} className="dupe-row">
                  <button type="button" className="review-main" onClick={() => onOpen(r.id)}>
                    <Thumb url={r.thumbnail_url} alt={L.title} className="review-thumb" />
                    <div className="review-text">
                      <strong>{L.title}</strong>
                      <small className="muted">
                        {[r.code, r.author, t(`status_${r.status}`, lang), fmtDate(r.captured_at, lang)]
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => onKeep(r, g.recipes.filter((x) => x.id !== r.id))}
                  >
                    {t('keepThis', lang)}
                  </button>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
