/**
 * Canonical Facebook post/reel id from any of the URL shapes we see in Saved:
 * /reel/<id>, /watch/?v=<id>, /<page>/videos/<id>, /<page>/posts/<id|pfbid…>,
 * permalink.php?story_fbid=<id>, photo?fbid=<id>, /share/r|v|p/<token>.
 * Returns null when nothing recognisable is found. Used as the dedupe key.
 */
export function extractFbPostId(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  if (/^\d{6,}$/.test(raw)) return raw;
  if (/^pfbid[0-9A-Za-z]+$/.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!/(^|\.)facebook\.com$|(^|\.)fb\.watch$|(^|\.)fb\.com$/.test(url.hostname)) return null;
  const p = url.pathname;
  const q = url.searchParams;
  const v = q.get('v');
  if (v && /^\d+$/.test(v)) return v;
  let m = p.match(/\/(?:reel|reels|videos|watch\/live)\/(?:[^/]+\/)?(\d{6,})/);
  if (m) return m[1];
  m = p.match(/\/posts\/(?:[^/]+\/)?(pfbid[0-9A-Za-z]+|\d{6,})/);
  if (m) return m[1];
  const story = q.get('story_fbid');
  if (story) return story;
  const fbid = q.get('fbid');
  if (fbid) return fbid;
  m = p.match(/\/share\/(?:r|v|p)\/([0-9A-Za-z]+)/);
  if (m) return `share:${m[1]}`;
  if (url.hostname.endsWith('fb.watch')) {
    const tok = p.replace(/\//g, '');
    if (tok) return `fbwatch:${tok}`;
  }
  return null;
}
