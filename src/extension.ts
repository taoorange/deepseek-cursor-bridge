import * as vscode from 'vscode';
import { DashboardPanel } from './dashboardPanel';
import { DashboardProvider } from './dashboardProvider';
import { getEffectiveLocale, t } from './dashboardShared';
import { ensureProxyConfiguration } from './proxyInstaller';
import { ProxyManager, ProxyState } from './proxyManager';

const OUTPUT_CHANNEL = 'DeepSeek Bridge';

let proxyManager: ProxyManager | undefined;
let dashboardProvider: DashboardProvider | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let extensionContext: vscode.ExtensionContext | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	extensionContext = context;

	const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL);
	proxyManager = new ProxyManager(output, () => getEffectiveLocale(context));
	dashboardProvider = new DashboardProvider(context, proxyManager);

	statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100
	);
	statusBarItem.command = 'deepseek-cursor-bridge.openDashboard';
	statusBarItem.show();

	const notifyDashboard = (state: ProxyState) => {
		updateStatusBar(state);
		dashboardProvider?.postUpdate(state);
		DashboardPanel.currentPanel?.postUpdate(state);
	};

	const openDashboard = () => {
		DashboardPanel.reveal(context, proxyManager!);
	};

	context.subscriptions.push(
		output,
		statusBarItem,
		proxyManager.onDidChangeState(notifyDashboard),
		vscode.window.registerWebviewViewProvider(
			DashboardProvider.viewType,
			dashboardProvider
		),

		vscode.commands.registerCommand('deepseek-cursor-bridge.start', async () => {
			const state = await proxyManager!.start();
			await handleStartResult(state, { quiet: true });
		}),

		vscode.commands.registerCommand('deepseek-cursor-bridge.stop', async () => {
			await proxyManager!.stop();
			const locale = getEffectiveLocale(context);
			vscode.window.showInformationMessage(t(locale, 'extension.proxyStopped'));
		}),

		vscode.commands.registerCommand('deepseek-cursor-bridge.restart', async () => {
			const state = await proxyManager!.restart();
			await handleStartResult(state, { quiet: true });
		}),

		vscode.commands.registerCommand('deepseek-cursor-bridge.setup', () =>
			runSetupWizard()
		),

		vscode.commands.registerCommand('deepseek-cursor-bridge.copyBaseUrl', async () => {
			const locale = getEffectiveLocale(context);
			const url = proxyManager!.getState().apiBaseUrl;
			if (!url) {
				vscode.window.showWarningMessage(t(locale, 'extension.proxyNotStarted'));
				return;
			}
			await vscode.env.clipboard.writeText(url);
			vscode.window.showInformationMessage(
				t(locale, 'extension.copiedBaseUrl', { url })
			);
		}),

		vscode.commands.registerCommand('deepseek-cursor-bridge.showLogs', () => {
			output.show(true);
		}),

		vscode.commands.registerCommand('deepseek-cursor-bridge.openDashboard', openDashboard),

		vscode.commands.registerCommand('deepseek-cursor-bridge.showStatus', openDashboard),

		vscode.commands.registerCommand('deepseek-cursor-bridge.openCursorSettings', () => {
			vscode.commands.executeCommand('workbench.action.openSettings', 'cursor');
		})
	);

	output.appendLine('DeepSeek Cursor Bridge extension activated.');

	ensureProxyConfiguration(context, output, {
		onReady: () => {
			const autoStart = vscode.workspace
				.getConfiguration('deepseekBridge')
				.get<boolean>('autoStart');
			if (autoStart && proxyManager) {
				void proxyManager.start().then((state) => {
					if (state.status === 'error') {
						output.show(true);
					}
				});
			}
		},
	});
}

export async function deactivate(): Promise<void> {
	const stopOnDeactivate = vscode.workspace
		.getConfiguration('deepseekBridge')
		.get<boolean>('stopOnDeactivate');
	if (stopOnDeactivate && proxyManager?.isRunning()) {
		await proxyManager.stop();
	}
}

async function runSetupWizard(): Promise<void> {
	if (extensionContext && proxyManager) {
		DashboardPanel.reveal(extensionContext, proxyManager);
	}
	const locale = getEffectiveLocale(extensionContext!);
	const action = await vscode.window.showInformationMessage(
		t(locale, 'extension.setupWizardMessage'),
		t(locale, 'extension.btnStartProxy'),
		t(locale, 'extension.btnOpenCursorSettings')
	);
	if (action === t(locale, 'extension.btnStartProxy')) {
		const state = await proxyManager!.start();
		await handleStartResult(state);
	} else if (action === t(locale, 'extension.btnOpenCursorSettings')) {
		await vscode.commands.executeCommand('deepseek-cursor-bridge.openCursorSettings');
	}
}

async function handleStartResult(
	state: ProxyState,
	options: { quiet?: boolean } = {}
): Promise<void> {
	const locale = getEffectiveLocale(extensionContext!);

	if (state.status === 'running' && state.apiBaseUrl) {
		if (!options.quiet) {
			const action = await vscode.window.showInformationMessage(
				t(locale, 'extension.proxyStarted', { url: state.apiBaseUrl }),
				t(locale, 'extension.btnCopyBaseUrl'),
				t(locale, 'extension.btnOpenDashboard')
			);
			if (action === t(locale, 'extension.btnCopyBaseUrl')) {
				await vscode.env.clipboard.writeText(state.apiBaseUrl);
			} else if (action === t(locale, 'extension.btnOpenDashboard')) {
				await vscode.commands.executeCommand('deepseek-cursor-bridge.openDashboard');
			}
		}
		return;
	}

	if (state.status === 'error' && !options.quiet) {
		const action = await vscode.window.showErrorMessage(
			state.error ?? t(locale, 'extension.proxyStartFailed'),
			t(locale, 'extension.btnShowLogs'),
			t(locale, 'extension.btnOpenDashboard')
		);
		if (action === t(locale, 'extension.btnShowLogs')) {
			await vscode.commands.executeCommand('deepseek-cursor-bridge.showLogs');
		} else if (action === t(locale, 'extension.btnOpenDashboard')) {
			await vscode.commands.executeCommand('deepseek-cursor-bridge.openDashboard');
		}
	}
}

function updateStatusBar(state: ProxyState): void {
	if (!statusBarItem || !extensionContext) {
		return;
	}

	const locale = getEffectiveLocale(extensionContext);

	switch (state.status) {
		case 'running':
			statusBarItem.text = '$(check) DeepSeek';
			statusBarItem.tooltip = state.apiBaseUrl
				? t(locale, 'extension.statusBar.runningWithUrl', { url: state.apiBaseUrl })
				: t(locale, 'extension.statusBar.running');
			statusBarItem.backgroundColor = undefined;
			break;
		case 'starting':
			statusBarItem.text = '$(sync~spin) DeepSeek';
			statusBarItem.tooltip = t(locale, 'extension.statusBar.starting');
			statusBarItem.backgroundColor = undefined;
			break;
		case 'error':
			statusBarItem.text = '$(error) DeepSeek';
			statusBarItem.tooltip = state.error ?? t(locale, 'extension.statusBar.error');
			statusBarItem.backgroundColor = new vscode.ThemeColor(
				'statusBarItem.errorBackground'
			);
			break;
		default:
			statusBarItem.text = '$(circle-slash) DeepSeek';
			statusBarItem.tooltip = t(locale, 'extension.statusBar.stopped');
			statusBarItem.backgroundColor = undefined;
			break;
	}
}
