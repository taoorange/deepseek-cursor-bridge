# DeepSeek Cursor Bridge — 架构与开发方案

> 将 DeepSeek V4 接入 Cursor，替代独立运行的 `deepseek-cursor-proxy` 进程。

---

## 1. 背景与目标

### 1.1 现状

- Cursor 目前**不原生支持** DeepSeek V4 思考模式（thinking mode）的完整协议。
- 使用 DeepSeek V4 时，通常需要额外运行 [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy) 作为中间代理。
- Cursor **不是开源软件**，无法修改其内部 LLM 客户端源码。

### 1.2 目标

开发一款 **Cursor 扩展（Extension）**，将 proxy 的逻辑内嵌到插件中，使用户：

- 安装扩展 → 填写 DeepSeek API Key → 一键启动
- **无需**在终端手动运行 Python 脚本和 ngrok
- 在 Cursor Agent / Composer 中正常使用 DeepSeek V4（含 tool call）

### 1.3 能力边界（重要）

| 方案 | 能否替代 proxy | 说明 |
|------|----------------|------|
| 纯 `.cursor-plugin`（rules/skills/MCP/hooks） | ❌ | 管理规则、工具、自动化，**不能**接管 Chat/Agent 的 LLM 请求 |
| Cursor Hooks | ❌ | 可审计/拦截 prompt、shell 等，**不能**修改发往 DeepSeek 的 HTTP 请求体 |
| MCP Server | ❌ | 为 Agent 提供工具，**不是**主聊天模型 |
| **VS Code Extension + 内嵌 Proxy** | ✅ | 将 proxy 封装进扩展，用户无需手动开终端 |

**结论**：可行方案是 **Cursor Extension + 内嵌 HTTP Proxy**，而非纯 Cursor Plugin。

Cursor 目前没有公开 API 用于注册新的内置模型提供商。Agent / Composer 的 LLM 请求仍通过 **Settings → Models** 中的 OpenAI 兼容接口发出。用户首次仍需手动配置 Base URL，但后续由扩展自动管理 proxy 与隧道。

---

## 2. 核心问题：为什么需要 Proxy

DeepSeek V4 思考模式在 **tool call** 场景下有特殊协议要求：

1. 模型返回的 `reasoning_content`（思维链）必须在后续请求中**完整回传**。
2. Cursor 使用 OpenAI 兼容客户端，**不识别** `reasoning_content` 字段，会在多轮 tool call 时将其丢弃。
3. DeepSeek API 因此返回 HTTP 400：`reasoning_content must be passed back`。

Proxy 的核心职责：

- **缓存**每轮响应中的 `reasoning_content`（SQLite，按对话前缀 SHA-256 索引）
- **注入** Cursor 后续请求中缺失的 `reasoning_content`
- **格式转换**（`functions` → `tools`、清理 Cursor 特有字段等）
- **响应改写**（SSE 流聚合、将 reasoning 镜像为 Cursor 可见的 Markdown）

参考实现：[yxlao/deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy)

---

## 3. 系统架构

### 3.1 总体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Cursor IDE                           │
│  ┌──────────────┐         ┌─────────────────────────────┐   │
│  │ Agent/       │  HTTP   │ Settings → Models           │   │
│  │ Composer     │────────▶│ Base URL + API Key          │   │
│  └──────────────┘         └─────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                │ OpenAI 格式
                                │ POST /v1/chat/completions
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              DeepSeek Bridge Extension                      │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Setup 向导 │  │ HTTPS 隧道   │  │ 内嵌 HTTP Proxy  │   │
│  │ 状态栏 UI  │  │ ngrok/       │──▶│ localhost:9000   │   │
│  └────────────┘  │ cloudflared  │  └────────┬─────────┘   │
│                  └──────────────┘           │               │
│  ┌──────────────────────────────────────────▼─────────────┐ │
│  │              reasoning_content 缓存 (SQLite)             │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              SecretStorage (DeepSeek API Key)          │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   DeepSeek API        │
                    │ api.deepseek.com/v1   │
                    └───────────────────────┘
