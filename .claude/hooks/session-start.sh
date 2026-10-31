#!/bin/bash
# Installs the tools every session must have: rtk (token-saving command filter) and caveman (terse-reply plugin).
# Remote (cloud) sessions only; idempotent and non-interactive.
set -uo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

export PATH="$HOME/.local/bin:$PATH"
[ -n "${CLAUDE_ENV_FILE:-}" ] && echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$CLAUDE_ENV_FILE"

# ── rtk (https://github.com/rtk-ai/rtk) ──
# The release download host is blocked in cloud sessions, so build from source (cached with the container after the first run).
if ! rtk gain >/dev/null 2>&1; then
  echo "[session-start] installing rtk from source..."
  RTK_SRC="$HOME/rtk-ai/rtk"
  if [ ! -d "$RTK_SRC/.git" ]; then
    mkdir -p "$HOME/rtk-ai" && GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 -q https://github.com/rtk-ai/rtk "$RTK_SRC" || echo "[session-start] rtk clone failed"
  fi
  [ -d "$RTK_SRC/.git" ] && cargo install --path "$RTK_SRC" --locked --root "$HOME/.local" -q || echo "[session-start] rtk build failed"
fi
if command -v rtk >/dev/null 2>&1; then
  rtk --version
else
  echo "[session-start] WARNING: rtk is not available this session"
fi

# ── caveman (https://github.com/JuliusBrussee/caveman) ──
# Enabled through .claude/settings.json (extraKnownMarketplaces + enabledPlugins); install explicitly as a fallback.
if command -v claude >/dev/null 2>&1 && ! claude plugin list 2>/dev/null | grep -q "caveman@caveman"; then
  echo "[session-start] installing caveman plugin..."
  claude plugin marketplace add JuliusBrussee/caveman >/dev/null 2>&1 || true
  claude plugin install caveman@caveman >/dev/null 2>&1 || echo "[session-start] caveman install failed"
fi
exit 0
