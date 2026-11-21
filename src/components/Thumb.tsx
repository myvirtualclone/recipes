import { useState } from 'react';
import { thumbSrc } from '../lib/recipe';
import { dishEmoji } from '../lib/tags';

export function Thumb({ url, alt, className, tags }: { url: string | null; alt: string; className?: string; tags?: string[] }) {
  const [failed, setFailed] = useState(false);
  const src = thumbSrc(url);
  return (
    <div className={`thumb ${className ?? ''} ${src && !failed ? '' : 'placeholder'}`}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="thumb-emoji" aria-hidden>
          {dishEmoji(tags ?? [])}
        </span>
      )}
    </div>
  );
}
