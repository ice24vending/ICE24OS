#!/usr/bin/env bash
# Runs `pnpm test:ui` inside the official Playwright container (F6-12), so screenshots are
# rendered with the same fonts and libraries as CI. Called by scripts/ui-quality/run.mjs with
# the repository mounted read-write at /src and a cache volume at /cache. The repository is
# copied without node_modules (they are Windows/macOS builds), installed for Linux and tested;
# the report and, with --update-snapshots, the new baselines are copied back.
set -euo pipefail

NODE_VERSION=24.19.0
if [ "$(node -v)" != "v$NODE_VERSION" ]; then
  NODE_DIR="/cache/node-v$NODE_VERSION-linux-x64"
  if [ ! -x "$NODE_DIR/bin/node" ]; then
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" |
      tar -xz -C /cache
  fi
  export PATH="$NODE_DIR/bin:$PATH"
fi
export COREPACK_HOME=/cache/corepack COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export npm_config_store_dir=/cache/pnpm-store
corepack enable --install-directory /usr/local/bin

mkdir -p /work
tar -C /src \
  --exclude=./.git --exclude='./node_modules' --exclude='*/node_modules' --exclude='*/.next' \
  --exclude=./storybook-static --exclude=./playwright-report --exclude=./test-results \
  --exclude='*/.turbo' --exclude='*/dist' --exclude=./tmp \
  -cf - . | tar -C /work -xf -
cd /work

pnpm install --frozen-lockfile
# Workspace packages the private web and Storybook import from dist.
pnpm --filter "./packages/**" run build
pnpm storybook:build

status=0
pnpm exec playwright test "$@" || status=$?

rm -rf /src/playwright-report
cp -r playwright-report /src/
for arg in "$@"; do
  if [ "$arg" = "--update-snapshots" ] || [ "$arg" = "-u" ]; then
    rm -rf /src/tests/visual/__screenshots__
    cp -r tests/visual/__screenshots__ /src/tests/visual/
  fi
done
exit $status
