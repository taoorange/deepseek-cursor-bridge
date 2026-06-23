# DeepSeek Cursor Bridge — Architecture

[English](#english) · [中文](#中文)

---

<a id="english"></a>

## English

> Integrate DeepSeek V4 into Cursor by managing [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy) from a VS Code / Cursor extension.

**Repository:** https://github.com/taoorange/deepseek-cursor-bridge

---

### 1. Background and goals

#### 1.1 Problem

- Cursor does not fully support DeepSeek V4 **thinking mode** (especially `reasoning_content` across multi-turn tool calls).
- Users typically run [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy) manually in a terminal, plus ngrok for HTTPS.
- Cursor is not open source; its internal LLM client cannot be patched directly.

#### 1.2 Goal

Provide a **Cursor Extension** that:

- Starts/stops the proxy from a visual control panel (no manual terminal workflow)
- Exposes an HTTPS Base URL for **Cursor Settings → Models**
- Lets users use DeepSeek V4 (including tool calls) in Agent / Composer

#### 1.3 Scope boundary

| Approach | Replaces proxy? | Notes |
|----------|-----------------|-------|
| `.cursor-plugin` only (rules / skills / MCP) | No | Does not intercept Chat/Agent LLM HTTP traffic |
| Cursor Hooks | No | Cannot rewrite DeepSeek request bodies |
| MCP Server | No | Tools for Agent, not the main chat model |
| **Extension + managed proxy process** | Yes | This project |

**Conclusion:** This is a **VS Code Extension** that **manages** `deepseek-cursor-proxy` as a child process. The extension does **not** reimplement proxy protocol logic in TypeScript.

Cursor has no public API to register a new built-in model provider. Users still configure **Settings → Models** with the HTTPS Base URL and DeepSeek API Key. The extension automates process and tunnel management.

---

### 2. Why a proxy is needed

DeepSeek V4 thinking mode with tool calls requires:

1. `reasoning_content` from each response must be **sent back** in later requests.
2. Cursor’s OpenAI-compatible client **drops** `reasoning_content`, causing HTTP 400: `reasoning_content must be passed back`.

The proxy (implemented in Python upstream) handles:

- Caching `reasoning_content` (SQLite, SHA-256 keyed by conversation prefix)
- Injecting missing `reasoning_content` into follow-up requests
- Format conversion (`functions` → `tools`, etc.)
- Response rewriting (SSE aggregation, reasoning mirrored as Markdown)

Reference: [yxlao/deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy)

---

### 3. System architecture

#### 3.1 Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Cursor IDE                           │
│  ┌──────────────┐         ┌─────────────────────────────┐   │
│  │ Agent /      │  HTTPS  │ Settings → Models           │   │
│  │ Composer     │────────▶│ Base URL + DeepSeek API Key │   │
│  └──────────────┘         └─────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                │ OpenAI-compatible
                                │ POST /v1/chat/completions
                                ▼
                    ┌───────────────────────┐
                    │  ngrok HTTPS tunnel     │  (optional but
                    │  https://xxx.ngrok…/v1  │   required for Cursor)
                    └───────────┬─────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│           DeepSeek Cursor Bridge (Extension)                │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Webview    │  │ Status bar   │  │ ProxyManager     │   │
│  │ dashboard  │  │ + commands   │  │ spawn / kill     │   │
│  └────────────┘  └──────────────┘  └────────┬─────────┘   │
│  ┌──────────────────────────────────────────▼─────────────┐ │
│  │              Output channel (proxy logs)               │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────┘
                                │ child_process.spawn()
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              deepseek-cursor-proxy (external binary)          │
│  HTTP server :9000  ·  reasoning cache  ·  ngrok CLI          │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   DeepSeek API        │
                    │ api.deepseek.com/v1   │
                    └───────────────────────┘
```

#### 3.2 Repository layout

```text
deepseek-cursor-bridge/
├── package.json              # Extension manifest, settings schema
├── webpack.config.js         # Bundle entry → dist/extension.js
├── src/
│   ├── extension.ts          # Activate/deactivate, commands, status bar
│   ├── proxyManager.ts       # Child process lifecycle, health check, URLs
│   ├── dashboardShared.ts    # Webview HTML, settings, postMessage bridge
│   ├── dashboardProvider.ts  # Sidebar Webview (activity bar)
│   ├── dashboardPanel.ts     # Optional editor-column Webview panel
│   └── types/
│       └── cursor.d.ts       # Cursor-specific vscode typings
├── media/
│   ├── icon.png              # Marketplace icon (128×128)
│   └── icon.svg              # Activity bar icon
├── dist/
│   └── extension.js          # Compiled output (webpack)
└── ARCHITECTURE.md           # This document
```

#### 3.3 Module responsibilities

| Module | Responsibility |
|--------|----------------|
| **extension.ts** | Extension entry: register commands, status bar, auto-start, setup wizard entry |
| **ProxyManager** | `spawn` / `SIGTERM` / `SIGKILL` proxy; parse `api_base_url:` / `local_base_url:` from stdout; `GET /v1/healthz` health check |
| **dashboardShared.ts** | Shared Webview UI (HTML/CSS/JS), read/write `deepseekBridge.*` settings, route button actions to commands |
| **DashboardProvider** | Sidebar **DeepSeek Bridge → 代理控制** WebviewView |
| **DashboardPanel** | Full editor-tab control panel (opened on activate / command) |
| **deepseek-cursor-proxy** (external) | HTTP proxy, reasoning cache, ngrok tunnel — **not in this repo** |

#### 3.4 Extension vs proxy split

| Layer | Language | Owns |
|-------|----------|------|
| **This extension** | TypeScript | UI, process management, log display, settings |
| **deepseek-cursor-proxy** | Python | Protocol translation, SQLite cache, request forwarding |

The extension passes CLI flags to the proxy:

```text
deepseek-cursor-proxy --port 9000 --host 127.0.0.1 --ngrok [--ngrok-url URL] [--verbose]
```

When ngrok is disabled: `--no-ngrok` (local URL only; Cursor Models usually cannot use it).

---

### 4. Runtime flows

#### 4.1 Activation

1. Cursor finishes startup → `onStartupFinished` activates extension
2. Create Output channel, `ProxyManager`, `DashboardProvider`, status bar
3. Register commands and sidebar Webview
4. Open control panel (`DashboardPanel.reveal`)
5. If `deepseekBridge.autoStart` is `true`, call `proxyManager.start()`

#### 4.2 Start proxy

1. Read `proxyPath`, `proxyCwd`, `port`, `host`, `ngrok`, `ngrokUrl`, `verbose`
2. Validate executable exists
3. If port already healthy (`/v1/healthz`), reuse existing instance
4. `spawn(proxyPath, args, { cwd: proxyCwd })`
5. Stream stdout/stderr to Output channel
6. Parse lines `api_base_url: https://…` and `local_base_url: http://…`
7. Poll health until running or 30s timeout
8. Notify status bar + Webviews via `onDidChangeState`

#### 4.3 Stop / deactivate

- **Stop command:** `SIGTERM`, then `SIGKILL` after 5s
- **Extension deactivate:** if `deepseekBridge.stopOnDeactivate` is `true`, stop running proxy

#### 4.4 User configures Cursor (first time)

1. Start proxy in control panel → copy **Base URL** (HTTPS, ends with `/v1`)
2. **Cursor Settings → Models** → Override OpenAI Base URL
3. Enter DeepSeek API Key and add model `deepseek-v4-pro`

The extension does **not** write Cursor model settings programmatically.

#### 4.5 Request path (handled by proxy, not extension)

```text
Cursor → HTTPS ngrok URL → deepseek-cursor-proxy:9000
       → cache lookup / inject reasoning_content
       → api.deepseek.com/v1/chat/completions
       → transform response → Cursor
```

---

### 5. Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `deepseekBridge.proxyPath` | (required) | Path to `deepseek-cursor-proxy` executable |
| `deepseekBridge.proxyCwd` | (required) | Working directory for spawn |
| `deepseekBridge.host` | `127.0.0.1` | Bind host passed to proxy |
| `deepseekBridge.port` | `9000` | Local port |
| `deepseekBridge.ngrok` | `true` | Enable ngrok tunnel |
| `deepseekBridge.ngrokUrl` | `""` | Optional fixed ngrok domain |
| `deepseekBridge.autoStart` | `true` | Start proxy when Cursor launches |
| `deepseekBridge.stopOnDeactivate` | `true` | Stop proxy on extension deactivate |
| `deepseekBridge.verbose` | `false` | Verbose proxy logging |

---

### 6. Tech stack

| Component | Choice |
|-----------|--------|
| Extension | TypeScript, VS Code Extension API |
| Bundle | webpack → `dist/extension.js` |
| UI | Webview (inline HTML in `dashboardShared.ts`) |
| Proxy | External `deepseek-cursor-proxy` (Python) |
| Tunnel | ngrok CLI (invoked by proxy, not extension) |
| Tests | `@vscode/test-cli` (`src/test/`) |

---

### 7. Local development

**Prerequisites:** Node.js 20+, Cursor, installed `deepseek-cursor-proxy`, ngrok with authtoken.

```bash
git clone https://github.com/taoorange/deepseek-cursor-bridge.git
cd deepseek-cursor-bridge
npm install
npm run compile
```

Open the folder in Cursor, press **F5** → Extension Development Host window.

```bash
npm run lint      # ESLint on src/
npm run validate  # Doc + package checks (maintainers)
```

---

### 8. Known limitations

1. **HTTPS required** — Cursor Models generally reject `http://127.0.0.1`; use ngrok (default on).
2. **Manual Base URL** — No Extension API to set Cursor model settings; user copies URL once.
3. **External proxy dependency** — User must install `deepseek-cursor-proxy` separately.
4. **Single global Base URL** — Cursor has one Override OpenAI Base URL; disable when switching to other providers.
5. **Not a Cursor Plugin** — `.cursor-plugin` alone cannot replace this architecture.

---

### 9. References

- [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy) — Python proxy (managed by this extension)
- [DeepSeek Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode) — `reasoning_content` protocol
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Cursor Extension API](https://cursor.com/docs/extension-api) — MCP / plugin registration (not used for Base URL)

---

### 10. Document history

| Version | Date | Notes |
|---------|------|-------|
| 0.1.0 | 2026-06-15 | Initial design (planned TS proxy rewrite) |
| 0.2.0 | 2026-06-23 | Updated to reflect child-process architecture; bilingual |

---

<a id="中文"></a>

## 中文

> 通过 Cursor 扩展管理 [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy)，将 DeepSeek V4 接入 Cursor。

**仓库地址：** https://github.com/taoorange/deepseek-cursor-bridge

---

### 1. 背景与目标

#### 1.1 问题

- Cursor 对 DeepSeek V4 **思考模式**（尤其多轮 tool call 中的 `reasoning_content`）支持不完整。
- 用户通常需在终端手动运行 [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy)，并配合 ngrok 提供 HTTPS。
- Cursor 非开源，无法直接修改其 LLM 客户端。

#### 1.2 目标

提供一款 **Cursor 扩展**，实现：

- 在可视化控制面板中启停代理，无需反复切换终端
- 提供供 **Cursor Settings → Models** 使用的 HTTPS Base URL
- 在 Agent / Composer 中正常使用 DeepSeek V4（含 tool call）

#### 1.3 能力边界

| 方案 | 能否替代 proxy | 说明 |
|------|----------------|------|
| 纯 `.cursor-plugin`（rules/skills/MCP） | ❌ | 不能接管 Chat/Agent 的 LLM HTTP 请求 |
| Cursor Hooks | ❌ | 不能改写发往 DeepSeek 的请求体 |
| MCP Server | ❌ | Agent 工具，不是主聊天模型 |
| **Extension + 托管 proxy 进程** | ✅ | 本项目 |

**结论：** 本项目是 **VS Code 扩展**，以**子进程**方式管理 `deepseek-cursor-proxy`，**不在 TypeScript 中重写** proxy 协议逻辑。

Cursor 没有公开 API 注册新的内置模型提供商。用户仍需在 **Settings → Models** 配置 HTTPS Base URL 与 DeepSeek API Key；扩展负责进程与隧道管理。

---

### 2. 为什么需要 Proxy

DeepSeek V4 思考模式在 tool call 场景下要求：

1. 每轮响应中的 `reasoning_content` 必须在后续请求中**完整回传**。
2. Cursor 的 OpenAI 兼容客户端会**丢弃** `reasoning_content`，导致 HTTP 400：`reasoning_content must be passed back`。

proxy（上游 Python 实现）负责：

- 缓存 `reasoning_content`（SQLite，按对话前缀 SHA-256 索引）
- 注入 Cursor 后续请求中缺失的 `reasoning_content`
- 格式转换（`functions` → `tools` 等）
- 响应改写（SSE 聚合、reasoning 镜像为 Markdown）

参考：[yxlao/deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy)

---

### 3. 系统架构

#### 3.1 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Cursor IDE                           │
│  ┌──────────────┐         ┌─────────────────────────────┐   │
│  │ Agent /      │  HTTPS  │ Settings → Models           │   │
│  │ Composer     │────────▶│ Base URL + DeepSeek API Key │   │
│  └──────────────┘         └─────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                │ OpenAI 兼容
                                │ POST /v1/chat/completions
                                ▼
                    ┌───────────────────────┐
                    │  ngrok HTTPS 隧道       │  （默认启用，
                    │  https://xxx.ngrok…/v1  │   Cursor 需要）
                    └───────────┬─────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│           DeepSeek Cursor Bridge（扩展）                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Webview    │  │ 状态栏       │  │ ProxyManager     │   │
│  │ 控制面板   │  │ + 命令       │  │ spawn / kill     │   │
│  └────────────┘  └──────────────┘  └────────┬─────────┘   │
│  ┌──────────────────────────────────────────▼─────────────┐ │
│  │              Output 通道（proxy 日志）                  │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────┘
                                │ child_process.spawn()
                                ▼
┌─────────────────────────────────────────────────────────────┐
│         deepseek-cursor-proxy（外部可执行文件）              │
│  HTTP :9000  ·  reasoning 缓存  ·  ngrok CLI                │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   DeepSeek API        │
                    │ api.deepseek.com/v1   │
                    └───────────────────────┘
```

#### 3.2 目录结构

```text
deepseek-cursor-bridge/
├── package.json              # 扩展清单、配置项 schema
├── webpack.config.js         # 打包入口 → dist/extension.js
├── src/
│   ├── extension.ts          # 激活/停用、命令、状态栏
│   ├── proxyManager.ts       # 子进程生命周期、健康检查、URL 解析
│   ├── dashboardShared.ts    # Webview HTML、设置读写、postMessage
│   ├── dashboardProvider.ts  # 侧边栏 Webview（活动栏）
│   ├── dashboardPanel.ts     # 编辑器区域 Webview 面板
│   └── types/
│       └── cursor.d.ts       # Cursor 相关类型声明
├── media/
│   ├── icon.png              # 市场图标（128×128）
│   └── icon.svg              # 活动栏图标
├── dist/
│   └── extension.js          # webpack 编译产物
└── ARCHITECTURE.md           # 本文档
```

#### 3.3 模块职责

| 模块 | 职责 |
|------|------|
| **extension.ts** | 扩展入口：注册命令、状态栏、自动启动、配置向导入口 |
| **ProxyManager** | `spawn` / `SIGTERM` / `SIGKILL`；解析 stdout 中 `api_base_url:` / `local_base_url:`；`GET /v1/healthz` 健康检查 |
| **dashboardShared.ts** | 共享 Webview UI，读写 `deepseekBridge.*` 配置，按钮动作转发为命令 |
| **DashboardProvider** | 侧边栏 **DeepSeek Bridge → 代理控制** WebviewView |
| **DashboardPanel** | 编辑器标签页控制面板（激活或命令时打开） |
| **deepseek-cursor-proxy**（外部） | HTTP 代理、reasoning 缓存、ngrok 隧道 — **不在本仓库** |

#### 3.4 扩展与 proxy 的分工

| 层级 | 语言 | 负责 |
|------|------|------|
| **本扩展** | TypeScript | UI、进程管理、日志展示、配置 |
| **deepseek-cursor-proxy** | Python | 协议转换、SQLite 缓存、请求转发 |

扩展向 proxy 传递 CLI 参数：

```text
deepseek-cursor-proxy --port 9000 --host 127.0.0.1 --ngrok [--ngrok-url URL] [--verbose]
```

关闭 ngrok 时使用 `--no-ngrok`（仅本地 URL；Cursor Models 通常无法使用）。

---

### 4. 运行时流程

#### 4.1 激活

1. Cursor 启动完成 → `onStartupFinished` 激活扩展
2. 创建 Output 通道、`ProxyManager`、`DashboardProvider`、状态栏
3. 注册命令与侧边栏 Webview
4. 打开控制面板（`DashboardPanel.reveal`）
5. 若 `deepseekBridge.autoStart` 为 `true`，调用 `proxyManager.start()`

#### 4.2 启动代理

1. 读取 `proxyPath`、`proxyCwd`、`port`、`host`、`ngrok`、`ngrokUrl`、`verbose`
2. 校验可执行文件存在
3. 若端口已健康（`/v1/healthz`），复用已有实例
4. `spawn(proxyPath, args, { cwd: proxyCwd })`
5. 将 stdout/stderr 写入 Output 通道
6. 解析 `api_base_url: https://…` 与 `local_base_url: http://…`
7. 轮询健康检查直至运行或 30 秒超时
8. 通过 `onDidChangeState` 通知状态栏与 Webview

#### 4.3 停止 / 停用

- **停止命令：** 先发 `SIGTERM`，5 秒后 `SIGKILL`
- **扩展停用：** 若 `deepseekBridge.stopOnDeactivate` 为 `true`，停止运行中的 proxy

#### 4.4 用户配置 Cursor（首次）

1. 在控制面板启动代理 → 复制 **Base URL**（HTTPS，以 `/v1` 结尾）
2. **Cursor Settings → Models** → Override OpenAI Base URL
3. 填入 DeepSeek API Key，添加模型 `deepseek-v4-pro`

扩展**不能**通过 API 自动写入 Cursor 模型设置。

#### 4.5 请求路径（由 proxy 处理，扩展不参与）

```text
Cursor → HTTPS ngrok URL → deepseek-cursor-proxy:9000
       → 缓存查找 / 注入 reasoning_content
       → api.deepseek.com/v1/chat/completions
       → 改写响应 → Cursor
```

---

### 5. 配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `deepseekBridge.proxyPath` | 需配置 | `deepseek-cursor-proxy` 可执行文件路径 |
| `deepseekBridge.proxyCwd` | 需配置 | spawn 工作目录 |
| `deepseekBridge.host` | `127.0.0.1` | 传给 proxy 的绑定地址 |
| `deepseekBridge.port` | `9000` | 本地端口 |
| `deepseekBridge.ngrok` | `true` | 是否启用 ngrok |
| `deepseekBridge.ngrokUrl` | `""` | 可选固定 ngrok 域名 |
| `deepseekBridge.autoStart` | `true` | Cursor 启动时自动运行 |
| `deepseekBridge.stopOnDeactivate` | `true` | 扩展停用时停止 proxy |
| `deepseekBridge.verbose` | `false` | 详细日志 |

---

### 6. 技术选型

| 组件 | 方案 |
|------|------|
| 扩展 | TypeScript，VS Code Extension API |
| 打包 | webpack → `dist/extension.js` |
| UI | Webview（`dashboardShared.ts` 内联 HTML） |
| Proxy | 外部 `deepseek-cursor-proxy`（Python） |
| 隧道 | ngrok CLI（由 proxy 调用，非扩展直接调用） |
| 测试 | `@vscode/test-cli`（`src/test/`） |

---

### 7. 本地开发

**前置：** Node.js 20+、Cursor、已安装 `deepseek-cursor-proxy`、已配置 ngrok authtoken。

```bash
git clone https://github.com/taoorange/deepseek-cursor-bridge.git
cd deepseek-cursor-bridge
npm install
npm run compile
```

用 Cursor 打开项目目录，按 **F5** 进入 Extension Development Host 窗口。

```bash
npm run lint      # 对 src/ 运行 ESLint
npm run validate  # 文档与打包前检查（维护者）
```

---

### 8. 已知限制

1. **需要 HTTPS** — Cursor Models 通常不接受 `http://127.0.0.1`；默认启用 ngrok。
2. **Base URL 需手动配置** — 无 Extension API 修改 Cursor 模型设置；用户复制 URL 一次即可。
3. **依赖外部 proxy** — 用户须单独安装 `deepseek-cursor-proxy`。
4. **全局单一 Base URL** — Cursor 仅一个 Override OpenAI Base URL；切回其他提供商时需关闭 Override。
5. **非 Cursor Plugin 方案** — 仅靠 `.cursor-plugin` 无法实现本架构。

---

### 9. 参考资料

- [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy) — Python proxy（由本扩展托管）
- [DeepSeek Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode) — `reasoning_content` 协议
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Cursor Extension API](https://cursor.com/docs/extension-api) — MCP / 插件注册（不用于 Base URL）

---

### 10. 文档版本

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1.0 | 2026-06-15 | 初始方案（计划 TypeScript 重写 proxy） |
| 0.2.0 | 2026-06-23 | 更新为子进程托管架构；中英双语 |
