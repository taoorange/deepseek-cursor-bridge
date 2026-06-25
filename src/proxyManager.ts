import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as vscode from 'vscode';
import { t, UiLocale } from './i18n';
import { TranslationKey } from './i18n/types';
import {
	getBundledProxyLaunch,
	isBundledProxyPreparing,
	shouldUseBundledProxyConfiguration,
} from './proxyInstaller';

export type ProxyStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface ProxyState {
	status: ProxyStatus;
	apiBaseUrl?: string;
	localBaseUrl?: string;
	error?: string;
	pid?: number;
}

const API_BASE_URL_PATTERN = /^api_base_url:\s*(.+)$/;
const LOCAL_BASE_URL_PATTERN = /^local_base_url:\s*(.+)$/;

export class ProxyManager {
	private process: ChildProcessWithoutNullStreams | undefined;
	private state: ProxyState = { status: 'stopped' };
	private readonly listeners = new Set<(state: ProxyState) => void>();

	constructor(
		private readonly output: vscode.OutputChannel,
		private readonly getLocale: () => UiLocale
	) {}

	onDidChangeState(listener: (state: ProxyState) => void): vscode.Disposable {
		this.listeners.add(listener);
		listener(this.state);
		return new vscode.Disposable(() => this.listeners.delete(listener));
	}

	getState(): ProxyState {
		return { ...this.state };
	}

	isRunning(): boolean {
		return this.state.status === 'running';
	}

