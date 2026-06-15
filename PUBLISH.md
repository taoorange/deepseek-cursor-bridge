# DeepSeek Cursor Bridge — 打包与发布指南

本文档说明如何**本地打包 `.vsix` 安装使用**，以及如何**发布到 VS Code Marketplace** 与 **Open VSX**。

> **重要**：Cursor 扩展市场默认使用 **Open VSX**，不是 VS Code Marketplace。要在 Cursor 里搜到并安装，必须发布到 Open VSX；仅发布 VS Code Marketplace 不够。

---

## 目录

1. [前置说明](#前置说明)
2. [本地打包](#本地打包)
3. [本地安装与使用](#本地安装与使用)
4. [更新与卸载](#更新与卸载)
5. [发布到 VS Code Marketplace](#发布到-vs-code-marketplace)
6. [发布到 Open VSX（Cursor 扩展市场）](#发布到-open-vsxcursor-扩展市场)
7. [常见问题](#常见问题)

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
| **VS Code / Cursor 扩展** | `.vsix` | VS Code Marketplace、Open VSX、本地安装 |
| **Cursor Plugin** | `.cursor-plugin` | cursor.com/marketplace |

本项目是 **Extension**，应走 **VSIX + 双市场发布**，不是 Cursor Plugin 市场。

### 双市场说明

| 市场 | 用途 | 本项目扩展 ID | Publisher |
|------|------|--------------|-----------|
| **VS Code Marketplace** | VS Code 用户搜索安装 | `taotao.deepseek-cursor-bridge` | `taotao` |
| **Open VSX** | **Cursor 扩展市场**（默认源） | `taoorange.deepseek-cursor-bridge` | `taoorange` |

`package.json` 中 `publisher` 保持 **`taotao`**（对应 VS Code Marketplace）。Open VSX 因 namespace 冲突使用 **`taoorange`**，发布时需临时切换（见下文）。

### Marketplace 链接

#### VS Code Marketplace

| 用途 | 地址 |
|------|------|
| 发布者管理 | https://marketplace.visualstudio.com/manage/publishers/taotao |
| 扩展公开页面 | https://marketplace.visualstudio.com/items?itemName=taotao.deepseek-cursor-bridge |

#### Open VSX（Cursor 用）

| 用途 | 地址 |
|------|------|
| 注册 / 登录 | https://open-vsx.org |
| 用户设置（Token、Profile） | https://open-vsx.org/user-settings |
| Namespace 管理 | https://open-vsx.org/user-settings/namespaces |
| 扩展公开页面 | https://open-vsx.org/extension/taoorange/deepseek-cursor-bridge |

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

扩展 ID 格式为 `{publisher}.{name}`。因双市场 publisher 不同，卸载时需用实际安装来源的 ID：

| 安装来源 | 扩展 ID |
|---------|---------|
| Open VSX / Cursor 市场 | `taoorange.deepseek-cursor-bridge` |
| VS Code Marketplace | `taotao.deepseek-cursor-bridge` |
| 本地 VSIX | 取决于打包时 `package.json` 的 `publisher` |

卸载命令示例：

```bash
cursor --uninstall-extension taoorange.deepseek-cursor-bridge
```

或在 Extensions 面板中右键卸载。

---

## 发布到 VS Code Marketplace

适用于 **VS Code** 用户。Cursor 默认**不会**从此市场同步扩展，但仍建议发布以便 VS Code 用户安装。

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

### 第五步：用户在 VS Code 中安装

1. VS Code → **Extensions**
2. 搜索 **DeepSeek Cursor Bridge**
3. 点击 **Install**

Marketplace 扩展页面：

https://marketplace.visualstudio.com/items?itemName=taotao.deepseek-cursor-bridge

命令行安装：

```bash
code --install-extension taotao.deepseek-cursor-bridge
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

## 发布到 Open VSX（Cursor 扩展市场）

Cursor 从 2025 年起改用 [Open VSX Registry](https://open-vsx.org) 作为默认扩展源。要在 Cursor 扩展面板里**搜到并安装**，必须完成本节全部步骤。

### 第一步：注册 Open VSX 账号

1. 打开 https://open-vsx.org
2. 点击 **Sign In**，选择 **Log in with GitHub**
3. 授权后进入用户设置页

登录后可在 **PROFILE** 看到 Login name（本项目为 `taoorange`）。

---

### 第二步：签署 Publisher Agreement（必须）

创建 Access Token 前，必须先签署 Eclipse Foundation 发布者协议。

1. 左侧点击 **PROFILE**
2. 若提示 *You need to sign the Eclipse Foundation Open VSX Publisher Agreement...*，点击 **LOG IN WITH ECLIPSE**
3. 没有 Eclipse 账号则注册：https://accounts.eclipse.org/user/register
   - 注册时若出现图形验证码（*Click on the tile with the changed letter*），观察 3 个字母方块，等其中一个字母发生变化后点击该方块，通常需连续通过 2 轮
4. 登录 Eclipse 后回到 Open VSX Profile，按提示阅读并签署 **Publisher Agreement**
5. 签署成功后，Profile 页不再显示签署提示

---

### 第三步：创建 Access Token

1. 左侧点击 **ACCESS TOKENS**
2. 点击创建新 Token
3. **立即复制 token**（只显示一次，格式类似 `ovsxat_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）
4. **妥善保存，不要提交到 Git、不要发给他人**

可通过环境变量使用（推荐）：

```bash
export OVSX_PAT='你的OpenVSX_token'
```

若 token 泄露，立刻到 **ACCESS TOKENS** 页面撤销并重新创建。

---

### 第四步：创建 Namespace

Open VSX 的 namespace 对应 `package.json` 的 `publisher` 字段。发布前必须先创建 namespace（每个 publisher 只需一次）。

```bash
npx ovsx create-namespace <namespace名称> -p "$OVSX_PAT"
```

#### 本项目的 namespace 选择

| 尝试的 namespace | 结果 |
|-----------------|------|
| `taotao` | ❌ 被拒绝：与已有 `taotao7` 过于相似 |
| `taoorange` | ✅ 已创建并使用 |

因此 Open VSX 扩展 ID 为 **`taoorange.deepseek-cursor-bridge`**，与 VS Code Marketplace 的 `taotao.deepseek-cursor-bridge` 不同，属正常情况。

创建命令：

```bash
npx ovsx create-namespace taoorange -p "$OVSX_PAT"
```

成功输出：`🚀  Created namespace taoorange`

可在 https://open-vsx.org/user-settings/namespaces 查看已创建的 namespace。

---

### 第五步：打包并发布

Open VSX 要求 VSIX 内的 `publisher` 与 namespace 一致。本项目 `package.json` 为 `taotao`（VS Code 用），发布 Open VSX 时需**临时改为 `taoorange`**，发布完成后自动恢复。

#### 方式 A：一键脚本（推荐）

项目已提供 `scripts/publish-openvsx.sh`，会自动完成：临时改 publisher → 编译 → 打包 → 发布 → 恢复 `package.json`。

```bash
cd /Users/KXWELL/deepseek-cursor-bridge

# 设置 token 后一键发布
export OVSX_PAT='你的OpenVSX_token'
npm run publish:openvsx
```

未设置 `OVSX_PAT` 时，脚本会提示你粘贴 token（输入隐藏）。

发新版本并自动 bump 版本号：

```bash
export OVSX_PAT='你的OpenVSX_token'
npm run publish:openvsx -- --bump patch   # 0.1.0 → 0.1.1
npm run publish:openvsx -- --bump minor   # 0.1.0 → 0.2.0
npm run publish:openvsx -- --bump major   # 0.1.0 → 1.0.0
```

成功输出示例：

```text
🚀  Published taoorange.deepseek-cursor-bridge v0.1.0
Done: https://open-vsx.org/extension/taoorange/deepseek-cursor-bridge
```

#### 方式 B：手动逐步执行

```bash
cd /Users/KXWELL/deepseek-cursor-bridge
export OVSX_PAT='你的OpenVSX_token'

cp package.json package.json.bak
node -e "const p=require('./package.json'); p.publisher='taoorange'; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2)+'\n')"

npm run compile
npx @vscode/vsce package -o /tmp/deepseek-cursor-bridge.vsix --allow-missing-repository

mv package.json.bak package.json
npx ovsx publish /tmp/deepseek-cursor-bridge.vsix -p "$OVSX_PAT"
```

> 注意：打包过程中**不要**在项目目录留下 `package.json.bak`，否则可能被误打进 VSIX。

---

### 第六步：等待 Cursor 同步

Open VSX 发布成功后，Cursor 市场索引通常需要 **几小时到 1～2 天** 才会显示。

验证 Open VSX 是否已上线：

- 扩展页：https://open-vsx.org/extension/taoorange/deepseek-cursor-bridge
- 或在 Open VSX 首页搜索 **DeepSeek Cursor Bridge**

---

### 第七步：用户在 Cursor 中安装

同步完成后：

1. Cursor → **Extensions**
2. 搜索 **DeepSeek Cursor Bridge** 或 **taoorange**
3. 也可尝试精确 ID：`@id:taoorange.deepseek-cursor-bridge`
4. 点击 **Install**，安装后 **Cmd+Q 完全退出再打开**

命令行安装：

```bash
cursor --install-extension taoorange.deepseek-cursor-bridge
```

若市场尚未同步，可先用 VSIX 安装：

```bash
cursor --install-extension /tmp/deepseek-cursor-bridge.vsix
```

或在 Cursor 中：`Cmd+Shift+P` → **Extensions: Install from VSIX...**

---

### 发布后续版本到 Open VSX

每次发新版需：

1. 修改代码
2. 递增 `package.json` 的 `version`（如 `0.1.0` → `0.1.1`）
3. 更新 `CHANGELOG.md`
4. **分别**发布到两个市场：

```bash
cd /Users/KXWELL/deepseek-cursor-bridge
export OVSX_PAT='你的OpenVSX_token'

# --- VS Code Marketplace ---
npx @vscode/vsce publish patch

# --- Open VSX（一键脚本）---
npm run publish:openvsx -- --bump patch
```

建议顺序：先改 `version`，再分别发布，确保两个市场版本号一致。

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

### Q5：VS Code Marketplace 发布了，Cursor 里为什么搜不到？

Cursor 默认使用 **Open VSX**，不是 VS Code Marketplace。必须额外发布到 Open VSX，并等待 Cursor 同步索引。

### Q6：Open VSX 创建 namespace 报 too similar

```text
Namespace name 'taotao' is too similar to existing namespace(s): taotao7
```

换一个更独特的 namespace（本项目使用 `taoorange`），并确保 VSIX 内 `publisher` 与该 namespace 一致。

### Q7：Open VSX 无法创建 Access Token

Profile 页若提示需签署 Publisher Agreement，须先点击 **LOG IN WITH ECLIPSE** 完成 Eclipse 账号注册/登录并签署协议，之后才能在 **ACCESS TOKENS** 创建 token。

### Q8：两个市场的扩展 ID 不一样有问题吗？

没有。VS Code Marketplace 用 `taotao`，Open VSX 用 `taoorange`，是 namespace 冲突导致的正常情况。用户按扩展名 **DeepSeek Cursor Bridge** 搜索即可。

### Q9：Cursor Plugin Marketplace 能发吗？

不能用于本项目。Cursor Plugin 市场面向 `.cursor-plugin`（rules/skills/MCP 等），本扩展是 VS Code Extension，应发布到 **Open VSX** + **VS Code Marketplace**，或分发 **VSIX**。

### Q10：不想注册 Marketplace，如何分享给他人？

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

# 本地安装（VSIX）
cursor --install-extension ./deepseek-cursor-bridge-0.1.0.vsix

# 本地卸载
cursor --uninstall-extension taoorange.deepseek-cursor-bridge   # Open VSX / Cursor 安装的
cursor --uninstall-extension taotao.deepseek-cursor-bridge      # VS Code Marketplace 安装的

# VS Code Marketplace 发布（需先 login）
npx @vscode/vsce login taotao
npx @vscode/vsce publish
npx @vscode/vsce publish patch

# Open VSX 一键发布
export OVSX_PAT='你的token'
npm run publish:openvsx
npm run publish:openvsx -- --bump patch

# Open VSX 手动发布（备用）
npx ovsx publish /tmp/deepseek-cursor-bridge.vsix -p "$OVSX_PAT"

# Cursor 从 Open VSX 安装（同步完成后）
cursor --install-extension taoorange.deepseek-cursor-bridge
```

---

## 版本记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-06-15 | 初始文档 |
| 1.1 | 2026-06-15 | 补充 VS Code Marketplace 链接，publisher 更新为 taotao |
| 1.2 | 2026-06-15 | 新增 Open VSX 完整发布流程（Cursor 扩展市场） |
| 1.3 | 2026-06-15 | 新增 `npm run publish:openvsx` 一键发布脚本 |
