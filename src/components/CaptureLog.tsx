import type { Lang } from '../lib/i18n';
import { fmtDateTime, t } from '../lib/i18n';
import type { CaptureLogEntry } from '../types';

export function CaptureLog({ lang, entries }: { lang: Lang; entries: CaptureLogEntry[] }) {
  return (
    <div className="screen">
      <h2 className="screen-title">{t('logTitle', lang)}</h2>
      <p className="muted small">{t('logSub', lang)}</p>
      {entries.length === 0 ? (
        <p className="muted center empty">{t('logEmpty', lang)}</p>
      ) : (
        <div className="order-cards">
          {entries.map((e) => (
            <div key={e.id} className="order-card">
              <div className="oc-top">
                <strong>{fmtDateTime(e.started_at, lang)}</strong>
                <span className="status-pill sent">{e.collection ?? '—'}</span>
              </div>
              <div className="log-stats">
                <span>
                  <b>{e.found}</b> {t('found', lang)}
                </span>
                <span className="ok">
                  <b>{e.new_count}</b> {t('newCount', lang)}
                </span>
                <span>
                  <b>{e.duplicate_count}</b> {t('dupCount', lang)}
                </span>
                <span className={e.failed_count ? 'warn' : ''}>
                  <b>{e.failed_count}</b> {t('failedCount', lang)}
                </span>
              </div>
              {!e.finished_at && <small className="muted">{t('running', lang)}…</small>}
              {e.notes && <small className="muted">{e.notes}</small>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
