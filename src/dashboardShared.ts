import * as vscode from 'vscode';
import { ProxyManager, ProxyState } from './proxyManager';

export interface BridgeSettings {
	proxyPath: string;
	proxyCwd: string;
	host: string;
	port: number;
	ngrok: boolean;
	ngrokUrl: string;
	verbose: boolean;
	autoStart: boolean;
}

export function readSettings(): BridgeSettings {
	const config = vscode.workspace.getConfiguration('deepseekBridge');
	return {
		proxyPath: config.get<string>('proxyPath') ?? '',
		proxyCwd: config.get<string>('proxyCwd') ?? '',
		host: config.get<string>('host') ?? '127.0.0.1',
		port: config.get<number>('port') ?? 9000,
		ngrok: config.get<boolean>('ngrok') ?? true,
		ngrokUrl: config.get<string>('ngrokUrl') ?? '',
		verbose: config.get<boolean>('verbose') ?? false,
		autoStart: config.get<boolean>('autoStart') ?? true,
	};
}

export async function handleDashboardMessage(
	message: { type?: string; key?: string; value?: unknown },
	onRefresh: () => void
): Promise<void> {
	switch (message.type) {
		case 'ready':
		case 'refresh':
			onRefresh();
			break;
		case 'start':
			await vscode.commands.executeCommand('deepseek-cursor-bridge.start');
			break;
		case 'stop':
			await vscode.commands.executeCommand('deepseek-cursor-bridge.stop');
			break;
		case 'restart':
			await vscode.commands.executeCommand('deepseek-cursor-bridge.restart');
			break;
		case 'copyBaseUrl':
			await vscode.commands.executeCommand('deepseek-cursor-bridge.copyBaseUrl');
			break;
		case 'openLogs':
			await vscode.commands.executeCommand('deepseek-cursor-bridge.showLogs');
			break;
		case 'openExtensionSettings':
			await vscode.commands.executeCommand(
				'workbench.action.openSettings',
				'deepseekBridge'
			);
			break;
		case 'openCursorSettings':
			await vscode.commands.executeCommand(
				'deepseek-cursor-bridge.openCursorSettings'
			);
			break;
		case 'updateSetting': {
			const config = vscode.workspace.getConfiguration('deepseekBridge');
			const key = String(message.key ?? '');
			if (!key.startsWith('deepseekBridge.')) {
				break;
			}
			const shortKey = key.replace(/^deepseekBridge\./, '');
			await config.update(shortKey, message.value, vscode.ConfigurationTarget.Global);
			onRefresh();
			break;
		}
	}
}

