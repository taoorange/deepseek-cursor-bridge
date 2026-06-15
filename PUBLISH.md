# DeepSeek Cursor Bridge — 打包与发布指南

本文档说明如何**本地打包 `.vsix` 安装使用**，以及如何**发布到 VS Code Marketplace**（Cursor 可直接从该市场安装扩展）。

---

## 目录

1. [前置说明](#前置说明)
2. [本地打包](#本地打包)
3. [本地安装与使用](#本地安装与使用)
4. [更新与卸载](#更新与卸载)
5. [发布到 VS Code Marketplace](#发布到-vs-code-marketplace)
6. [常见问题](#常见问题)

---

## 前置说明

### 项目目录结构

```text
/Users/KXWELL/deepseek-cursor-bridge/
├── package.json
├── src/
├── dist/
├── ARCHITECTURE.md              # 架构文档
├── PUBLISH.md                   # 本文档
└── deepseek-cursor-bridge-0.1.0.vsix   # 打包产物
```

### 扩展类型说明

| 类型 | 格式 | 发布渠道 |
|------|------|----------|
| **VS Code / Cursor 扩展** | `.vsix` | VS Code Marketplace、本地安装 |
| **Cursor Plugin** | `.cursor-plugin` | cursor.com/marketplace |

本项目是 **Extension**，应走 **VSIX / VS Code Marketplace**，不是 Cursor Plugin 市场。

### Marketplace 链接

| 用途 | 地址 |
|------|------|
| 发布者管理（上传、更新、查看校验状态） | https://marketplace.visualstudio.com/manage/publishers/taotao |
| 扩展公开页面（分享、安装） | https://marketplace.visualstudio.com/items?itemName=taotao.deepseek-cursor-bridge |

扩展 ID：`taotao.deepseek-cursor-bridge`

### 用户侧依赖（安装扩展后仍需）

- [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy)
- [ngrok](https://ngrok.com/)（并配置 `ngrok config add-authtoken <token>`）
- DeepSeek API Key

---

## 本地打包

### 1. 进入扩展目录

```bash
cd /Users/KXWELL/deepseek-cursor-bridge
```

### 2. 安装依赖（首次或依赖变更后）

```bash
npm install
```

### 3. 编译

```bash
npm run compile
```

### 4. 打包为 VSIX

```bash
npx @vscode/vsce package --allow-missing-repository
```

成功后会生成：

```text
deepseek-cursor-bridge-0.1.0.vsix
```

版本号来自 `package.json` 的 `"version"` 字段。

### 5. 一键打包（推荐）

```bash
cd /Users/KXWELL/deepseek-cursor-bridge
npm run compile && npx @vscode/vsce package --allow-missing-repository
```

### 打包前检查

| 检查项 | 说明 |
|--------|------|
| `engines.vscode` | 需与 `@types/vscode` 主版本兼容，否则 `vsce` 报错 |
| README 链接 | 避免 `../xxx.md`、`/Users/...` 等相对/本地路径链接 |
| `dist/extension.js` | 必须存在（由 `npm run compile` 生成） |
| `version` | 每次发新版需递增 |

### 可选：全局安装 vsce

```bash
npm install -g @vscode/vsce
vsce package --allow-missing-repository
```

---

## 本地安装与使用

### 方式 A：命令行安装

```bash
/Applications/Cursor.app/Contents/Resources/app/bin/cursor \
  --install-extension /Users/KXWELL/deepseek-cursor-bridge/deepseek-cursor-bridge-0.1.0.vsix
```

若已配置 `cursor` 命令：

```bash
cursor --install-extension ./deepseek-cursor-bridge-0.1.0.vsix
```

**安装后完全退出 Cursor 再重新打开**（Cmd+Q 退出，不要只关窗口）。

### 方式 B：界面安装

1. 打开 Cursor
2. 左侧 **Extensions（扩展）**
3. 右上角 **`...`** → **Install from VSIX...**
4. 选择 `deepseek-cursor-bridge-0.1.0.vsix`
5. 重启 Cursor

### 安装后配置

1. `Cmd+Shift+P` → **DeepSeek Bridge: Open Control Panel**
2. 在控制面板点击 **启动代理**
3. **复制 Base URL**
4. **Cursor Settings → Models**：
   - 开启 **Override OpenAI Base URL**
   - 填入 Base URL（如 `https://xxxx.ngrok-free.dev/v1`）
   - 填入 DeepSeek API Key
   - 添加模型 `deepseek-v4-pro`

5. 在 **Settings → DeepSeek Bridge** 中配置本机 proxy 路径：

| 配置项 | 示例 |
|--------|------|
| `deepseekBridge.proxyPath` | `/Users/github/deepseek-cursor-proxy/.venv/bin/deepseek-cursor-proxy` |
| `deepseekBridge.proxyCwd` | `/Users/github/deepseek-cursor-proxy` |

### 与 F5 调试的区别

| | F5 调试 | VSIX 安装 |
|--|---------|-----------|
| 窗口 | Extension Development Host | 正常 Cursor |
| 是否需要开项目 | 需要打开扩展源码目录 | 不需要 |
| 适用场景 | 开发调试 | 日常正式使用 |

---

## 更新与卸载

### 更新扩展

1. 修改代码
2. 递增 `package.json` 中的 `version`（如 `0.1.0` → `0.1.1`）
3. 重新打包：

```bash
npm run compile
npx @vscode/vsce package --allow-missing-repository
```

4. 重新安装 VSIX（会覆盖旧版本）：

```bash
cursor --install-extension ./deepseek-cursor-bridge-0.1.1.vsix
```

### 卸载扩展

扩展 ID 格式为 `{publisher}.{name}`，当前为：

```text
taotao.deepseek-cursor-bridge
```

卸载命令：

```bash
cursor --uninstall-extension taotao.deepseek-cursor-bridge
```

或在 Extensions 面板中右键卸载。

---

## 发布到 VS Code Marketplace

Cursor 支持安装 VS Code Marketplace 上的扩展，发布后用户可直接搜索安装。

### 第一步：发布前准备

#### 1. 修改 `package.json`

```json
{
  "publisher": "你的发布者ID",
  "version": "0.1.0",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/你的用户名/deepseek-cursor-bridge"
  },
  "icon": "media/icon.png",
  "keywords": ["deepseek", "cursor", "proxy", "ngrok", "ai"]
}
```

| 字段 | 要求 |
|------|------|
| `publisher` | 不能是 `local`，需与 Marketplace 发布者 ID 一致 |
| `icon` | 建议 **128×128 PNG**（`media/icon.png`） |
| `license` | 项目根目录需有 `LICENSE` 文件 |
| `repository` | 建议填写 GitHub 仓库地址 |

#### 2. 添加 LICENSE 文件

例如 MIT：

```bash
# 在项目根目录创建 LICENSE 文件
```

#### 3. 完善 README

- 安装步骤
- 依赖说明（proxy、ngrok、API Key）
- 配置截图（可选）
- 避免本地绝对路径作为默认说明的唯一依据

#### 4. 本地验证

```bash
npm run compile
npx @vscode/vsce package
cursor --install-extension ./deepseek-cursor-bridge-0.1.0.vsix
```

确认安装后扩展可正常启动 proxy。

---

### 第二步：注册 Marketplace 发布者

1. 打开 https://marketplace.visualstudio.com/manage
2. 使用 Microsoft 账号登录
3. 点击 **Create publisher**
4. 填写：
   - **Publisher ID**：如 `taotao`（全局唯一，写入 `package.json` 的 `publisher`）
   - **Publisher name**：显示名称

本项目已注册发布者 **taotao**，管理页：

https://marketplace.visualstudio.com/manage/publishers/taotao

---

### 第三步：创建 Personal Access Token (PAT)

1. 打开 https://dev.azure.com
2. 右上角用户图标 → **Personal access tokens**
3. **+ New Token**：
   - **Name**：`vsce-publish`（任意）
   - **Organization**：All accessible organizations
   - **Expiration**：按需选择
   - **Scopes**：**Custom defined** → **Marketplace** → 勾选 **Manage**
4. 创建后**复制 token**（只显示一次，请妥善保存）

---

### 第四步：登录并发布

```bash
cd /Users/KXWELL/deepseek-cursor-bridge

# 登录（publisher 与 package.json 一致）
npx @vscode/vsce login taotao
# 提示时粘贴 PAT

# 发布（会自动执行 prepublish 编译）
npx @vscode/vsce publish
```

按版本号递增发布：

```bash
# 自动 bump patch 版本并发布（0.1.0 → 0.1.1）
npx @vscode/vsce publish patch

# minor / major
npx @vscode/vsce publish minor
npx @vscode/vsce publish major
```

---

### 第五步：用户在 Cursor 中安装

1. Cursor → **Extensions**
2. 搜索 **DeepSeek Cursor Bridge**
3. 点击 **Install**

Marketplace 扩展页面：

https://marketplace.visualstudio.com/items?itemName=taotao.deepseek-cursor-bridge

命令行安装（Marketplace 已发布后）：

```bash
cursor --install-extension taotao.deepseek-cursor-bridge
```

---

### 发布后续版本

```bash
# 1. 改代码
# 2. 更新 CHANGELOG.md
# 3. 发布
npx @vscode/vsce publish patch
```

---

## 常见问题

### Q1：`vsce package` 报 engines 版本错误

```text
@types/vscode ^1.120.0 greater than engines.vscode ^1.85.0
```

**解决**：将 `package.json` 中 `engines.vscode` 改为与 `@types/vscode` 兼容，例如：

```json
"engines": { "vscode": "^1.120.0" }
```

### Q2：README 链接导致打包失败

```text
The link '../ARCHITECTURE.md' will be broken in README.md
```

**解决**：README 中不要使用指向 VSIX 包外的相对链接，或改用纯文本说明。

本地打包可加参数：

```bash
npx @vscode/vsce package --allow-missing-repository
```

### Q3：`LICENSE not found` 警告

本地打包可忽略。发布 Marketplace 前建议添加 `LICENSE` 文件并在 `package.json` 声明 `"license": "MIT"`。

### Q4：安装 VSIX 后找不到命令

- 确认已**完全重启** Cursor
- `Cmd+Shift+P` → `Developer: Show Running Extensions`，确认扩展 **Activated**
- 检查 `deepseekBridge.proxyPath` 是否指向本机存在的 proxy 可执行文件

### Q5：Cursor Plugin Marketplace 能发吗？

不能用于本项目。Cursor Plugin 市场面向 `.cursor-plugin`（rules/skills/MCP 等），本扩展是 VS Code Extension，应发布到 **VS Code Marketplace** 或分发 **VSIX**。

### Q6：不想注册 Marketplace，如何分享给他人？

1. 打包 VSIX
2. 上传到 GitHub Release / 网盘 / 内网文件服务器
3. 对方执行：

```bash
cursor --install-extension deepseek-cursor-bridge-0.1.0.vsix
```

---

## 命令速查

```bash
# 本地打包
cd /Users/KXWELL/deepseek-cursor-bridge
npm run compile
npx @vscode/vsce package --allow-missing-repository

# 本地安装
cursor --install-extension ./deepseek-cursor-bridge-0.1.0.vsix

# 本地卸载
cursor --uninstall-extension taotao.deepseek-cursor-bridge

# Marketplace 发布（需先 login）
npx @vscode/vsce login taotao
npx @vscode/vsce publish
npx @vscode/vsce publish patch
```

---

## 版本记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-06-15 | 初始文档 |
| 1.1 | 2026-06-15 | 补充 Marketplace 链接，publisher 更新为 taotao |
