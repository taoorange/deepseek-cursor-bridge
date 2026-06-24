# DeepSeek Cursor Bridge

[English](#english) · [中文](#中文)

---

<a id="english"></a>

## English

**DeepSeek Cursor Bridge** is a Cursor IDE extension that lets you use **DeepSeek V4 Pro** (`deepseek-v4-pro`) for Agent, Composer, and chat inside Cursor.

Cursor does not fully support DeepSeek V4’s thinking mode out of the box. This extension runs [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy) as a local proxy, exposes it to Cursor via an HTTPS Base URL (ngrok), and gives you a visual control panel to start/stop the proxy, copy the Base URL, and view logs — all inside the IDE, without switching to a terminal.

In short: install the extension → start the proxy → paste the Base URL into **Cursor Settings → Models** → use `deepseek-v4-pro` as your coding model in Cursor.

**Repository:** https://github.com/taoorange/deepseek-cursor-bridge

### Features

- Sidebar control panel and status bar shortcut
- One-click start / stop / restart of the proxy process
- Automatic HTTPS exposure via ngrok for Cursor Models configuration
- Setup wizard and log output for troubleshooting

### Prerequisites

Before use, make sure you have:

1. [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy) installed (follow upstream docs)
2. [ngrok](https://ngrok.com/) — see [ngrok setup](#ngrok-installation-and-configuration)
3. A valid DeepSeek API Key

---

### ngrok Installation and Configuration

#### Why ngrok?

Cursor **Models** settings require the Base URL to be a **public HTTPS address**. Local URLs such as `http://127.0.0.1:9000` will not work.

When this extension starts `deepseek-cursor-proxy`, it enables an **ngrok tunnel** by default, mapping the local proxy port (default `9000`) to an address like `https://xxxx.ngrok-free.dev`. The **Base URL** you copy from the control panel is that HTTPS URL and must end with `/v1`.

#### Step 1: Create an ngrok account

1. Sign up at https://ngrok.com (free tier is sufficient)
2. Open the Dashboard: https://dashboard.ngrok.com
3. Copy your token from **Your Authtoken**

The free tier assigns a random subdomain on each start; paid plans support reserved domains (see [Fixed ngrok URL](#fixed-ngrok-url-optional) below).

#### Step 2: Install ngrok

Use any method below; `ngrok version` should work in your terminal afterward.

**macOS — Homebrew (recommended):**

```bash
brew install ngrok
```

**macOS — official package:** download from https://ngrok.com/download and place `ngrok` on your PATH (e.g. `/usr/local/bin`).

**Linux — Debian / Ubuntu:**

```bash
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
  && echo "deb https://ngrok-agent.s3.amazonaws.com bookworm main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list \
  && sudo apt update && sudo apt install ngrok
```

**Linux — binary:** download for your architecture from https://ngrok.com/download, then:

```bash
sudo mv ngrok /usr/local/bin/
```

**Windows:**

1. Download the zip from https://ngrok.com/download
2. Extract `ngrok.exe` to a fixed folder (e.g. `C:\Tools\ngrok`)
3. Add that folder to your system **PATH**

Or use Chocolatey: `choco install ngrok` · Scoop: `scoop install ngrok`

#### Step 3: Configure authtoken (required)

Replace `<your-token>` with the value from the Dashboard:

```bash
ngrok config add-authtoken <your-token>
```

This writes the token to your local config file (typically `~/.config/ngrok/ngrok.yml` on macOS/Linux). **You only need to do this once.**

Verify:

```bash
ngrok version
ngrok config check
```

If `config check` passes, the authtoken is active.

#### Step 4: Use with this extension

1. Ensure **Enable ngrok tunnel** is checked in the control panel or settings (`deepseekBridge.ngrok`, default `true`)
2. Click **Start Proxy** in the control panel
3. Wait until status is **Running**; the panel shows a **Base URL** such as:

   ```text
   https://abc123.ngrok-free.dev/v1
   ```

4. Click **Copy Base URL** and paste it into **Cursor Settings → Models → Override OpenAI Base URL**

The extension does **not** start ngrok itself; `deepseek-cursor-proxy` invokes the local `ngrok` CLI with `--ngrok`. Install ngrok and configure the authtoken first.

#### Fixed ngrok URL (optional)

On the free tier, the subdomain may change after each restart — update Base URL in Cursor accordingly.

With a paid ngrok plan and a reserved domain, set **Fixed ngrok URL** in the panel or `deepseekBridge.ngrokUrl`, e.g.:

```text
https://your-name.ngrok-free.app
```

Save and **restart** the proxy. The extension appends `/v1` if you omit it.

#### Disabling ngrok

Set `deepseekBridge.ngrok` to `false` or uncheck **Enable ngrok tunnel**. Base URL becomes local `http://127.0.0.1:9000/v1` only — **Cursor Models usually cannot use this**. Disable ngrok only when debugging the proxy locally.

#### ngrok troubleshooting

| Symptom | Action |
|---------|--------|
| No Base URL for a long time after start | Open **Show Logs**; ensure `ngrok` is on PATH and `ngrok config check` passes |
| authtoken / authentication errors in logs | Run `ngrok config add-authtoken <token>` again |
| `command not found: ngrok` | Install ngrok and add it to PATH; reopen the terminal |
| Base URL changes every restart | Normal on free tier; use a reserved domain or copy Base URL after each restart |
| Cursor still cannot connect | Base URL must be **HTTPS** and end with **`/v1`**; verify DeepSeek API Key |
| Tunnel up but requests time out | Check firewall; ensure port `deepseekBridge.port` (default 9000) is free |

Official docs: https://ngrok.com/docs

---

### Installation

#### From the extension marketplace (recommended)

In Cursor, open Extensions, search **DeepSeek Cursor Bridge**, install, then restart Cursor.

| Marketplace | Link |
|-------------|------|
| Open VSX (Cursor default) | https://open-vsx.org/extension/taoorange/deepseek-cursor-bridge |
| VS Code Marketplace | https://marketplace.visualstudio.com/items?itemName=taotao.deepseek-cursor-bridge |

#### From a VSIX file

```bash
cursor --install-extension ./deepseek-cursor-bridge-<version>.vsix
```

Restart Cursor; the **DeepSeek Bridge** icon appears in the activity bar.

---

### Quick start

#### Step 1: Configure proxy path

Point to your local `deepseek-cursor-proxy` executable:

- Command Palette → `DeepSeek Bridge: Setup Wizard` (recommended)
- Or **Settings → DeepSeek Bridge** → `proxyPath` and `proxyCwd`

| Platform / install | `proxyPath` example |
|--------------------|---------------------|
| Linux / macOS, pip user install | `~/.local/bin/deepseek-cursor-proxy` |
| Linux / macOS, virtualenv | `<install-dir>/.venv/bin/deepseek-cursor-proxy` |
| Windows, pip user install | `%USERPROFILE%\.local\bin\deepseek-cursor-proxy.exe` |
| Windows, virtualenv | `<install-dir>\.venv\Scripts\deepseek-cursor-proxy.exe` |

Replace `<install-dir>` with where you cloned or installed deepseek-cursor-proxy.

#### Step 2: Open the control panel

| Method | Action |
|--------|--------|
| Sidebar | Click **DeepSeek Bridge** in the activity bar |
| Status bar | Click **DeepSeek** in the bottom-right |
| Command Palette | `DeepSeek Bridge: Open Control Panel` |

Shortcuts: macOS `Cmd+Shift+P` · Windows / Linux `Ctrl+Shift+P`

#### Step 3: Start proxy and configure Cursor

1. Click **Start Proxy** in the control panel
2. Wait for status **Running** and an ngrok **Cursor Base URL** (HTTPS, ending with `/v1`)
3. Click **Copy Base URL**
4. Open **Cursor Settings → Models**
5. Under **API Keys**, turn on **Override OpenAI Base URL** and paste the Base URL
6. Enter your **DeepSeek API Key** and add model `deepseek-v4-pro`

##### Visual guide: ngrok URL → Cursor Models

After ngrok is running, the control panel shows the HTTPS address you need. Copy **Cursor Base URL** and paste it into Cursor Models:

![DeepSeek Bridge control panel showing the ngrok Cursor Base URL](https://github.com/taoorange/deepseek-cursor-bridge/blob/main/media/readme-control-panel-base-url.png)

In **Cursor Settings → Models → API Keys**, enable **Override OpenAI Base URL** and paste the same address (must end with `/v1`):

![Cursor Models settings with Override OpenAI Base URL filled in](https://github.com/taoorange/deepseek-cursor-bridge/blob/main/media/readme-cursor-models-base-url.png)

> **Tip:** On the ngrok free tier the subdomain may change after each restart — copy the Base URL again and update Cursor Models if the proxy was restarted.

---

### Control panel

**DeepSeek Bridge → Proxy Control**:

| Feature | Description |
|---------|-------------|
| Status | Stopped / Starting / Running / Error |
| Base URL | HTTPS address for Cursor Models |
| Start / Stop / Restart | Manage the proxy child process |
| Copy Base URL | Copy to clipboard |
| Port / ngrok | Save settings, then restart proxy |
| Auto-start | Run proxy when Cursor launches |
| Show logs | Open proxy output in the Output panel |

---

### Commands

Search `DeepSeek Bridge` in the Command Palette:

| Command | Description |
|---------|-------------|
| Open Control Panel | Open control panel |
| Start Proxy | Start proxy |
| Stop Proxy | Stop proxy |
| Restart Proxy | Restart proxy |
| Copy Base URL | Copy Base URL |
| Show Logs | View logs |
| Setup Wizard | Configuration wizard |

---

### Settings

**Settings → DeepSeek Bridge** or save from the control panel:

| Setting | Default | Description |
|---------|---------|-------------|
| `deepseekBridge.proxyPath` | (required) | Path to proxy executable |
| `deepseekBridge.proxyCwd` | (required) | Proxy working directory |
| `deepseekBridge.port` | `9000` | Local listen port |
| `deepseekBridge.ngrok` | `true` | Enable ngrok tunnel |
| `deepseekBridge.ngrokUrl` | empty | Optional fixed ngrok domain |
| `deepseekBridge.autoStart` | `true` | Auto-start with Cursor |
| `deepseekBridge.verbose` | `false` | Verbose logging |

---

### Troubleshooting

| Issue | Suggestion |
|-------|------------|
| Start failed | Check panel error → **Show Logs**; verify `proxyPath` exists |
| ngrok errors | See [ngrok troubleshooting](#ngrok-troubleshooting); run `ngrok config check` |
| Cursor cannot connect | Base URL must be HTTPS and end with `/v1` |
| Settings not applied | Save, then click **Restart** |
| Extension not found | Restart Cursor; confirm extension is enabled |

Report issues at [GitHub Issues](https://github.com/taoorange/deepseek-cursor-bridge/issues) with logs and environment details.

---

### Build from source (optional)

For local development only:

```bash
git clone https://github.com/taoorange/deepseek-cursor-bridge.git
cd deepseek-cursor-bridge
npm install
npm run compile
```

Open the folder in Cursor and press **F5** to debug the extension.

### Links

- Repository: https://github.com/taoorange/deepseek-cursor-bridge
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)

This extension runs `deepseek-cursor-proxy` as a child process for process management, UI, and logs — it does not reimplement the proxy core.

---

<a id="中文"></a>

## 中文

**DeepSeek Cursor Bridge** 是一款 **Cursor 代码开发工具** 扩展，用于在 Cursor 中通过代理接入 **DeepSeek V4 Pro**（`deepseek-v4-pro`），在 Agent、Composer 和对话中使用该模型进行编程辅助。

Cursor 本身对 DeepSeek V4 思考模式（thinking mode）支持不完整。本扩展在本地运行 [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy) 作为代理，经 ngrok 暴露 HTTPS 地址供 Cursor Models 调用，并提供可视化控制面板，可在 IDE 内一键启停代理、复制 Base URL、查看日志，无需反复切换终端。

简而言之：安装扩展 → 启动代理 → 将 Base URL 填入 **Cursor Settings → Models** → 在 Cursor 中使用 `deepseek-v4-pro` 作为编程模型。

**仓库地址：** https://github.com/taoorange/deepseek-cursor-bridge

### 功能

- 侧边栏控制面板与状态栏快捷入口
- 一键启动 / 停止 / 重启代理进程
- 自动通过 ngrok 暴露 HTTPS 地址，供 Cursor Models 配置
- 配置向导与日志输出，便于排查问题

### 前置条件

使用前请确保本机已具备：

1. [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy)（按上游文档完成安装）
2. [ngrok](https://ngrok.com/)（见下方 [ngrok 安装与配置](#ngrok-安装与配置)）
3. 有效的 DeepSeek API Key

---

### ngrok 安装与配置

#### 为什么需要 ngrok？

Cursor 的 **Models** 设置要求 Base URL 为 **HTTPS 公网地址**，不能填 `http://127.0.0.1:9000` 这类本地地址。

本扩展启动 `deepseek-cursor-proxy` 时，默认会同时建立 **ngrok 隧道**，把本机代理端口（默认 `9000`）映射为一个 `https://xxxx.ngrok-free.dev` 形式的地址。你在控制面板复制的 **Base URL** 即该 HTTPS 地址，末尾须带 `/v1`。

#### 第一步：注册 ngrok 账号

1. 打开 https://ngrok.com 并注册免费账号
2. 登录后进入 Dashboard：https://dashboard.ngrok.com
3. 在 **Your Authtoken** 页面复制你的 token（一长串字符）

免费版每次启动会分配随机子域名；付费版可绑定固定域名（见下文「固定 ngrok URL」）。

#### 第二步：安装 ngrok

任选一种方式，安装后终端能执行 `ngrok version` 即可。

**macOS — Homebrew（推荐）：**

```bash
brew install ngrok
```

**macOS — 官方安装包：** 从 https://ngrok.com/download 下载，解压后将 `ngrok` 放到 PATH 中（如 `/usr/local/bin`）。

**Linux — Debian / Ubuntu：**

```bash
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
  && echo "deb https://ngrok-agent.s3.amazonaws.com bookworm main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list \
  && sudo apt update && sudo apt install ngrok
```

**Linux — 二进制：**

```bash
# 按架构从 https://ngrok.com/download 下载，解压后：
sudo mv ngrok /usr/local/bin/
```

**Windows：**

1. 从 https://ngrok.com/download 下载 Windows 版 zip
2. 解压 `ngrok.exe` 到固定目录（如 `C:\Tools\ngrok`）
3. 将该目录加入系统 **PATH** 环境变量

或使用 Chocolatey：`choco install ngrok` · Scoop：`scoop install ngrok`

#### 第三步：配置 Authtoken（必做）

在终端执行（将 `<你的token>` 替换为 Dashboard 中复制的值）：

```bash
ngrok config add-authtoken <你的token>
```

该命令会把 token 写入本机配置文件（macOS / Linux 一般为 `~/.config/ngrok/ngrok.yml`，Windows 为 `%USERPROFILE%\.ngrok2\ngrok.yml` 或 `%LOCALAPPDATA%\ngrok\ngrok.yml`）。**只需配置一次**，后续启动代理时会自动使用。

验证安装与配置：

```bash
ngrok version
ngrok config check
```

若 `config check` 通过，说明 authtoken 已生效。

#### 第四步：与本扩展配合使用

1. 确保控制面板或设置中 **「启用 ngrok 隧道」** 已勾选（对应 `deepseekBridge.ngrok`，默认 `true`）
2. 在控制面板点击 **启动代理**
3. 等待状态变为 **运行中**，面板会显示 **Base URL**，形如：

   ```text
   https://abc123.ngrok-free.dev/v1
   ```

4. 点击 **复制 Base URL**，粘贴到 **Cursor Settings → Models → Override OpenAI Base URL**

扩展本身**不单独启动** ngrok 进程，而是由 `deepseek-cursor-proxy` 在启动时带上 `--ngrok` 参数调用本机已安装的 `ngrok` CLI。因此必须先完成上文安装与 authtoken 配置。

#### 固定 ngrok URL（可选）

免费版每次重启代理，子域名可能变化，需在 Cursor 中更新 Base URL。

若你有 ngrok 付费计划并预留了固定域名，可在控制面板填写 **固定 ngrok URL**，或于设置中配置 `deepseekBridge.ngrokUrl`，例如：

```text
https://your-name.ngrok-free.app
```

保存后 **重启代理**。扩展会自动补全 `/v1` 后缀（若你未填写）。

#### 关闭 ngrok

将 `deepseekBridge.ngrok` 设为 `false`，或在控制面板取消勾选「启用 ngrok 隧道」。此时 Base URL 仅为本地 `http://127.0.0.1:9000/v1`，**Cursor Models 通常无法使用**。仅在本地调试 proxy 本身时建议关闭。

#### ngrok 常见问题

| 现象 | 处理 |
|------|------|
| 启动代理后长时间无 Base URL | 点击 **查看日志**；确认 `ngrok` 在 PATH 中且 `ngrok config check` 通过 |
| 日志出现 authtoken / authentication 错误 | 重新执行 `ngrok config add-authtoken <token>` |
| `command not found: ngrok` | 未安装或未加入 PATH；按上文安装后重开终端 |
| Base URL 每次重启都变 | 免费版正常现象；升级 ngrok 固定域名，或每次重启后重新复制 Base URL |
| Cursor 仍连不上 | 确认 Base URL 为 **HTTPS** 且以 **`/v1`** 结尾；检查 DeepSeek API Key 是否有效 |
| 隧道建立但请求超时 | 检查本机防火墙；确认端口 `deepseekBridge.port`（默认 9000）未被占用 |

更多 ngrok 官方文档：https://ngrok.com/docs

---

### 安装

#### 从扩展市场安装（推荐）

在 Cursor 中打开扩展视图，搜索 **DeepSeek Cursor Bridge** 并安装，完成后重启 Cursor。

| 市场 | 链接 |
|------|------|
| Open VSX（Cursor 默认源） | https://open-vsx.org/extension/taoorange/deepseek-cursor-bridge |
| VS Code Marketplace | https://marketplace.visualstudio.com/items?itemName=taotao.deepseek-cursor-bridge |

#### 从 VSIX 文件安装

```bash
cursor --install-extension ./deepseek-cursor-bridge-<version>.vsix
```

安装后重启 Cursor，左侧活动栏会出现 **DeepSeek Bridge** 图标。

---

### 快速开始

#### 第一步：配置 proxy 路径

首次使用请指定本机的 `deepseek-cursor-proxy` 可执行文件路径：

- 命令面板 → `DeepSeek Bridge: Setup Wizard`（推荐）
- 或打开 **Settings → DeepSeek Bridge**，设置 `proxyPath` 与 `proxyCwd`

| 平台 / 安装方式 | proxyPath 示例 |
|----------------|----------------|
| Linux / macOS，pip 用户安装 | `~/.local/bin/deepseek-cursor-proxy` |
| Linux / macOS，虚拟环境 | `<安装目录>/.venv/bin/deepseek-cursor-proxy` |
| Windows，pip 用户安装 | `%USERPROFILE%\.local\bin\deepseek-cursor-proxy.exe` |
| Windows，虚拟环境 | `<安装目录>\.venv\Scripts\deepseek-cursor-proxy.exe` |

请将 `<安装目录>` 替换为你实际克隆或安装 deepseek-cursor-proxy 的位置。

#### 第二步：打开控制面板

| 方式 | 操作 |
|------|------|
| 侧边栏 | 点击活动栏 **DeepSeek Bridge** 图标 |
| 状态栏 | 点击右下角 **DeepSeek** 状态 |
| 命令面板 | `DeepSeek Bridge: Open Control Panel` |

macOS 命令面板快捷键：`Cmd+Shift+P`；Windows / Linux：`Ctrl+Shift+P`。

#### 第三步：启动代理并配置 Cursor

1. 在控制面板点击 **启动代理**（或 **Start Proxy**）
2. 等待状态变为 **运行中** / **Running**，并出现 ngrok 生成的 **Cursor Base URL**（HTTPS，末尾须带 `/v1`）
3. 点击 **复制 Base URL** / **Copy Base URL**
4. 打开 **Cursor Settings → Models**
5. 在 **API Keys** 区域，开启 **Override OpenAI Base URL**，粘贴上一步复制的地址
6. 填入 **DeepSeek API Key**，并添加模型 `deepseek-v4-pro`

##### 示意图：ngrok 地址 → Cursor Models

ngrok 隧道建立后，控制面板会显示供 Cursor 使用的 HTTPS 地址。复制 **Cursor Base URL**，粘贴到 Cursor Models 配置中：

![DeepSeek Bridge 控制面板中的 ngrok Cursor Base URL](https://github.com/taoorange/deepseek-cursor-bridge/blob/main/media/readme-control-panel-base-url.png)

在 **Cursor Settings → Models → API Keys** 中，打开 **Override OpenAI Base URL** 开关，粘贴相同地址（须以 `/v1` 结尾）：

![Cursor Models 设置中的 Override OpenAI Base URL](https://github.com/taoorange/deepseek-cursor-bridge/blob/main/media/readme-cursor-models-base-url.png)

> **提示：** ngrok 免费版每次重启代理后子域名可能变化，若重启过 proxy，请重新复制 Base URL 并更新 Cursor Models 中的配置。

---

### 控制面板

**DeepSeek Bridge → 代理控制** 提供：

| 功能 | 说明 |
|------|------|
| 状态显示 | 已停止 / 启动中 / 运行中 / 错误 |
| Base URL | 供 Cursor Models 使用的 HTTPS 地址 |
| 启动 / 停止 / 重启 | 管理 proxy 子进程 |
| 复制 Base URL | 一键复制到剪贴板 |
| 端口 / ngrok | 修改后保存配置，再重启代理 |
| 自动启动 | Cursor 启动时是否自动运行代理 |
| 查看日志 | 在 Output 面板查看代理输出 |

---

### 常用命令

在命令面板中搜索 `DeepSeek Bridge`：

| 命令 | 说明 |
|------|------|
| Open Control Panel | 打开控制面板 |
| Start Proxy | 启动代理 |
| Stop Proxy | 停止代理 |
| Restart Proxy | 重启代理 |
| Copy Base URL | 复制 Base URL |
| Show Logs | 查看日志 |
| Setup Wizard | 配置向导 |

---

### 配置项

在 **Settings → DeepSeek Bridge** 中修改，或在控制面板保存：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `deepseekBridge.proxyPath` | 需配置 | proxy 可执行文件路径 |
| `deepseekBridge.proxyCwd` | 需配置 | proxy 工作目录 |
| `deepseekBridge.port` | `9000` | 本地监听端口 |
| `deepseekBridge.ngrok` | `true` | 是否启用 ngrok 隧道 |
| `deepseekBridge.ngrokUrl` | 空 | 可选的固定 ngrok 域名 |
| `deepseekBridge.autoStart` | `true` | Cursor 启动时自动运行 |
| `deepseekBridge.verbose` | `false` | 是否输出详细日志 |

---

### 故障排查

| 现象 | 建议处理 |
|------|----------|
| 启动失败 | 查看控制面板错误信息，点击 **查看日志**；确认 `proxyPath` 存在且可执行 |
| ngrok 报错 | 见上文 [ngrok 常见问题](#ngrok-常见问题)；运行 `ngrok config check` |
| Cursor 无法连接 | Base URL 须为 HTTPS，且以 `/v1` 结尾 |
| 修改配置无效 | 保存后点击 **重启** |
| 找不到扩展 | 重启 Cursor，并在扩展列表确认已启用 |

仍无法解决时，可到 [Issues](https://github.com/taoorange/deepseek-cursor-bridge/issues) 反馈，并附上日志与系统环境。

---

### 从源码构建（可选）

仅用于本地开发调试：

```bash
git clone https://github.com/taoorange/deepseek-cursor-bridge.git
cd deepseek-cursor-bridge
npm install
npm run compile
```

用 Cursor 打开克隆后的目录，按 **F5** 进入扩展调试。

### 相关链接

- 项目仓库：https://github.com/taoorange/deepseek-cursor-bridge
- 架构说明：[ARCHITECTURE.md](./ARCHITECTURE.md)

本扩展通过子进程调用 `deepseek-cursor-proxy`，负责进程管理、界面与日志展示，不重写 proxy 核心逻辑。
