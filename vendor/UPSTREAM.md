# Bundled deepseek-cursor-proxy

This directory contains the Python source of
[deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy).

The extension runs it directly from `src/deepseek_cursor_proxy/` using:

```bash
python -m deepseek_cursor_proxy
```

On first activation, the extension only creates a small virtual environment and
installs the `PyYAML` dependency. Users do not need to clone or download the
upstream repository separately.

Upstream license: MIT. See `deepseek-cursor-proxy/LICENSE`.
