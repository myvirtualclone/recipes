import { useCallback, useEffect, useMemo, useState } from 'react';
import { APP_VERSION } from './version';
import type { Lang } from './lib/i18n';
import { t } from './lib/i18n';
import { loadLang, loadUnlocked, saveLang, saveUnlocked } from './lib/storage';
import type { DataMode } from './lib/api';
import { deleteRecipe, detectMode, listCaptureLog, listRecipes, saveRecipe } from './lib/api';
import type { Filters } from './lib/recipe';
import { EMPTY_FILTERS } from './lib/recipe';
import { extractFbPostId } from './lib/fb';
import type { CaptureLogEntry, Recipe } from './types';
import { emptyRecipe } from './types';
import { PinGate } from './components/PinGate';
import { Library } from './components/Library';
import { RecipeDetail } from './components/RecipeDetail';
import { collectReview, ReviewQueue } from './components/ReviewQueue';
import { EditForm } from './components/EditForm';
import { IngredientIndex } from './components/IngredientIndex';
import { CaptureLog } from './components/CaptureLog';
import './App.css';

type Route =
  | { name: 'library' }
  | { name: 'detail'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'new' }
  | { name: 'review' }
  | { name: 'ingredients' }
  | { name: 'log' };

function parseHash(hash: string): Route {
  const p = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (p[0] === 'r' && p[1] && p[2] === 'edit') return { name: 'edit', id: decodeURIComponent(p[1]) };
  if (p[0] === 'r' && p[1]) return { name: 'detail', id: decodeURIComponent(p[1]) };
  if (p[0] === 'new') return { name: 'new' };
  if (p[0] === 'review' || p[0] === 'dupes') return { name: 'review' };
  if (p[0] === 'ingredients') return { name: 'ingredients' };
  if (p[0] === 'log') return { name: 'log' };
  return { name: 'library' };
}

function go(path: string) {
  window.location.hash = path;
}

const FILTERS_KEY = 'recipes.filters.v1';

