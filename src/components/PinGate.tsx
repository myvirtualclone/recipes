import { useState } from 'react';
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';

const PIN = (import.meta.env.VITE_PIN ?? '').trim();
const PIN_LEN = Math.max(4, PIN.length || 4);

interface Props {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onUnlock: () => void;
}

/** Same pattern and styles as Margory's PinGate (single PIN from VITE_PIN). */
export function PinGate({ lang, onLangChange, onUnlock }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function tryUnlock(candidate: string) {
    if (PIN && candidate === PIN) {
      setError(false);
      onUnlock();
      return true;
    }
    return false;
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!tryUnlock(pin)) {
      setError(true);
      setPin('');
    }
  }

  function tapDigit(d: string) {
    const next = (pin + d).slice(0, PIN_LEN);
    setPin(next);
    setError(false);
    if (next.length >= PIN_LEN) {
      if (!tryUnlock(next)) {
        setError(true);
        setTimeout(() => setPin(''), 200);
      }
    }
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
    setError(false);
  }

  return (
    <div className="pin-gate">
      <div className="pin-card">
        <div className="pin-logo">🍳</div>
        <div className="pin-lang-row">
          <h1>{t('appTitle', lang)}</h1>
          <button
            type="button"
            className="chip"
            onClick={() => onLangChange(lang === 'es' ? 'en' : 'es')}
            title={t('language', lang)}
          >
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
        <p className="pin-hint">{t('pinHint', lang)}</p>
        <form onSubmit={submit}>
          <div className={`pin-dots ${error ? 'error' : ''}`}>
            {Array.from({ length: PIN_LEN }).map((_, i) => (
              <span key={i} className={i < pin.length ? 'filled' : ''} />
            ))}
          </div>
          {error && <p className="pin-error">{t('pinWrong', lang)}</p>}
          <div className="pin-pad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) =>
              d === '' ? (
                <span key={i} className="pad-empty" />
              ) : d === '⌫' ? (
                <button type="button" key={i} className="pad-key" onClick={backspace} aria-label="Backspace">
                  ⌫
                </button>
              ) : (
                <button type="button" key={i} className="pad-key" onClick={() => tapDigit(d)}>
                  {d}
                </button>
              ),
            )}
          </div>
          <button type="submit" className="btn primary full">
            {t('unlock', lang)}
          </button>
        </form>
      </div>
    </div>
  );
}
