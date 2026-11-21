#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch of myvirtualclone/recipes ONLY.
# (Interim deploy path: the box's gh token lacks the `workflow` scope, so the
# Actions workflow in ci/ can't be pushed yet. See README "Deploy".)
# Never touches myvirtualclone/myvirtualclone.github.io (Margory's site repo).
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE_URL="https://github.com/myvirtualclone/recipes.git"
case "$(git remote get-url origin)" in
  *myvirtualclone/recipes*) ;;
  *) echo "origin is not myvirtualclone/recipes — refusing to deploy" >&2; exit 1 ;;
esac
npm run build
touch dist/.nojekyll
SHA="$(git rev-parse --short HEAD)"
TMP="$(mktemp -d)"
cp -r dist/. "$TMP/"
cd "$TMP"
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.name="myvirtualclone" -c user.email="myvirtualclone@users.noreply.github.com" \
  commit -q -m "Deploy ${SHA}"
git push -q --force "$REMOTE_URL" gh-pages
echo "Deployed ${SHA} to gh-pages"
rm -rf "$TMP"