export default function App() {
  const [lang, setLang] = useState<Lang>(() => loadLang());
  const [unlocked, setUnlocked] = useState(() => loadUnlocked());
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [mode, setMode] = useState<DataMode | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [log, setLog] = useState<CaptureLogEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<Filters>(() => {
    try {
      const raw = sessionStorage.getItem(FILTERS_KEY);
      return raw ? { ...EMPTY_FILTERS, ...JSON.parse(raw) } : EMPTY_FILTERS;
    } catch {
      return EMPTY_FILTERS;
    }
  });
  const setFilters = useCallback((f: Filters) => {
    setFiltersState(f);
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify(f));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    saveLang(lang);
    document.documentElement.lang = lang;
    document.title = t('appTitle', lang);
  }, [lang]);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const m = await detectMode();
      setMode(m);
      const [rs, lg] = await Promise.all([listRecipes(m), listCaptureLog(m)]);
      setRecipes(rs);
      setLog(lg);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (unlocked) void load();
  }, [unlocked, load]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const persist = useCallback(
    async (r: Recipe) => {
      if (!mode) return r;
      const saved = await saveRecipe(mode, r);
      setRecipes((all) => {
        const i = all.findIndex((x) => x.id === saved.id);
        if (i === -1) return [saved, ...all];
        const next = all.slice();
        next[i] = saved;
        return next;
      });
      return saved;
    },
    [mode],
  );

  const setStatus = async (r: Recipe, status: Recipe['status']) => {
    try {
      await persist({ ...r, status });
      showToast(t('saved_ok', lang));
    } catch (e) {
      showToast(`${t('saveFailed', lang)}: ${e instanceof Error ? e.message : ''}`);
    }
  };

  const reviewItems = useMemo(() => collectReview(recipes), [recipes]);

  const approveRecipe = async (r: Recipe) => {
    try {
      await persist({ ...r, status: 'approved', review_reasons: [] });
      showToast(t('saved_ok', lang));
    } catch (e) {
      showToast(`${t('saveFailed', lang)}: ${e instanceof Error ? e.message : ''}`);
    }
  };

  const removeRecipe = async (r: Recipe) => {
    if (!mode) return;
    try {
      await deleteRecipe(mode, r.id);
      setRecipes((all) => all.filter((x) => x.id !== r.id));
      showToast(t('saved_ok', lang));
    } catch (e) {
      showToast(`${t('saveFailed', lang)}: ${e instanceof Error ? e.message : ''}`);
    }
  };

  const mergeRecipes = async (keep: Recipe, other: Recipe) => {
    try {
      const keptReasons = (keep.review_reasons ?? []).filter((x) => x !== 'duplicate_fb' && x !== 'duplicate_title');
      await persist({ ...keep, status: 'approved', review_reasons: keptReasons });
      await persist({ ...other, status: 'archived' });
      showToast(t('saved_ok', lang));
    } catch (e) {
      showToast(`${t('saveFailed', lang)}: ${e instanceof Error ? e.message : ''}`);
    }
  };

  if (!unlocked) {
    return (
      <PinGate
        lang={lang}
        onLangChange={setLang}
        onUnlock={() => {
          saveUnlocked(true);
          setUnlocked(true);
        }}
      />
    );
  }

  const tab =
    route.name === 'review'
      ? 'review'
      : route.name === 'ingredients'
        ? 'ingredients'
        : route.name === 'log'
          ? 'log'
          : 'library';
  const byId = (id: string) => recipes.find((r) => r.id === id || r.code === id);

  let body: React.ReactNode;
  if (!mode && !loadError) {
    body = <p className="muted center empty">{t('loading', lang)}</p>;
  } else if (loadError) {
    body = (
      <div className="center empty">
        <p className="muted">
          {t('loadError', lang)}: {loadError}
        </p>
        <button type="button" className="btn sm" onClick={() => void load()}>
          {t('retry', lang)}
        </button>
      </div>
    );
  } else if (route.name === 'detail') {
    const r = byId(route.id);
    body = r ? (
      <RecipeDetail
        r={r}
        lang={lang}
        onBack={() => (window.history.length > 1 ? window.history.back() : go('/'))}
        onEdit={() => go(`/r/${r.id}/edit`)}
        onTag={(tag) => {
          setFilters({ ...EMPTY_FILTERS, sort: filters.sort, sortDir: filters.sortDir, tags: [tag] });
          go('/');
        }}
        onKindTag={(kind, key) => {
          if (kind === 'ingredient' && key.includes(':')) {
            setFilters({ ...EMPTY_FILTERS, sort: filters.sort, sortDir: filters.sortDir, variantTags: [key] });
          } else {
            setFilters({
              ...EMPTY_FILTERS,
              sort: filters.sort, sortDir: filters.sortDir,
              ...(kind === 'ingredient' ? { ingTags: [key] } : { eqTags: [key] }),
            });
          }
          go('/');
        }}
        onSetStatus={(s) => void setStatus(r, s)}
        onFav={() => void persist({ ...r, is_favorite: !r.is_favorite })}
        onCreator={(name) => {
          setFilters({ ...EMPTY_FILTERS, sort: filters.sort, sortDir: filters.sortDir, author: name });
          go('/');
        }}
      />
    ) : (
      <p className="muted center empty">{t('notFound', lang)}</p>
    );
  } else if (route.name === 'edit' || route.name === 'new') {
    const r = route.name === 'edit' ? byId(route.id) : undefined;
    body =
      route.name === 'edit' && !r ? (
        <p className="muted center empty">{t('notFound', lang)}</p>
      ) : (
        <EditForm
          key={r?.id ?? 'new'}
          lang={lang}
          recipe={r ?? emptyRecipe()}
          isNew={!r}
          all={recipes}
          onCancel={() => window.history.back()}
          onOpen={(id) => go(`/r/${id}`)}
          onSave={async (next) => {
            const fixed = { ...next, fb_post_id: extractFbPostId(next.fb_url) ?? next.fb_post_id };
            const saved = await persist(fixed);
            showToast(t('saved_ok', lang));
            window.location.replace(`#/r/${saved.id}`);
          }}
        />
      );
  } else if (route.name === 'review') {
    body = (
      <ReviewQueue
        lang={lang}
        items={reviewItems}
        onOpen={(id) => go(`/r/${id}`)}
        onEdit={(id) => go(`/r/${id}/edit`)}
        onApprove={(r) => void approveRecipe(r)}
        onApproveMany={(rs) => {
          void (async () => {
            for (const r of rs) await persist({ ...r, status: 'approved', review_reasons: [] });
            showToast(t('saved_ok', lang));
          })();
        }}
        onArchive={(r) => void setStatus(r, 'archived')}
        onDelete={(r) => void removeRecipe(r)}
        onMerge={(keep, other) => void mergeRecipes(keep, other)}
      />
    );
  } else if (route.name === 'ingredients') {
    body = (
      <IngredientIndex
        lang={lang}
        recipes={recipes}
        onOpenParent={(key) => {
          setFilters({ ...EMPTY_FILTERS, sort: filters.sort, sortDir: filters.sortDir, ingTags: [key] });
          go('/');
        }}
        onOpenVariant={(key) => {
          setFilters({ ...EMPTY_FILTERS, sort: filters.sort, sortDir: filters.sortDir, variantTags: [key] });
          go('/');
        }}
        onOpenCreator={(name) => {
          setFilters({ ...EMPTY_FILTERS, sort: filters.sort, sortDir: filters.sortDir, author: name });
          go('/');
        }}
      />
    );
  } else if (route.name === 'log') {
    body = <CaptureLog lang={lang} entries={log} />;
  } else {
    body = (
      <Library
        lang={lang}
        recipes={recipes}
        filters={filters}
        setFilters={setFilters}
        onOpen={(id) => go(`/r/${id}`)}
        onAdd={() => go('/new')}
        onFav={(r) => void persist({ ...r, is_favorite: !r.is_favorite })}
        onCreator={(name) => {
          setFilters({ ...EMPTY_FILTERS, sort: filters.sort, sortDir: filters.sortDir, author: name });
        }}
      />
    );
  }

  return (
    <div className="app">
      <div className="sticky-chrome">
        <header className="topbar">
          <div className="topbar-title">
            <span className="logo">🍳</span>
            <div>
              <h1>{t('appTitle', lang)}</h1>
              <div className="user-chip">
                Dan
                <span className="app-version"> · {APP_VERSION}</span>
              </div>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="chip"
              onClick={() => setLang((l) => (l === 'es' ? 'en' : 'es'))}
              title={t('language', lang)}
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>
            <button
              type="button"
              className="chip ghost"
              onClick={() => {
                saveUnlocked(false);
                setUnlocked(false);
              }}
            >
              {t('lock', lang)}
            </button>
          </div>
        </header>
        <nav className="main-tabs four">
          <button type="button" className={tab === 'library' ? 'active' : ''} onClick={() => go('/')}>
            ▦ {t('tabLibrary', lang)}
          </button>
          <button type="button" className={tab === 'ingredients' ? 'active' : ''} onClick={() => go('/ingredients')}>
            ❋ {t('tabIngredients', lang)}
          </button>
          <button type="button" className={tab === 'review' ? 'active' : ''} onClick={() => go('/review')}>
            ⇩ {t('tabReview', lang)}
            {reviewItems.length > 0 && <i className="badge">{reviewItems.length}</i>}
          </button>
          <button type="button" className={tab === 'log' ? 'active' : ''} onClick={() => go('/log')}>
            ⟳ {t('tabLog', lang)}
          </button>
        </nav>
      </div>
      {mode === 'demo' && (
        <div className="demo-banner" role="status">
          <strong>{t('demoBanner', lang)}</strong>
          <span>{t('demoBannerSub', lang)}</span>
        </div>
      )}
      <main className="content">{body}</main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
