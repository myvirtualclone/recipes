import { useState } from 'react';
import { thumbSrc } from '../lib/recipe';

export function Thumb({ url, alt, className }: { url: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = thumbSrc(url);
  return (
    <div className={`thumb ${className ?? ''}`}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="thumb-emoji" aria-hidden>
          🍽️
        </span>
      )}
    </div>
  );
}
