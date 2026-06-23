# DeepSeek Cursor Bridge

在 Cursor 中集成 [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy) 的扩展。提供可视化控制面板，可在 IDE 内一键启停代理、复制 Base URL、查看日志，无需反复切换终端。

## 功能

- 侧边栏控制面板与状态栏快捷入口
- 一键启动 / 停止 / 重启代理进程
- 自动通过 ngrok 暴露 HTTPS 地址，供 Cursor Models 配置
- 配置向导与日志输出，便于排查问题

## 前置条件

使用前请确保本机已具备：

1. [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy)（按上游文档完成安装）
2. [ngrok](https://ngrok.com/)，并已执行：`ngrok config add-authtoken <你的 token>`
3. 有效的 DeepSeek API Key

---

## 安装

### 从扩展市场安装（推荐）

在 Cursor 中打开扩展视图，搜索 **DeepSeek Cursor Bridge** 并安装，完成后重启 Cursor。

| 市场 | 链接 |
|------|------|
| Open VSX（Cursor 默认源） | https://open-vsx.org/extension/taoorange/deepseek-cursor-bridge |
| VS Code Marketplace | https://marketplace.visualstudio.com/items?itemName=taotao.deepseek-cursor-bridge |

### 从 VSIX 文件安装

若你持有打包好的 `.vsix` 文件，在终端执行（将路径替换为实际文件位置）：

```bash
cursor --install-extension ./deepseek-cursor-bridge-0.1.1.vsix
```

安装后重启 Cursor，左侧活动栏会出现 **DeepSeek Bridge** 图标。

---

## 快速开始

### 第一步：配置 proxy 路径

首次使用请指定本机的 `deepseek-cursor-proxy` 可执行文件路径：

- 命令面板 → `DeepSeek Bridge: Setup Wizard`（推荐）
- 或打开 **Settings → DeepSeek Bridge**，设置 `proxyPath` 与 `proxyCwd`

`proxyPath` 填写可执行文件，`proxyCwd` 填写 deepseek-cursor-proxy 的项目根目录。常见示例：

| 平台 / 安装方式 | proxyPath 示例 |
|----------------|----------------|
| Linux / macOS，pip 用户安装 | `~/.local/bin/deepseek-cursor-proxy` |
| Linux / macOS，虚拟环境 | `<安装目录>/.venv/bin/deepseek-cursor-proxy` |
| Windows，pip 用户安装 | `%USERPROFILE%\.local\bin\deepseek-cursor-proxy.exe` |
| Windows，虚拟环境 | `<安装目录>\.venv\Scripts\deepseek-cursor-proxy.exe` |

请将 `<安装目录>` 替换为你实际克隆或安装 deepseek-cursor-proxy 的位置。

### 第二步：打开控制面板

| 方式 | 操作 |
|------|------|
| 侧边栏 | 点击活动栏 **DeepSeek Bridge** 图标 |
| 状态栏 | 点击右下角 **DeepSeek** 状态 |
| 命令面板 | `DeepSeek Bridge: Open Control Panel` |

macOS 命令面板快捷键：`Cmd+Shift+P`；Windows / Linux：`Ctrl+Shift+P`。

### 第三步：启动代理并配置 Cursor

1. 在控制面板点击 **启动代理**
2. 等待状态变为 **运行中**，并出现 Base URL
3. 点击 **复制 Base URL**
4. 打开 **Cursor Settings → Models**，填入 Base URL 与 DeepSeek API Key
5. 添加模型 `deepseek-v4-pro`

---

## 控制面板

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

## 常用命令

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

## 配置项

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

## 故障排查

| 现象 | 建议处理 |
|------|----------|
| 启动失败 | 查看控制面板错误信息，点击 **查看日志**；确认 `proxyPath` 存在且可执行 |
| ngrok 报错 | 确认已安装 ngrok 并完成 `authtoken` 配置 |
| Cursor 无法连接 | Base URL 须为 HTTPS，且以 `/v1` 结尾 |
| 修改配置无效 | 保存后点击 **重启** |
| 找不到扩展 | 重启 Cursor，并在扩展列表确认已启用 |

仍无法解决时，可到 [Issues](https://github.com/taoorange/deepseek-cursor-bridge/issues) 反馈，并附上日志与系统环境。

---

## 从源码构建（可选）

仅在你需要本地开发或自行打包时参考：

```bash
git clone https://github.com/taoorange/deepseek-cursor-bridge.git
cd deepseek-cursor-bridge
npm install
npm run compile
```

用 Cursor 打开克隆后的目录，按 **F5** 进入扩展调试。打包 VSIX：

```bash
npx @vscode/vsce package
```

---

## 相关链接

- 项目仓库：https://github.com/taoorange/deepseek-cursor-bridge
- 架构说明：[ARCHITECTURE.md](./ARCHITECTURE.md)

本扩展通过子进程调用 `deepseek-cursor-proxy`，负责进程管理、界面与日志展示，不重写 proxy 核心逻辑。