	async start(): Promise<ProxyState> {
		if (this.state.status === 'starting') {
			return this.state;
		}
		if (this.process && this.process.exitCode === null) {
			return this.state;
		}

		const config = vscode.workspace.getConfiguration('deepseekBridge');
		const useBundledProxy = shouldUseBundledProxyConfiguration(config);
		const bundledLaunch = useBundledProxy ? getBundledProxyLaunch() : undefined;
		const proxyPath = config.get<string>('proxyPath') ?? '';
		const port = config.get<number>('port') ?? 9000;
		const ngrok = config.get<boolean>('ngrok') ?? true;
		const ngrokUrl = config.get<string>('ngrokUrl')?.trim();
		const verbose = config.get<boolean>('verbose') ?? false;
		const host = config.get<string>('host') ?? '127.0.0.1';

		if (useBundledProxy) {
			if (isBundledProxyPreparing()) {
				return this.setErrorKey('error.bundledNotReady');
			}
			if (!bundledLaunch) {
				return this.setErrorKey('error.bundledNotReady');
			}
		} else if (!proxyPath) {
			return this.setErrorKey('error.proxyPathNotConfigured');
		} else if (!fs.existsSync(proxyPath)) {
			return this.setErrorKey('error.proxyExecutableNotFound', { path: proxyPath });
		}

		const existing = await this.checkHealth(host, port);
		if (existing) {
			const apiBaseUrl = ngrok
				? await this.waitForNgrokUrl(config)
				: `http://${host}:${port}/v1`;
			return this.setRunning({
				apiBaseUrl: apiBaseUrl ?? `http://${host}:${port}/v1`,
				localBaseUrl: `http://${host}:${port}/v1`,
				pid: undefined,
			});
		}

		this.updateState({ status: 'starting' });

		const args = ['--port', String(port), '--host', host];
		if (ngrok) {
			args.push('--ngrok');
			if (ngrokUrl) {
				args.push('--ngrok-url', ngrokUrl);
			}
		} else {
			args.push('--no-ngrok');
		}
		if (verbose) {
			args.push('--verbose');
		}

		this.output.appendLine(
			useBundledProxy && bundledLaunch
				? `Starting bundled proxy: ${bundledLaunch.command} ${[...bundledLaunch.args, ...args].join(' ')}`
				: `Starting proxy: ${proxyPath} ${args.join(' ')}`
		);

		try {
			if (useBundledProxy && bundledLaunch) {
				this.process = spawn(
					bundledLaunch.command,
					[...bundledLaunch.args, ...args],
					{
						cwd: bundledLaunch.cwd,
						env: bundledLaunch.env,
					}
				);
			} else {
				this.process = spawn(proxyPath, args, {
					cwd: config.get<string>('proxyCwd') || undefined,
					env: { ...process.env },
				});
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return this.setErrorKey('error.proxyStartFailed', { message });
		}

		this.process.stdout.setEncoding('utf8');
		this.process.stderr.setEncoding('utf8');

		this.process.stdout.on('data', (chunk: string) => this.handleOutput(chunk));
		this.process.stderr.on('data', (chunk: string) => this.handleOutput(chunk));

		this.process.on('error', (error) => {
			this.setErrorKey('error.proxyProcessError', { message: error.message });
		});

		this.process.on('exit', (code, signal) => {
			if (this.state.status === 'running' || this.state.status === 'starting') {
				if (signal !== null) {
					this.setErrorKey('error.proxyExitedSignal', { signal: String(signal) });
				} else {
					this.setErrorKey('error.proxyExitedCode', {
						code: String(code ?? 'unknown'),
					});
				}
			}
			this.process = undefined;
		});

		return this.waitUntilReady(host, port, ngrok);
	}

	async stop(): Promise<void> {
		if (!this.process || this.process.exitCode !== null) {
			this.updateState({ status: 'stopped' });
			this.process = undefined;
			return;
		}

		this.output.appendLine('Stopping proxy...');
		this.process.kill('SIGTERM');

		await new Promise<void>((resolve) => {
			const timeout = setTimeout(() => {
				this.process?.kill('SIGKILL');
				resolve();
			}, 5000);

			this.process?.once('exit', () => {
				clearTimeout(timeout);
				resolve();
			});
		});

		this.process = undefined;
		this.updateState({ status: 'stopped' });
	}

	async restart(): Promise<ProxyState> {
		await this.stop();
		return this.start();
	}

	private handleOutput(chunk: string): void {
		for (const line of chunk.split(/\r?\n/)) {
			if (!line.trim()) {
				continue;
			}
			this.output.appendLine(line);

			const apiMatch = line.match(API_BASE_URL_PATTERN);
			if (apiMatch) {
				const apiBaseUrl = apiMatch[1].trim();
				this.setRunning({
					apiBaseUrl,
					localBaseUrl: this.state.localBaseUrl,
					pid: this.process?.pid,
				});
				continue;
			}

			const localMatch = line.match(LOCAL_BASE_URL_PATTERN);
			if (localMatch) {
				this.state.localBaseUrl = localMatch[1].trim();
			}
		}
	}

	private async waitUntilReady(
		host: string,
		port: number,
		ngrok: boolean
	): Promise<ProxyState> {
		const deadline = Date.now() + 30_000;

		while (Date.now() < deadline) {
			if (this.process?.exitCode !== null && this.process?.exitCode !== undefined) {
				return this.state;
			}

			if (this.state.apiBaseUrl) {
				return this.state;
			}

			const healthy = await this.checkHealth(host, port);
			if (healthy) {
				if (!ngrok) {
					const localBaseUrl = `http://${host}:${port}/v1`;
					return this.setRunning({
						apiBaseUrl: localBaseUrl,
						localBaseUrl,
						pid: this.process?.pid,
					});
				}
			}

			await sleep(250);
		}

		return this.setErrorKey('error.proxyStartupTimeout');
	}

	private async waitForNgrokUrl(
		config: vscode.WorkspaceConfiguration
	): Promise<string | undefined> {
		const ngrokUrl = config.get<string>('ngrokUrl')?.trim();
		if (ngrokUrl) {
			return ngrokUrl.endsWith('/v1') ? ngrokUrl : `${ngrokUrl.replace(/\/$/, '')}/v1`;
		}

		const deadline = Date.now() + 15_000;
		while (Date.now() < deadline) {
			if (this.state.apiBaseUrl) {
				return this.state.apiBaseUrl;
			}
			await sleep(250);
		}
		return undefined;
	}

	private checkHealth(host: string, port: number): Promise<boolean> {
		return new Promise((resolve) => {
			const request = http.get(
				{
					host: host === '0.0.0.0' ? '127.0.0.1' : host,
					port,
					path: '/v1/healthz',
					timeout: 1000,
				},
				(response) => {
					resolve(response.statusCode === 200);
					response.resume();
				}
			);
			request.on('error', () => resolve(false));
			request.on('timeout', () => {
				request.destroy();
				resolve(false);
			});
		});
	}

	private setRunning(partial: Pick<ProxyState, 'apiBaseUrl' | 'localBaseUrl' | 'pid'>): ProxyState {
		this.updateState({
			status: 'running',
			apiBaseUrl: partial.apiBaseUrl,
			localBaseUrl: partial.localBaseUrl,
			pid: partial.pid,
			error: undefined,
		});
		return this.state;
	}

	private setErrorKey(
		key: TranslationKey,
		params?: Record<string, string>
	): ProxyState {
		const message = t(this.getLocale(), key, params);
		this.output.appendLine(`ERROR: ${message}`);
		this.updateState({
			status: 'error',
			error: message,
		});
		return this.state;
	}

	private updateState(next: ProxyState): void {
		this.state = { ...this.state, ...next };
		for (const listener of this.listeners) {
			listener(this.state);
		}
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
