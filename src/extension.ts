import * as vscode from 'vscode';
import { DashboardPanel } from './dashboardPanel';
import { DashboardProvider } from './dashboardProvider';
import { ProxyManager, ProxyState } from './proxyManager';

const OUTPUT_CHANNEL = 'DeepSeek Bridge';
const DEFAULT_PROXY_PATH =
	'/Users/github/deepseek-cursor-proxy/.venv/bin/deepseek-cursor-proxy';
const DEFAULT_PROXY_CWD = '/Users/github/deepseek-cursor-proxy';

let proxyManager: ProxyManager | undefined;
let dashboardProvider: DashboardProvider | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let extensionContext: vscode.ExtensionContext | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	try {
		extensionContext = context;
		await ensureDefaultSettings();

		const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL);
		proxyManager = new ProxyManager(output);
		dashboardProvider = new DashboardProvider(proxyManager);

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
				vscode.window.showInformationMessage('DeepSeek 代理已停止。');
			}),

			vscode.commands.registerCommand('deepseek-cursor-bridge.restart', async () => {
				const state = await proxyManager!.restart();
				await handleStartResult(state, { quiet: true });
			}),

			vscode.commands.registerCommand('deepseek-cursor-bridge.setup', () =>
				runSetupWizard()
			),

			vscode.commands.registerCommand('deepseek-cursor-bridge.copyBaseUrl', async () => {
				const url = proxyManager!.getState().apiBaseUrl;
				if (!url) {
					vscode.window.showWarningMessage('代理尚未启动，请先启动代理。');
					return;
				}
				await vscode.env.clipboard.writeText(url);
				vscode.window.showInformationMessage(`已复制 Base URL: ${url}`);
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

		openDashboard();

		const autoStart = vscode.workspace
			.getConfiguration('deepseekBridge')
			.get<boolean>('autoStart');
		if (autoStart) {
			const state = await proxyManager.start();
			if (state.status === 'error') {
				output.show(true);
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`DeepSeek Bridge 扩展加载失败: ${message}`);
		throw error;
	}
}

export async function deactivate(): Promise<void> {
	const stopOnDeactivate = vscode.workspace
		.getConfiguration('deepseekBridge')
		.get<boolean>('stopOnDeactivate');
	if (stopOnDeactivate && proxyManager?.isRunning()) {
		await proxyManager.stop();
	}
}

async function ensureDefaultSettings(): Promise<void> {
	const config = vscode.workspace.getConfiguration('deepseekBridge');
	if (!config.get<string>('proxyPath')) {
		await config.update(
			'proxyPath',
			DEFAULT_PROXY_PATH,
			vscode.ConfigurationTarget.Global
		);
	}
	if (!config.get<string>('proxyCwd')) {
		await config.update(
			'proxyCwd',
			DEFAULT_PROXY_CWD,
			vscode.ConfigurationTarget.Global
		);
	}
}

async function runSetupWizard(): Promise<void> {
	if (extensionContext && proxyManager) {
		DashboardPanel.reveal(extensionContext, proxyManager);
	}
	const action = await vscode.window.showInformationMessage(
		'请在 DeepSeek Bridge 控制面板中启动代理，再配置 Cursor Models。',
		'启动代理',
		'打开 Cursor 设置'
	);
	if (action === '启动代理') {
		const state = await proxyManager!.start();
		await handleStartResult(state);
	} else if (action === '打开 Cursor 设置') {
		await vscode.commands.executeCommand('deepseek-cursor-bridge.openCursorSettings');
	}
}

async function handleStartResult(
	state: ProxyState,
	options: { quiet?: boolean } = {}
): Promise<void> {
	if (state.status === 'running' && state.apiBaseUrl) {
		if (!options.quiet) {
			const action = await vscode.window.showInformationMessage(
				`代理已启动。请将 Cursor Base URL 设置为:\n${state.apiBaseUrl}`,
				'复制 Base URL',
				'打开控制面板'
			);
			if (action === '复制 Base URL') {
				await vscode.env.clipboard.writeText(state.apiBaseUrl);
			} else if (action === '打开控制面板') {
				await vscode.commands.executeCommand('deepseek-cursor-bridge.openDashboard');
			}
		}
		return;
	}

	if (state.status === 'error' && !options.quiet) {
		const action = await vscode.window.showErrorMessage(
			state.error ?? '代理启动失败。',
			'查看日志',
			'打开控制面板'
		);
		if (action === '查看日志') {
			await vscode.commands.executeCommand('deepseek-cursor-bridge.showLogs');
		} else if (action === '打开控制面板') {
			await vscode.commands.executeCommand('deepseek-cursor-bridge.openDashboard');
		}
	}
}

function updateStatusBar(state: ProxyState): void {
	if (!statusBarItem) {
		return;
	}

	switch (state.status) {
		case 'running':
			statusBarItem.text = '$(check) DeepSeek';
			statusBarItem.tooltip = state.apiBaseUrl
				? `DeepSeek 代理运行中\nBase URL: ${state.apiBaseUrl}\n点击打开控制面板`
				: 'DeepSeek 代理运行中\n点击打开控制面板';
			statusBarItem.backgroundColor = undefined;
			break;
		case 'starting':
			statusBarItem.text = '$(sync~spin) DeepSeek';
			statusBarItem.tooltip = '正在启动代理...\n点击打开控制面板';
			statusBarItem.backgroundColor = undefined;
			break;
		case 'error':
			statusBarItem.text = '$(error) DeepSeek';
			statusBarItem.tooltip = state.error ?? 'DeepSeek 代理错误\n点击打开控制面板';
			statusBarItem.backgroundColor = new vscode.ThemeColor(
				'statusBarItem.errorBackground'
			);
			break;
		default:
			statusBarItem.text = '$(circle-slash) DeepSeek';
			statusBarItem.tooltip = 'DeepSeek 代理已停止\n点击打开控制面板';
			statusBarItem.backgroundColor = undefined;
			break;
	}
}
