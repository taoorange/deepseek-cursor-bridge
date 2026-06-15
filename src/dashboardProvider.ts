import * as vscode from 'vscode';
import {
	buildDashboardUpdate,
	getDashboardHtml,
	handleDashboardMessage,
} from './dashboardShared';
import { ProxyManager, ProxyState } from './proxyManager';

export class DashboardProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'deepseek-cursor-bridge.dashboard';

	private view: vscode.WebviewView | undefined;

	constructor(private readonly proxyManager: ProxyManager) {}

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [],
		};

		webviewView.webview.html = getDashboardHtml();

		webviewView.webview.onDidReceiveMessage(async (message) => {
			await handleDashboardMessage(message, () => this.postUpdate());
		});

		webviewView.onDidDispose(() => {
			this.view = undefined;
		});
	}

	postUpdate(state?: ProxyState): void {
		if (!this.view) {
			return;
		}
		this.view.webview.postMessage(buildDashboardUpdate(this.proxyManager, state));
	}
}

export { readSettings } from './dashboardShared';
export type { BridgeSettings } from './dashboardShared';
