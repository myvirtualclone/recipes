import { useMemo, useState } from 'react';
import type { Lang } from '../lib/i18n';
import { fmtDate, reasonLabel, t } from '../lib/i18n';
import { findDuplicates, localize } from '../lib/recipe';
import type { Recipe } from '../types';
import { needsReview } from '../types';
import { Thumb } from './Thumb';

export interface ReviewItem {
  recipe: Recipe;
  reasons: string[];
  dupes: Recipe[];
}

interface Props {
  lang: Lang;
  items: ReviewItem[];
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onApprove: (r: Recipe) => void;
  onApproveMany: (rs: Recipe[]) => void;
  onArchive: (r: Recipe) => void;
  onDelete: (r: Recipe) => void;
  onMerge: (keep: Recipe, archive: Recipe) => void;
}

export function collectReview(all: Recipe[]): ReviewItem[] {
  const live = all.filter((r) => r.status !== 'archived');
  const dupeOf = new Map<string, Recipe[]>();
  for (const g of findDuplicates(all)) {
    for (const r of g.recipes) {
      dupeOf.set(r.id, g.recipes.filter((x) => x.id !== r.id));
    }
  }
  const items: ReviewItem[] = [];
  const seen = new Set<string>();
  for (const r of live) {
    if (!needsReview(r)) continue;
    seen.add(r.id);
    items.push({ recipe: r, reasons: [...(r.review_reasons ?? [])], dupes: dupeOf.get(r.id) ?? [] });
  }
  items.sort((a, b) => (b.recipe.captured_at ?? '').localeCompare(a.recipe.captured_at ?? ''));
  return items;
}

export function ReviewQueue({
  lang,
  items,
  onOpen,
  onEdit,
  onApprove,
  onApproveMany,
  onArchive,
  onDelete,
  onMerge,
}: Props) {
  const [mergeFor, setMergeFor] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const shown = items;
  const approvable = useMemo(() => shown.map((i) => i.recipe), [shown]);

  return (
    <div className="screen">
      <h2 className="screen-title">
        {t('reviewTitle', lang)} {shown.length > 0 && <i className="badge">{shown.length}</i>}
      </h2>
      <p className="muted small">{t('reviewSub', lang)}</p>
      {shown.length === 0 ? (
        <p className="muted center empty">✓ {t('reviewEmpty', lang)}</p>
      ) : (
        <>
          <div className="order-cards">
            {shown.map(({ recipe: r, reasons, dupes }) => {
              const L = localize(r, lang);
              const merging = mergeFor === r.id;
              const confirming = confirmId === r.id;
              return (
                <div key={r.id} className="order-card review-card">
                  <button type="button" className="review-main" onClick={() => onOpen(r.id)}>
                    <Thumb url={r.thumbnail_url} tags={r.ingredient_tags} alt={L.title} className="review-thumb" />
                    <div className="review-text">
                      <strong>
                        {L.title}
                        {r.is_substitute && <span className="sub-badge">{t('substituteBadge', lang)}</span>}
                      </strong>
                      <small className="muted">
                        {[r.code, r.author, r.collection, fmtDate(r.captured_at, lang)].filter(Boolean).join(' · ')}
                      </small>
                      {reasons.length > 0 && (
                        <div className="reason-row">
                          {reasons.map((reason) => (
                            <span key={reason} className="reason-chip">
                              {reasonLabel(reason, lang)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="btn-row wrap">
                    <button type="button" className="btn sm primary" onClick={() => onApprove(r)}>
                      ✓ {t('approveKeep', lang)}
                    </button>
                    <button type="button" className="btn sm" onClick={() => onEdit(r.id)}>
                      ✎ {t('edit', lang)}
                    </button>
                    {dupes.length > 0 && (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => setMergeFor(merging ? null : r.id)}
                      >
                        {t('mergeInto', lang)}
                      </button>
                    )}
                    <button type="button" className="btn sm ghost" onClick={() => onArchive(r)}>
                      {t('archive', lang)}
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost danger"
                      onClick={() => setConfirmId(confirming ? null : r.id)}
                    >
                      {t('deleteRecipe', lang)}
                    </button>
                  </div>
                  {merging && dupes.length > 0 && (
                    <div className="merge-box">
                      {dupes.map((d) => (
                        <button
                          type="button"
                          key={d.id}
                          className="btn sm full"
                          onClick={() => {
                            onMerge(d, r);
                            setMergeFor(null);
                          }}
                        >
                          {t('mergePick', lang)}: {localize(d, lang).title}
                        </button>
                      ))}
                    </div>
                  )}
                  {confirming && (
                    <div className="merge-box">
                      <p className="muted small">{t('deleteConfirm', lang, { t: L.title })}</p>
                      <div className="btn-row">
                        <button
                          type="button"
                          className="btn sm primary danger"
                          onClick={() => {
                            onDelete(r);
                            setConfirmId(null);
                          }}
                        >
                          {t('deleteRecipe', lang)}
                        </button>
                        <button type="button" className="btn sm" onClick={() => setConfirmId(null)}>
                          {t('cancel', lang)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {approvable.length > 1 && (
            <button type="button" className="btn primary full approve-all" onClick={() => onApproveMany(approvable)}>
              ✓ {t('approveAllClean', lang, { n: approvable.length })}
            </button>
          )}
        </>
      )}
    </div>
  );
}
