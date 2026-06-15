# DeepSeek Cursor Bridge

Cursor 扩展，集成 [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy)，提供**可视化控制面板**，在 IDE 内一键启停代理。

**仓库地址：** https://github.com/taoorange/deepseek-cursor-bridge

## 前置条件

1. 已安装 [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy)（安装后在本扩展设置里配置路径）
2. 已安装 [ngrok](https://ngrok.com/) 并执行：`ngrok config add-authtoken <你的token>`
3. 拥有 DeepSeek API Key

---

## 如何运行（开发调试）

### 第一步：安装依赖并编译

```bash
cd /Users/KXWELL/deepseek-cursor-bridge
npm install
npm run compile
```

### 第二步：在 Cursor 中打开扩展项目

```bash
cursor /Users/KXWELL/deepseek-cursor-bridge
```

### 第三步：启动扩展调试

1. 在 Cursor 中按 **F5**（或菜单 Run → Start Debugging）
2. 会弹出一个新窗口，标题带 **[Extension Development Host]**
3. **在新窗口里**使用扩展（不是原窗口）

### 第四步：打开控制面板

任选一种方式：

| 方式 | 操作 |
|------|------|
| 侧边栏 | 点击左侧活动栏 **DeepSeek Bridge** 图标（盾牌） |
| 状态栏 | 点击右下角 **DeepSeek** 状态 |
| 命令面板 | `Cmd+Shift+P` → 输入 `DeepSeek Bridge: Open Control Panel` |

### 第五步：在面板中操作

1. 点击 **启动代理**
2. 等待状态变为 **运行中**，Base URL 出现
3. 点击 **复制 Base URL**
4. 打开 **Cursor Settings → Models**，填入 Base URL 和 DeepSeek API Key
5. 添加模型 `deepseek-v4-pro`

---

## 控制面板功能

左侧 **DeepSeek Bridge → 代理控制** 面板提供：

| 功能 | 说明 |
|------|------|
| 状态显示 | 已停止 / 启动中 / 运行中 / 错误 |
| Base URL | 供 Cursor 配置的 HTTPS 地址 |
| 启动 / 停止 / 重启 | 控制 proxy 进程 |
| 复制 Base URL | 一键复制到剪贴板 |
| 端口 / ngrok 开关 | 修改后点「保存配置」，再重启代理 |
| 自动启动 | Cursor 打开时是否自动运行代理 |
| 查看日志 | 打开 Output 面板中的代理日志 |

---

## 打包安装（正式使用）

```bash
cd /Users/KXWELL/deepseek-cursor-bridge
npm install -g @vscode/vsce
vsce package
cursor --install-extension deepseek-cursor-bridge-0.1.0.vsix
```

安装后重启 Cursor，左侧会出现 DeepSeek Bridge 图标。

---

## 发布到扩展市场

扩展已发布到两个市场（Cursor 默认从 **Open VSX** 安装）：

| 市场 | 扩展 ID | 链接 |
|------|---------|------|
| Open VSX（Cursor） | `taoorange.deepseek-cursor-bridge` | https://open-vsx.org/extension/taoorange/deepseek-cursor-bridge |
| VS Code Marketplace | `taotao.deepseek-cursor-bridge` | https://marketplace.visualstudio.com/items?itemName=taotao.deepseek-cursor-bridge |

完整发布流程（注册 Token、双市场说明、常见问题）见 **[PUBLISH.md](./PUBLISH.md)**。

### 一键发布到 Open VSX

项目提供脚本 `scripts/publish-openvsx.sh`，自动完成：临时切换 publisher → 编译 → 打包 → 发布 → 恢复 `package.json`。

```bash
cd /Users/KXWELL/deepseek-cursor-bridge

# 设置 Open VSX Access Token 后一键发布
export OVSX_PAT='你的OpenVSX_token'
npm run publish:openvsx
```

未设置 `OVSX_PAT` 时，脚本会提示粘贴 token（输入隐藏）。

发新版本并自动 bump 版本号（Open VSX 不允许重复发布同一版本）：

```bash
export OVSX_PAT='你的OpenVSX_token'
npm run publish:openvsx -- --bump patch   # 0.1.0 → 0.1.1
```

发布到 **VS Code Marketplace** 仍使用 `vsce`：

```bash
npx @vscode/vsce login taotao
npx @vscode/vsce publish patch
```

---

## 命令列表

| 命令 | 说明 |
|------|------|
| DeepSeek Bridge: Open Control Panel | 打开控制面板 |
| DeepSeek Bridge: Start Proxy | 启动代理 |
| DeepSeek Bridge: Stop Proxy | 停止代理 |
| DeepSeek Bridge: Restart Proxy | 重启代理 |
| DeepSeek Bridge: Copy Base URL | 复制 Base URL |
| DeepSeek Bridge: Show Logs | 查看日志 |
| DeepSeek Bridge: Setup Wizard | 配置向导 |

---

## 配置项

**Settings → DeepSeek Bridge** 或通过控制面板保存：

| 配置 | 默认值 | 说明 |
|------|--------|------|
| `deepseekBridge.proxyPath` | `/Users/github/deepseek-cursor-proxy/.venv/bin/deepseek-cursor-proxy` | proxy 可执行文件 |
| `deepseekBridge.proxyCwd` | `/Users/github/deepseek-cursor-proxy` | 工作目录 |
| `deepseekBridge.port` | `9000` | 本地端口 |
| `deepseekBridge.ngrok` | `true` | 是否启用 ngrok |
| `deepseekBridge.ngrokUrl` | `""` | 固定 ngrok 域名（可选） |
| `deepseekBridge.autoStart` | `true` | 启动 Cursor 时自动运行 |
| `deepseekBridge.verbose` | `false` | 详细日志 |

---

## 故障排查

| 问题 | 处理 |
|------|------|
| 启动失败 | 面板查看错误信息 → **查看日志** |
| ngrok 报错 | 确认已安装 ngrok 并配置 authtoken |
| Cursor 连不上 | Base URL 必须以 `/v1` 结尾，且为 HTTPS |
| 修改配置不生效 | 保存配置后点击 **重启** |
| 扩展看不到 | 确认在 Extension Development Host 窗口中操作 |

---

## 架构说明

架构说明见项目根目录 `ARCHITECTURE.md`。

本扩展通过子进程调用 `deepseek-cursor-proxy`，负责进程管理、UI 控制和日志展示，不重写 proxy 核心逻辑。