export function getDashboardHtml(): string {
	const nonce = getNonce();

	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.5;
      max-width: 720px;
    }
    h1 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
    .subtitle { margin: 0 0 16px; color: var(--vscode-descriptionForeground); font-size: 12px; }
    .card {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 12px;
    }
    .status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .badge {
      display: inline-flex; align-items: center; padding: 2px 8px;
      border-radius: 999px; font-size: 11px; font-weight: 600;
    }
    .badge.running { background: #2ea04333; color: #3fb950; }
    .badge.stopped { background: #6e768133; color: var(--vscode-descriptionForeground); }
    .badge.starting { background: #d2992233; color: #e3b341; }
    .badge.error { background: #f8514933; color: #f85149; }
    .label { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }
    .url-box {
      word-break: break-all; padding: 8px 10px; border-radius: 6px;
      background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border);
      font-family: var(--vscode-editor-font-family); font-size: 12px; min-height: 36px;
    }
    .url-box.empty { color: var(--vscode-descriptionForeground); font-style: italic; }
    .error-box {
      margin-top: 8px; padding: 8px 10px; border-radius: 6px;
      background: #f8514915; border: 1px solid #f8514944; color: #f85149;
      font-size: 12px; word-break: break-word;
    }
    .btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    button {
      appearance: none; border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button:hover { background: var(--vscode-button-secondaryHoverBackground); }
    button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    button.primary:hover { background: var(--vscode-button-hoverBackground); }
    button.danger { background: #f8514922; color: #f85149; border-color: #f8514944; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .field { margin-bottom: 12px; }
    input[type="text"], input[type="number"] {
      width: 100%; padding: 6px 8px; border-radius: 4px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background); color: var(--vscode-input-foreground); font-size: 12px;
    }
    .checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; }
    .steps { margin: 0; padding-left: 18px; font-size: 12px; color: var(--vscode-descriptionForeground); }
    .steps li { margin-bottom: 6px; }
    .hint { margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h1>DeepSeek Bridge</h1>
  <p class="subtitle">管理 deepseek-cursor-proxy 代理</p>
  <div class="card">
    <div class="status-row">
      <span id="statusBadge" class="badge stopped">已停止</span>
      <span id="statusText">代理未运行</span>
    </div>
    <div class="label">Cursor Base URL（填入 Cursor Settings → Models）</div>
    <div id="apiBaseUrl" class="url-box empty">启动代理后将显示 HTTPS 地址</div>
    <div class="label" style="margin-top:10px">本地地址</div>
    <div id="localBaseUrl" class="url-box empty">-</div>
    <div id="errorBox" class="error-box" style="display:none"></div>
    <div class="btn-row">
      <button id="btnStart" class="primary">启动代理</button>
      <button id="btnStop" class="danger" disabled>停止代理</button>
      <button id="btnRestart" disabled>重启</button>
      <button id="btnCopy" disabled>复制 Base URL</button>
    </div>
  </div>
  <div class="card">
    <div class="label">代理配置</div>
    <div class="field"><div class="label">端口</div><input id="inputPort" type="number" min="1" max="65535" /></div>
    <div class="checkbox-row"><input id="chkNgrok" type="checkbox" /><label for="chkNgrok">启用 ngrok 隧道</label></div>
    <div class="field"><div class="label">固定 ngrok URL（可选）</div><input id="inputNgrokUrl" type="text" placeholder="https://your-subdomain.ngrok.dev" /></div>
    <div class="checkbox-row"><input id="chkAutoStart" type="checkbox" /><label for="chkAutoStart">Cursor 启动时自动运行</label></div>
    <div class="checkbox-row"><input id="chkVerbose" type="checkbox" /><label for="chkVerbose">详细日志</label></div>
    <div class="hint">修改配置后请重启代理。</div>
    <div class="btn-row">
      <button id="btnSaveSettings">保存配置</button>
      <button id="btnExtensionSettings">扩展高级设置</button>
    </div>
  </div>
  <div class="card">
    <div class="label">Cursor 配置步骤</div>
    <ol class="steps">
      <li>点击「启动代理」，等待 Base URL 出现</li>
      <li>复制 Base URL 到 Cursor Settings → Override OpenAI Base URL</li>
      <li>填入 DeepSeek API Key，添加模型 deepseek-v4-pro</li>
    </ol>
    <div class="btn-row">
      <button id="btnCursorSettings">打开 Cursor 模型设置</button>
      <button id="btnLogs">查看日志</button>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const els = {
      statusBadge: document.getElementById('statusBadge'), statusText: document.getElementById('statusText'),
      apiBaseUrl: document.getElementById('apiBaseUrl'), localBaseUrl: document.getElementById('localBaseUrl'),
      errorBox: document.getElementById('errorBox'), btnStart: document.getElementById('btnStart'),
      btnStop: document.getElementById('btnStop'), btnRestart: document.getElementById('btnRestart'),
      btnCopy: document.getElementById('btnCopy'), inputPort: document.getElementById('inputPort'),
      chkNgrok: document.getElementById('chkNgrok'), inputNgrokUrl: document.getElementById('inputNgrokUrl'),
      chkAutoStart: document.getElementById('chkAutoStart'), chkVerbose: document.getElementById('chkVerbose'),
      btnSaveSettings: document.getElementById('btnSaveSettings'),
      btnExtensionSettings: document.getElementById('btnExtensionSettings'),
      btnCursorSettings: document.getElementById('btnCursorSettings'), btnLogs: document.getElementById('btnLogs'),
    };
    const statusLabels = { running: ['running','运行中'], stopped: ['stopped','已停止'], starting: ['starting','启动中...'], error: ['error','错误'] };
    function post(type, payload = {}) { vscode.postMessage({ type, ...payload }); }
    function renderState(state) {
      const [badgeClass, label] = statusLabels[state.status] || statusLabels.stopped;
      els.statusBadge.className = 'badge ' + badgeClass; els.statusBadge.textContent = label;
      els.statusText.textContent = state.status === 'running' ? '代理正在运行' : state.status === 'starting' ? '正在启动...' : state.status === 'error' ? '启动失败' : '代理未运行';
      if (state.apiBaseUrl) { els.apiBaseUrl.textContent = state.apiBaseUrl; els.apiBaseUrl.classList.remove('empty'); }
      else { els.apiBaseUrl.textContent = '启动代理后将显示 HTTPS 地址'; els.apiBaseUrl.classList.add('empty'); }
      if (state.localBaseUrl) { els.localBaseUrl.textContent = state.localBaseUrl; els.localBaseUrl.classList.remove('empty'); }
      else { els.localBaseUrl.textContent = '-'; els.localBaseUrl.classList.add('empty'); }
      if (state.error) { els.errorBox.style.display = 'block'; els.errorBox.textContent = state.error; }
      else { els.errorBox.style.display = 'none'; els.errorBox.textContent = ''; }
      const running = state.status === 'running', busy = state.status === 'starting';
      els.btnStart.disabled = running || busy;
      els.btnStop.disabled = !running && state.status !== 'error';
      els.btnRestart.disabled = busy; els.btnCopy.disabled = !state.apiBaseUrl;
    }
    function renderSettings(settings) {
      els.inputPort.value = String(settings.port ?? 9000);
      els.chkNgrok.checked = !!settings.ngrok; els.inputNgrokUrl.value = settings.ngrokUrl ?? '';
      els.chkAutoStart.checked = !!settings.autoStart; els.chkVerbose.checked = !!settings.verbose;
    }
    window.addEventListener('message', (event) => {
      if (event.data.type === 'update') { renderState(event.data.state); renderSettings(event.data.settings); }
    });
    els.btnStart.addEventListener('click', () => post('start'));
    els.btnStop.addEventListener('click', () => post('stop'));
    els.btnRestart.addEventListener('click', () => post('restart'));
    els.btnCopy.addEventListener('click', () => post('copyBaseUrl'));
    els.btnLogs.addEventListener('click', () => post('openLogs'));
    els.btnCursorSettings.addEventListener('click', () => post('openCursorSettings'));
    els.btnExtensionSettings.addEventListener('click', () => post('openExtensionSettings'));
    els.btnSaveSettings.addEventListener('click', () => {
      post('updateSetting', { key: 'deepseekBridge.port', value: Number(els.inputPort.value) || 9000 });
      post('updateSetting', { key: 'deepseekBridge.ngrok', value: els.chkNgrok.checked });
      post('updateSetting', { key: 'deepseekBridge.ngrokUrl', value: els.inputNgrokUrl.value.trim() });
      post('updateSetting', { key: 'deepseekBridge.autoStart', value: els.chkAutoStart.checked });
      post('updateSetting', { key: 'deepseekBridge.verbose', value: els.chkVerbose.checked });
    });
    post('ready');
  </script>
</body>
</html>`;
}

export function buildDashboardUpdate(
	proxyManager: ProxyManager,
	state?: ProxyState
): { type: string; state: ProxyState; settings: BridgeSettings } {
	return {
		type: 'update',
		state: state ?? proxyManager.getState(),
		settings: readSettings(),
	};
}

function getNonce(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let text = '';
	for (let i = 0; i < 32; i++) {
		text += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return text;
}
