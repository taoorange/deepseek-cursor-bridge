import * as vscode from 'vscode';
import {
	buildDashboardUpdate,
	getDashboardHtml,
	getEffectiveLocale,
	handleDashboardMessage,
	t,
} from './dashboardShared';
import { ProxyManager, ProxyState } from './proxyManager';

export class DashboardPanel {
	public static currentPanel: DashboardPanel | undefined;
	public static readonly viewType = 'deepseekBridgeDashboard';

	private constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly panel: vscode.WebviewPanel,
		private readonly proxyManager: ProxyManager
	) {
		panel.webview.html = getDashboardHtml();

		panel.webview.onDidReceiveMessage(async (message) => {
			await handleDashboardMessage(message, this.context, () => this.postUpdate());
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
		const locale = getEffectiveLocale(context);
		const title = t(locale, 'extension.panelTitle');

		if (DashboardPanel.currentPanel) {
			DashboardPanel.currentPanel.panel.title = title;
			DashboardPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
			DashboardPanel.currentPanel.postUpdate();
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			DashboardPanel.viewType,
			title,
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true }
		);

		DashboardPanel.currentPanel = new DashboardPanel(context, panel, proxyManager);
		context.subscriptions.push(panel);
	}

	postUpdate(state?: ProxyState): void {
		const locale = getEffectiveLocale(this.context);
		this.panel.title = t(locale, 'extension.panelTitle');
		this.panel.webview.postMessage(
			buildDashboardUpdate(this.context, this.proxyManager, state)
		);
	}
}
