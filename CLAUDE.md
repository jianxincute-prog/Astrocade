# Astrocade projects

Games: `dont-touch-water/`, `nail-survival/`. Game code is a single `game_code.html` per game (Three.js r128), saved to Astrocade with `pull_game` → edit → `begin_upload` + `save_draft`. Do not publish unless the user asks. User replies are in Indonesian.

## Mandatory tools (active at the start of every session)

These two tools are required in **every** session. `.claude/hooks/session-start.sh` (registered in `.claude/settings.json`) installs/enables them automatically at session start; do not disable or remove them.

1. **rtk** (https://github.com/rtk-ai/rtk, "Rust Token Killer") filters noisy shell output to save tokens.
   - A `PreToolUse` hook in `.claude/settings.json` (`rtk hook claude`) rewrites Bash commands to `rtk ...` transparently.
   - Check: `rtk --version` and `rtk gain` (must show the savings dashboard; a different "rtk" = Rust Type Kit = wrong package).
   - Cloud sessions block GitHub release downloads, so the hook builds it from source (`cargo install --path ~/rtk-ai/rtk --root ~/.local`). Binary is in `~/.local/bin`.
   - If a command's output looks over-filtered, run the raw command with `rtk proxy <cmd>`.
2. **caveman** (https://github.com/JuliusBrussee/caveman) plugin makes replies terse (fewer output tokens).
   - Enabled by `extraKnownMarketplaces` + `enabledPlugins` (`caveman@caveman`) in `.claude/settings.json`; the plugin's own SessionStart hook turns the mode on.
   - Check: `claude plugin list` shows `caveman@caveman` enabled. Control: `/caveman`, "stop caveman", "normal mode".
   - Code, commits, file contents and security warnings stay normal; only the prose of replies is compressed.

If either tool is missing at the start of a session, run `.claude/hooks/session-start.sh` (with `CLAUDE_CODE_REMOTE=true`) and tell the user if it still fails.
