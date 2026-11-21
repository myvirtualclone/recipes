import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';

export function Star({ on, lang, onToggle, className = '' }: { on: boolean; lang: Lang; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      className={`star-btn ${on ? 'on' : ''} ${className}`}
      aria-pressed={on}
      aria-label={t(on ? 'removeFavorite' : 'addFavorite', lang)}
      title={t(on ? 'removeFavorite' : 'addFavorite', lang)}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
    >
      {on ? '★' : '☆'}
    </button>
  );
}
