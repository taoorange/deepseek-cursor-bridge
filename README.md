# DeepSeek Cursor Bridge

[English](#english) · [中文](#中文)

---

<a id="english"></a>

## English

**DeepSeek Cursor Bridge** lets you use **DeepSeek V4 Pro** (`deepseek-v4-pro`) in Cursor Agent, Composer, and chat. The extension includes a built-in Python proxy (since **v0.1.8**), a control panel, and ngrok HTTPS exposure for Cursor Models.

**Repository:** https://github.com/taoorange/deepseek-cursor-bridge

### Version history

#### v0.1.10

- No longer opens the control panel automatically on every Cursor launch
- Prepares the built-in proxy in the background without blocking extension activation
- Localized error messages (English / Chinese) for proxy and installer failures
- Validates **Python 3.10+** during first-time setup

#### v0.1.8

- Bundles the full Python proxy inside the extension — no need to clone or install [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy) separately
- Runs the proxy directly from extension source via `python -m deepseek_cursor_proxy`
- First activation only installs the **PyYAML** dependency automatically

Full changelog: [CHANGELOG.md](./CHANGELOG.md)

### Prerequisites

Before use, prepare:

1. **Cursor** with this extension installed
2. **Python 3.10+** on PATH (`python3` or `python`)
3. **ngrok** CLI with authtoken configured — see [ngrok setup](#ngrok-setup)
4. **DeepSeek API Key** for Cursor Settings → Models
5. **Cursor Pro** (or another paid plan that allows named models) — see [Cursor plan & custom models](#cursor-plan--custom-models)

**First launch (automatic):** After you install the extension and open Cursor, the extension prepares the built-in proxy for you — you do **not** need to run `pip install` or download PyYAML manually. It creates a Python virtual environment and installs the PyYAML dependency automatically. Keep your network connected; you may see **Preparing built-in DeepSeek proxy…** once. Later launches use the local environment and do not download again.

### Quick start

```text
Install extension → Start Proxy → Copy Base URL → Cursor Settings → Models
```

1. Install from the [marketplace](#installation) or a VSIX file, then restart Cursor
2. Open the control panel (activity bar **DeepSeek Bridge**, status bar **DeepSeek**, or Command Palette)
3. Click **Start Proxy** and wait for **Running**
4. Copy **Cursor Base URL** (HTTPS, ending with `/v1`)
5. In **Cursor Settings → Models**: enable **Override OpenAI Base URL**, paste the Base URL, add your DeepSeek API Key, and add model `deepseek-v4-pro`

![Control panel Base URL](https://raw.githubusercontent.com/taoorange/deepseek-cursor-bridge/main/media/readme-control-panel-base-url.png)

![Cursor Models Base URL](https://raw.githubusercontent.com/taoorange/deepseek-cursor-bridge/main/media/readme-cursor-models-base-url.png)

> On the ngrok free tier, the subdomain may change after each restart — copy the Base URL again if you restarted the proxy.

### Cursor plan & custom models

Cursor enforces model selection in the **client** before any request reaches this extension or proxy. **This extension cannot bypass Cursor subscription limits.**

On the **free plan**, selecting a named model such as `deepseek-v4-pro` shows:

```text
Named models unavailable
Free plans can only use Auto. Switch to Auto or upgrade plans to continue.
```

| What works on free Cursor | What requires a paid Cursor plan |
|---------------------------|----------------------------------|
| **Auto** mode (Cursor picks the model) | Selecting `deepseek-v4-pro` or other named custom models |
| Configuring Base URL and API Key in Settings | Agent / Composer with your chosen DeepSeek model |

**To use DeepSeek through this bridge in chat, Agent, or Composer**, upgrade to **Cursor Pro** (or a plan that unlocks named models), then select `deepseek-v4-pro` in the model picker.

**Billing is separate:**

- **Cursor subscription** — unlocks named models and related IDE features
- **DeepSeek API Key** — billed by DeepSeek for tokens you consume

If you need DeepSeek without a Cursor subscription, consider [Claude Code with DeepSeek's Anthropic-compatible API](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code) instead. That path does not use this extension.

---

### Installation

**Marketplace:** search **DeepSeek Cursor Bridge** in Cursor Extensions.

| Marketplace | Link |
|-------------|------|
| Open VSX (Cursor default) | https://open-vsx.org/extension/taoorange/deepseek-cursor-bridge |
| VS Code Marketplace | https://marketplace.visualstudio.com/items?itemName=taotao.deepseek-cursor-bridge |

**VSIX:**

```bash
cursor --install-extension ./deepseek-cursor-bridge-<version>.vsix
```

---

### ngrok setup

Cursor Models requires a **public HTTPS Base URL**. The proxy uses ngrok by default to expose local port `9000`.

1. Sign up at https://ngrok.com and copy your authtoken from https://dashboard.ngrok.com
2. Install ngrok (`brew install ngrok` on macOS, or https://ngrok.com/download)
3. Run:

```bash
ngrok config add-authtoken <your-token>
ngrok config check
```

4. In the extension control panel, keep **Enable ngrok tunnel** on, start the proxy, and copy the Base URL

Optional: set a fixed domain in **Fixed ngrok URL** (`deepseekBridge.ngrokUrl`) if you have a paid ngrok plan.

| Symptom | Action |
|---------|--------|
| No Base URL after start | Check **Show Logs**; run `ngrok config check` |
| `command not found: ngrok` | Install ngrok and add it to PATH |
| Cursor cannot connect | Base URL must be HTTPS and end with `/v1` |

---

### Control panel & settings

| Setting | Default | Description |
|---------|---------|-------------|
| `deepseekBridge.port` | `9000` | Local listen port |
| `deepseekBridge.ngrok` | `true` | Enable ngrok tunnel |
| `deepseekBridge.ngrokUrl` | empty | Optional fixed ngrok domain |
| `deepseekBridge.autoStart` | `true` | Auto-start with Cursor |
| `deepseekBridge.verbose` | `false` | Verbose logging |

Common commands (Command Palette → `DeepSeek Bridge`): **Open Control Panel**, **Start Proxy**, **Stop Proxy**, **Copy Base URL**, **Show Logs**.

---

### Troubleshooting

| Issue | Suggestion |
|-------|------------|
| `Named models unavailable` / free plan only allows **Auto** | Upgrade to Cursor Pro; this extension cannot bypass client-side plan checks — see [Cursor plan & custom models](#cursor-plan--custom-models) |
| Proxy preparation fails | Install Python 3.10+; check network for first launch |
| Start failed | Open **Show Logs**; verify ngrok setup |
| Cursor cannot connect | Base URL must be HTTPS and end with `/v1` |

Report issues: [GitHub Issues](https://github.com/taoorange/deepseek-cursor-bridge/issues)

---

<a id="中文"></a>

## 中文

**DeepSeek Cursor Bridge** 用于在 Cursor 的 Agent、Composer 和对话中使用 **DeepSeek V4 Pro**（`deepseek-v4-pro`）。自 **v0.1.8** 起，扩展内置 Python 代理、可视化控制面板，并通过 ngrok 提供 Cursor Models 所需的 HTTPS 地址。

**仓库地址：** https://github.com/taoorange/deepseek-cursor-bridge

### 版本更新说明

#### v0.1.10

- 不再在每次启动 Cursor 时自动打开控制面板
- 内置代理在后台准备，不阻塞扩展加载
- 代理与安装相关错误支持中英文提示
- 首次准备时校验 **Python 3.10+**

#### v0.1.8

- 扩展内置完整 Python 代理，**无需**单独 clone 或安装 [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy)
- 通过 `python -m deepseek_cursor_proxy` 直接运行扩展内源码
- 首次激活自动安装 **PyYAML** 依赖

完整记录见 [CHANGELOG.md](./CHANGELOG.md)

### 使用前准备

请确保本机已具备：

1. 已安装本扩展的 **Cursor**
2. **Python 3.10+**（PATH 中可用 `python3` 或 `python`）
3. 已安装并配置 authtoken 的 **ngrok** — 见 [ngrok 配置](#ngrok-配置)
4. 用于 Cursor Settings → Models 的 **DeepSeek API Key**
5. **Cursor Pro**（或支持选择命名模型的付费套餐）— 见 [Cursor 订阅与自定义模型](#cursor-订阅与自定义模型)

**首次启动（自动完成）：** 安装扩展并打开 Cursor 后，扩展会自动准备内置代理 — **无需**手动执行 `pip install` 或下载 PyYAML。扩展会创建 Python 虚拟环境并自动安装 PyYAML 依赖。请保持网络畅通，可能短暂出现 **正在准备内置 DeepSeek 代理…** 提示。完成后后续启动使用本地环境，不会重复下载。

### 快速开始

```text
安装扩展 → 启动代理 → 复制 Base URL → Cursor Settings → Models
```

1. 从[扩展市场](#安装)或 VSIX 安装，重启 Cursor
2. 打开控制面板（活动栏 **DeepSeek Bridge**、状态栏 **DeepSeek**，或命令面板）
3. 点击 **启动代理**，等待 **运行中**
4. 复制 **Cursor Base URL**（HTTPS，末尾须带 `/v1`）
5. 在 **Cursor Settings → Models** 中：开启 **Override OpenAI Base URL**，粘贴 Base URL，填入 DeepSeek API Key，添加模型 `deepseek-v4-pro`

![控制面板 Base URL](https://raw.githubusercontent.com/taoorange/deepseek-cursor-bridge/main/media/readme-control-panel-base-url.png)

![Cursor Models Base URL](https://raw.githubusercontent.com/taoorange/deepseek-cursor-bridge/main/media/readme-cursor-models-base-url.png)

> ngrok 免费版每次重启代理后子域名可能变化，重启后请重新复制 Base URL。

### Cursor 订阅与自定义模型

Cursor 会在 **客户端** 校验模型选择权限，请求尚未发出时就会拦截；**本扩展无法绕过 Cursor 的套餐限制。**

在 **免费版** 中选择 `deepseek-v4-pro` 等命名模型时，可能出现：

```text
Named models unavailable
Free plans can only use Auto. Switch to Auto or upgrade plans to continue.
```

| 免费版 Cursor 可用 | 需要 Cursor 付费套餐 |
|--------------------|----------------------|
| **Auto** 模式（由 Cursor 自动选模型） | 在模型列表中选择 `deepseek-v4-pro` 等自定义命名模型 |
| 在 Settings 中配置 Base URL 与 API Key | 在对话、Agent、Composer 中稳定使用你指定的 DeepSeek 模型 |

**若要通过本桥接在对话、Agent 或 Composer 中使用 DeepSeek**，请升级至 **Cursor Pro**（或支持命名模型的套餐），再在模型选择器中选 `deepseek-v4-pro`。

**费用相互独立：**

- **Cursor 订阅** — 解锁命名模型及相关 IDE 功能
- **DeepSeek API Key** — 按 DeepSeek 计费，消耗的是你账户的 token 额度

若不想购买 Cursor 会员但仍想使用 DeepSeek，可考虑 [Claude Code + DeepSeek Anthropic 兼容 API](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code)，该方案不依赖本扩展。

---

### 安装

**扩展市场：** 在 Cursor 扩展视图中搜索 **DeepSeek Cursor Bridge**。

| 市场 | 链接 |
|------|------|
| Open VSX（Cursor 默认） | https://open-vsx.org/extension/taoorange/deepseek-cursor-bridge |
| VS Code Marketplace | https://marketplace.visualstudio.com/items?itemName=taotao.deepseek-cursor-bridge |

**VSIX 安装：**

```bash
cursor --install-extension ./deepseek-cursor-bridge-<version>.vsix
```

---

### ngrok 配置

Cursor Models 要求 Base URL 为 **HTTPS 公网地址**。代理默认通过 ngrok 暴露本机 `9000` 端口。

1. 在 https://ngrok.com 注册，从 https://dashboard.ngrok.com 复制 authtoken
2. 安装 ngrok（macOS 可用 `brew install ngrok`，或访问 https://ngrok.com/download）
3. 执行：

```bash
ngrok config add-authtoken <你的token>
ngrok config check
```

4. 在控制面板保持 **启用 ngrok 隧道**，启动代理后复制 Base URL

可选：若有 ngrok 付费固定域名，可在 **固定 ngrok URL**（`deepseekBridge.ngrokUrl`）中填写。

| 现象 | 处理 |
|------|------|
| 启动后无 Base URL | 查看日志；运行 `ngrok config check` |
| `command not found: ngrok` | 安装 ngrok 并加入 PATH |
| Cursor 连不上 | Base URL 须为 HTTPS 且以 `/v1` 结尾 |

---

### 控制面板与配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `deepseekBridge.port` | `9000` | 本地监听端口 |
| `deepseekBridge.ngrok` | `true` | 启用 ngrok 隧道 |
| `deepseekBridge.ngrokUrl` | 空 | 可选固定 ngrok 域名 |
| `deepseekBridge.autoStart` | `true` | Cursor 启动时自动运行 |
| `deepseekBridge.verbose` | `false` | 详细日志 |

常用命令（命令面板搜索 `DeepSeek Bridge`）：**Open Control Panel**、**Start Proxy**、**Stop Proxy**、**Copy Base URL**、**Show Logs**。

---

### 故障排查

| 现象 | 建议 |
|------|------|
| `Named models unavailable` / 免费版只能使用 **Auto** | 升级 Cursor Pro；本扩展无法绕过客户端套餐校验 — 见 [Cursor 订阅与自定义模型](#cursor-订阅与自定义模型) |
| 代理准备失败 | 安装 Python 3.10+；检查首次启动网络 |
| 启动失败 | 查看日志；检查 ngrok 配置 |
| Cursor 无法连接 | Base URL 须为 HTTPS 且以 `/v1` 结尾 |

反馈问题：[GitHub Issues](https://github.com/taoorange/deepseek-cursor-bridge/issues)