```

### 3.2 目录结构

```
deepseek-cursor-bridge/
├── package.json                 # 扩展清单
├── src/
│   ├── extension.ts             # 入口：激活/停用、注册命令
│   ├── proxy/
│   │   ├── server.ts            # HTTP 服务 (Express/Fastify)
│   │   ├── transform-request.ts # 请求改写（注入 reasoning_content）
│   │   ├── transform-response.ts# 响应改写（SSE 流、Markdown 镜像）
│   │   └── reasoning-cache.ts   # SQLite 缓存（SHA-256 key）
│   ├── tunnel/
│   │   └── ngrok.ts             # 或 cloudflared，产出 HTTPS URL
│   ├── ui/
│   │   ├── setup-wizard.ts      # 首次配置向导
│   │   └── status-bar.ts        # 显示 proxy 状态
│   └── types/
│       └── cursor.d.ts          # vscode.cursor 类型声明
├── media/                       # 图标、说明页
├── README.md
└── ARCHITECTURE.md              # 本文档
```

### 3.3 模块职责

| 模块 | 职责 |
|------|------|
| **Extension Host** | Cursor 启动时自动激活，管理 proxy / 隧道生命周期 |
| **Proxy Server** | 监听 `localhost:9000`，实现 `/v1/chat/completions` |
| **Reasoning Cache** | 按对话前缀 SHA-256 存/取 `reasoning_content` |
| **Request Transformer** | 补全 Cursor 丢掉的字段；`functions` → `tools` 等兼容 |
| **Response Transformer** | 流式 SSE 聚合；将 reasoning 镜像成 Cursor 可见的 Markdown |
| **Tunnel** | 暴露 HTTPS 公网 URL（Cursor 通常不接受纯 localhost） |
| **Setup UI** | 引导用户填 DeepSeek Key、复制 Base URL 到 Cursor 设置 |
| **SecretStorage** | 安全存储 DeepSeek API Key（不写入明文配置文件） |

---

## 4. 请求处理流程

```
1. Cursor POST /v1/chat/completions
        │
        ▼
2. Proxy 接收请求，解析 messages 数组
        │
        ▼
3. 计算 conversation prefix 的 SHA-256 hash
   （roles、content、tool_calls，不含 reasoning_content）
        │
        ▼
4. 从 SQLite 查找对应 reasoning_content
        │
        ▼
5. 注入到 assistant tool-call 消息中
   + 格式兼容转换（functions→tools 等）
        │
        ▼
6. 转发到 https://api.deepseek.com/v1/chat/completions
   （使用 SecretStorage 中的 DeepSeek API Key）
        │
        ▼
7. 收到响应 → 缓存新的 reasoning_content
   + SSE 流式聚合（如为 streaming）
   + 镜像 reasoning 为 Markdown <details> 块
        │
        ▼
8. 返回改写后的响应给 Cursor
```

### 4.1 缓存 Key 设计

- **Key**：`SHA-256(canonical_conversation_prefix + model + config_hash + api_key_hash)`
- **Value**：DeepSeek 返回的原始 `reasoning_content` 字符串
- **隔离**：不同对话线程 prefix 不同，避免 tool-call ID 碰撞
- **兼容**：不注入 synthetic thread ID 或 timestamp，保持 DeepSeek KV cache 命中率

---

## 5. 技术选型

| 组件 | 推荐方案 | 备选 |
|------|----------|------|
| 扩展语言 | TypeScript | — |
| HTTP 框架 | Express | Fastify |
| SQLite | better-sqlite3 | sql.js |
| HTTPS 隧道 | ngrok (npm) | cloudflared |
| 打包 | esbuild / webpack | — |
| 发布 | VS Code Marketplace (.vsix) | 本地 VSIX 安装 |

### 5.1 与现有 Python Proxy 的关系

| 方式 | 优点 | 缺点 |
|------|------|------|
| **TypeScript 重写**（推荐） | 单进程、无 Python 依赖、易维护 | 需移植逻辑 |
| **扩展内启动 Python 子进程** | 可快速复用现有代码 | 需打包 Python 运行时，体积大 |

---

## 6. 开发流程（从零开始）

### 6.1 环境准备

1. 安装 **Node.js 20+**（https://nodejs.org）
2. 安装 **Cursor**
3. 安装扩展脚手架：

```bash
npm install -g yo generator-code
```

4. （可选）注册 ngrok 账号：https://ngrok.com

### 6.2 创建项目

```bash
mkdir ~/deepseek-cursor-bridge && cd ~/deepseek-cursor-bridge
yo code
```

交互选项：

| 问题 | 选择 |
|------|------|
| What type? | **New Extension (TypeScript)** |
| Extension name | `deepseek-cursor-bridge` |
| Identifier | `deepseek-cursor-bridge` |
| Bundler | webpack 或 esbuild |
| Package manager | npm |

### 6.3 调试扩展

```bash
cd ~/deepseek-cursor-bridge
cursor .
```

按 `F5` 启动 **Extension Development Host**，在新窗口中测试扩展。

### 6.4 package.json 关键配置

```json
{
  "engines": { "vscode": "^1.85.0" },
  "activationEvents": ["onStartupFinished"],
  "contributes": {
    "commands": [
      { "command": "deepseek-bridge.start", "title": "DeepSeek Bridge: Start Proxy" },
      { "command": "deepseek-bridge.stop", "title": "DeepSeek Bridge: Stop Proxy" },
      { "command": "deepseek-bridge.setup", "title": "DeepSeek Bridge: Setup Wizard" }
    ],
    "configuration": {
      "title": "DeepSeek Bridge",
      "properties": {
        "deepseekBridge.port": {
          "type": "number",
          "default": 9000,
          "description": "Local proxy port"
        },
        "deepseekBridge.model": {
          "type": "string",
          "default": "deepseek-v4-pro",
          "description": "Default DeepSeek model"
        }
      }
    }
  }
}
```

### 6.5 依赖安装

```bash
npm install express better-sqlite3 ngrok
npm install -D @types/express @types/better-sqlite3
```

### 6.6 Cursor 专有类型（src/types/cursor.d.ts）

```typescript
declare module "vscode" {
  export namespace cursor {
    export namespace mcp {
      export const registerServer: (config: unknown) => void;
      export const unregisterServer: (name: string) => void;
    }
    export namespace plugins {
      export const registerPath: (path: string) => void;
      export const unregisterPath: (path: string) => void;
    }
  }
}
```

> 注：上述 API 用于 MCP / 插件路径注册，**不能**用于修改 Cursor 的 Base URL 设置。

### 6.7 用户配置 Cursor（首次）

扩展启动并输出 HTTPS URL 后，在 Cursor 主窗口：

1. 打开 **Cursor Settings → Models**
2. 启用 **Override OpenAI Base URL**
3. Base URL 填入扩展提供的 HTTPS 地址（如 `https://xxxx.ngrok-free.app/v1`）
4. API Key 填入任意非空值（真实 Key 由扩展 SecretStorage 管理）
5. 添加自定义模型：`deepseek-v4-pro` 或 `deepseek-v4-flash`
6. 在 Agent 中选择该模型

