import * as vscode from 'vscode';
import {
	buildDashboardUpdate,
	getDashboardHtml,
	handleDashboardMessage,
} from './dashboardShared';
import { ProxyManager, ProxyState } from './proxyManager';

export class DashboardPanel {
	public static currentPanel: DashboardPanel | undefined;
	public static readonly viewType = 'deepseekBridgeDashboard';

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly proxyManager: ProxyManager
	) {
		panel.webview.html = getDashboardHtml();

		panel.webview.onDidReceiveMessage(async (message) => {
			await handleDashboardMessage(message, () => this.postUpdate());
		});

		panel.onDidDispose(() => {
			DashboardPanel.currentPanel = undefined;
		});

		this.postUpdate();
	}

	static reveal(
		context: vscode.ExtensionContext,
		proxyManager: ProxyManager
	): void {
		if (DashboardPanel.currentPanel) {
			DashboardPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
			DashboardPanel.currentPanel.postUpdate();
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			DashboardPanel.viewType,
			'DeepSeek Bridge',
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true }
		);

		DashboardPanel.currentPanel = new DashboardPanel(panel, proxyManager);
		context.subscriptions.push(panel);
	}

	postUpdate(state?: ProxyState): void {
		this.panel.webview.postMessage(buildDashboardUpdate(this.proxyManager, state));
	}
}
