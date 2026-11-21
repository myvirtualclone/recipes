import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';

export function CreatorChip({
  name,
  lang,
  count,
  on,
  onClick,
  className = '',
}: {
  name: string;
  lang: Lang;
  count?: number;
  on?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const label = `@${name}`;
  if (!onClick) {
    return (
      <span className={`creator-chip ${className}`.trim()} title={t('filterCreator', lang)}>
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`creator-chip ${on ? 'on' : ''} ${className}`.trim()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={on}
      title={t('filterCreator', lang)}
    >
      {label}
      {count != null && <i>{count}</i>}
    </button>
  );
}