### 6.8 本地测试

```bash
# 测试 proxy 是否正常转发
curl http://127.0.0.1:9000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"model":"deepseek-v4-pro","messages":[{"role":"user","content":"hello"}]}'
```

测试清单：

- [ ] 扩展激活，状态栏显示 proxy 已启动
- [ ] curl 测试返回 DeepSeek 响应
- [ ] Cursor Agent 单轮对话正常
- [ ] Cursor Agent 触发 tool call 无 `reasoning_content` 400 错误
- [ ] 并发多对话不互相污染缓存

### 6.9 打包与安装

```bash
npm install -g @vscode/vsce
vsce package
# 生成 deepseek-cursor-bridge-0.0.1.vsix

# 安装
cursor --install-extension deepseek-cursor-bridge-0.0.1.vsix
```

---

## 7. 开发里程碑

| 阶段 | 目标 | 预计时间 |
|------|------|----------|
| **M1** | 扩展脚手架 + 最小 proxy 转发（无 reasoning 修复） | 1–2 天 |
| **M2** | reasoning_content 缓存与注入 | 2–3 天 |
| **M2.5** | SSE 流式响应处理 | 1–2 天 |
| **M3** | ngrok 自动隧道 + Setup 向导 | 1 天 |
| **M4** | 状态栏、错误提示、日志面板 | 1 天 |
| **M5** | 从 deepseek-cursor-proxy 补齐边界兼容 | 2–3 天 |
| **M6** | 打包发布、README、Marketplace 提交 | 1 天 |

---

## 8. 已知限制与注意事项

1. **Cursor 不接受 localhost** — Base URL 必须通过 ngrok / cloudflared 等提供 HTTPS 公网地址。
2. **API Key 存两处** — Cursor 设置里需填一个（可为占位值），真实 DeepSeek Key 存在扩展 SecretStorage。
3. **无法自动写入 Base URL** — Cursor Extension API 不提供修改 Models 设置的接口，首次需用户手动配置（扩展可提供复制按钮）。
4. **全局单一 Base URL** — Cursor 目前只有一个 Override Base URL；切回 GPT 等官方模型时需关闭 Override。
5. **纯 Plugin 方案不可行** — 不要仅做 `.cursor-plugin`，必须实现 Extension + Proxy。

---

## 9. 参考资料

- [deepseek-cursor-proxy](https://github.com/yxlao/deepseek-cursor-proxy) — Python 参考实现
- [deepseek-lane](https://github.com/guangzan/deepseek-lane) — 同类 Node.js 实现
- [DeepSeek Thinking Mode 文档](https://api-docs.deepseek.com/guides/thinking_mode) — reasoning_content 协议
- [Cursor Extension API](https://cursor.com/docs/extension-api) — MCP / Plugin 注册
- [Cursor Plugins 文档](https://cursor.com/docs/plugins) — Plugin 组件说明
- [VS Code Extension 开发指南](https://code.visualstudio.com/api/get-started/your-first-extension)

---

## 10. 版本记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1.0 | 2026-06-15 | 初始架构方案文档 |
