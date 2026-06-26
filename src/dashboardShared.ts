import * as vscode from 'vscode';
import {
	getEffectiveLocale,
	getTranslations,
	setStoredLocale,
	t,
	toggleLocale,
	UiLocale,
} from './i18n';
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
	context: vscode.ExtensionContext,
	onRefresh: () => void
): Promise<void> {
	switch (message.type) {
		case 'ready':
		case 'refresh':
			onRefresh();
			break;
		case 'setLocale': {
			const current = getEffectiveLocale(context);
			await setStoredLocale(context, toggleLocale(current));
			onRefresh();
			break;
		}
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
<html lang="en">
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
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }
    .header-text { flex: 1; min-width: 0; }
    h1 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
    .subtitle { margin: 0; color: var(--vscode-descriptionForeground); font-size: 12px; }
    .lang-btn {
      flex-shrink: 0;
      min-width: 44px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
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
    .notice {
      margin-bottom: 12px; padding: 10px 12px; border-radius: 8px;
      background: #d2992215; border: 1px solid #d2992244; font-size: 12px;
    }
    .notice-title { font-weight: 600; color: #e3b341; margin: 0 0 4px; }
    .notice-body { margin: 0; color: var(--vscode-foreground); line-height: 1.45; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-text">
      <h1>DeepSeek Bridge</h1>
      <p class="subtitle" data-i18n="dashboard.subtitle"></p>
    </div>
    <button id="btnLang" class="lang-btn" type="button" aria-label=""></button>
  </div>
  <div class="notice" role="note">
    <p class="notice-title" data-i18n="dashboard.proNoticeTitle"></p>
    <p class="notice-body" data-i18n="dashboard.proNoticeBody"></p>
  </div>
  <div class="card">
    <div class="status-row">
      <span id="statusBadge" class="badge stopped"></span>
      <span id="statusText"></span>
    </div>
    <div class="label" data-i18n="dashboard.cursorBaseUrlLabel"></div>
    <div id="apiBaseUrl" class="url-box empty"></div>
    <div class="label" style="margin-top:10px" data-i18n="dashboard.localAddressLabel"></div>
    <div id="localBaseUrl" class="url-box empty">-</div>
    <div id="errorBox" class="error-box" style="display:none"></div>
    <div class="btn-row">
      <button id="btnStart" class="primary" data-i18n="dashboard.btnStart"></button>
      <button id="btnStop" class="danger" disabled data-i18n="dashboard.btnStop"></button>
      <button id="btnRestart" disabled data-i18n="dashboard.btnRestart"></button>
      <button id="btnCopy" disabled data-i18n="dashboard.btnCopy"></button>
    </div>
  </div>
  <div class="card">
    <div class="label" data-i18n="dashboard.proxyConfigTitle"></div>
    <div class="field"><div class="label" data-i18n="dashboard.portLabel"></div><input id="inputPort" type="number" min="1" max="65535" /></div>
    <div class="checkbox-row"><input id="chkNgrok" type="checkbox" /><label for="chkNgrok" data-i18n="dashboard.ngrokEnabled"></label></div>
    <div class="field"><div class="label" data-i18n="dashboard.ngrokUrlLabel"></div><input id="inputNgrokUrl" type="text" data-i18n-placeholder="dashboard.ngrokUrlPlaceholder" /></div>
    <div class="checkbox-row"><input id="chkAutoStart" type="checkbox" /><label for="chkAutoStart" data-i18n="dashboard.autoStartLabel"></label></div>
    <div class="checkbox-row"><input id="chkVerbose" type="checkbox" /><label for="chkVerbose" data-i18n="dashboard.verboseLabel"></label></div>
    <div class="hint" data-i18n="dashboard.configHint"></div>
    <div class="btn-row">
      <button id="btnSaveSettings" data-i18n="dashboard.btnSaveSettings"></button>
      <button id="btnExtensionSettings" data-i18n="dashboard.btnExtensionSettings"></button>
    </div>
  </div>
  <div class="card">
    <div class="label" data-i18n="dashboard.cursorStepsTitle"></div>
    <ol class="steps">
      <li data-i18n="dashboard.step1"></li>
      <li data-i18n="dashboard.step2"></li>
      <li data-i18n="dashboard.step3"></li>
    </ol>
    <div class="btn-row">
      <button id="btnCursorSettings" data-i18n="dashboard.btnCursorSettings"></button>
      <button id="btnLogs" data-i18n="dashboard.btnLogs"></button>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const els = {
      btnLang: document.getElementById('btnLang'),
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
    let i18n = {};
    let locale = 'en';
    const statusKeys = {
      running: ['running', 'dashboard.status.running', 'dashboard.statusText.running'],
      stopped: ['stopped', 'dashboard.status.stopped', 'dashboard.statusText.stopped'],
      starting: ['starting', 'dashboard.status.starting', 'dashboard.statusText.starting'],
      error: ['error', 'dashboard.status.error', 'dashboard.statusText.error'],
    };
    function tr(key) { return i18n[key] || key; }
    function applyTranslations() {
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = tr(el.getAttribute('data-i18n'));
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        el.placeholder = tr(el.getAttribute('data-i18n-placeholder'));
      });
      if (els.btnLang) {
        const isZh = locale === 'zh';
        els.btnLang.textContent = isZh ? tr('dashboard.langButtonEn') : tr('dashboard.langButtonZh');
        els.btnLang.title = isZh ? tr('dashboard.langSwitchToEn') : tr('dashboard.langSwitchToZh');
        els.btnLang.setAttribute('aria-label', els.btnLang.title);
      }
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    }
    function post(type, payload = {}) { vscode.postMessage({ type, ...payload }); }
    function renderState(state) {
      const keys = statusKeys[state.status] || statusKeys.stopped;
      els.statusBadge.className = 'badge ' + keys[0];
      els.statusBadge.textContent = tr(keys[1]);
      els.statusText.textContent = tr(keys[2]);
      if (state.apiBaseUrl) { els.apiBaseUrl.textContent = state.apiBaseUrl; els.apiBaseUrl.classList.remove('empty'); }
      else { els.apiBaseUrl.textContent = tr('dashboard.apiBaseUrlEmpty'); els.apiBaseUrl.classList.add('empty'); }
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
      if (event.data.type === 'update') {
        if (event.data.locale) { locale = event.data.locale; }
        if (event.data.i18n) { i18n = event.data.i18n; applyTranslations(); }
        renderState(event.data.state);
        renderSettings(event.data.settings);
      }
    });
    els.btnLang.addEventListener('click', () => post('setLocale'));
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
	context: vscode.ExtensionContext,
	proxyManager: ProxyManager,
	state?: ProxyState
): { type: string; state: ProxyState; settings: BridgeSettings; locale: UiLocale; i18n: Record<string, string> } {
	const locale = getEffectiveLocale(context);
	return {
		type: 'update',
		state: state ?? proxyManager.getState(),
		settings: readSettings(),
		locale,
		i18n: getTranslations(locale),
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

export { getEffectiveLocale, t };
