# Change Log

All notable changes to the "deepseek-cursor-bridge" extension will be documented in this file.

## [0.1.8] - 2026-06-25

### Changed

- Bundled proxy now runs directly from extension source via `python -m deepseek_cursor_proxy` instead of pip-installing the proxy package
- First activation only installs the PyYAML dependency; users no longer need to download or clone deepseek-cursor-proxy separately

## [0.1.7] - 2026-06-25

### Added

- Bundle `deepseek-cursor-proxy` under `vendor/` and auto-install into Cursor global storage on first activation
- Setting `deepseekBridge.useBundledProxy` (default on) to opt out and use a manual `proxyPath`

### Changed

- Quick start no longer requires a separate clone/install of deepseek-cursor-proxy
- `proxyPath` / `proxyCwd` defaults are empty and auto-configured when bundled mode is enabled

## [0.1.0] - 2026-06-15

### Added

- Integrate `deepseek-cursor-proxy` as a managed child process
- Status bar indicator with click-to-manage
- Commands: start, stop, restart, setup wizard, copy Base URL, show logs
- Settings for proxy path, port, ngrok, auto-start
- Output channel for proxy logs