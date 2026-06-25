import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { BridgeError, formatBridgeError, localeFromContext } from './bridgeError';
import { getEffectiveLocale, t } from './i18n';

const VENV_DIR_NAME = 'proxy-venv';
const BUNDLED_PROXY_DIR = path.join('vendor', 'deepseek-cursor-proxy');
const INSTALLED_VERSION_FILE = '.installed-version';
const PROXY_MODULE = 'deepseek_cursor_proxy';
const MIN_PYTHON_MAJOR = 3;
const MIN_PYTHON_MINOR = 10;

export interface BundledProxyLaunch {
	command: string;
	args: string[];
	cwd: string;
	env: NodeJS.ProcessEnv;
	version: string;
}

interface CommandResult {
	code: number | null;
	stdout: string;
	stderr: string;
}

export interface ProxyConfigurationCallbacks {
	onReady?: () => void;
}

let bundledLaunch: BundledProxyLaunch | undefined;
let preparationPromise: Promise<BundledProxyLaunch | undefined> | undefined;

export function getBundledProxyLaunch(): BundledProxyLaunch | undefined {
	return bundledLaunch;
}

export function isBundledProxyPreparing(): boolean {
	return preparationPromise !== undefined && bundledLaunch === undefined;
}

export function getBundledProxySourceDir(extensionPath: string): string {
	return path.join(extensionPath, BUNDLED_PROXY_DIR);
}

export function getBundledProxyModuleDir(extensionPath: string): string {
	return path.join(getBundledProxySourceDir(extensionPath), 'src');
}

export function getProxyVenvDir(context: vscode.ExtensionContext): string {
	return path.join(context.globalStorageUri.fsPath, VENV_DIR_NAME);
}

function getVenvPython(venvDir: string): string {
	if (process.platform === 'win32') {
		return path.join(venvDir, 'Scripts', 'python.exe');
	}
	return path.join(venvDir, 'bin', 'python');
}

function getVenvPip(venvDir: string): string {
	if (process.platform === 'win32') {
		return path.join(venvDir, 'Scripts', 'pip.exe');
	}
	return path.join(venvDir, 'bin', 'pip');
}

function readBundledVersion(sourceDir: string): string {
	const pyprojectPath = path.join(sourceDir, 'pyproject.toml');
	if (!fs.existsSync(pyprojectPath)) {
		return '0.0.0';
	}
	const pyproject = fs.readFileSync(pyprojectPath, 'utf8');
	const match = pyproject.match(/^version\s*=\s*"([^"]+)"/m);
	return match?.[1] ?? '0.0.0';
}

function readInstalledVersion(venvDir: string): string | undefined {
	const markerPath = path.join(venvDir, INSTALLED_VERSION_FILE);
	if (!fs.existsSync(markerPath)) {
		return undefined;
	}
	return fs.readFileSync(markerPath, 'utf8').trim() || undefined;
}

function writeInstalledVersion(venvDir: string, version: string): void {
	fs.writeFileSync(path.join(venvDir, INSTALLED_VERSION_FILE), `${version}\n`, 'utf8');
}

function isBundledProxyAvailable(extensionPath: string): boolean {
	const moduleDir = getBundledProxyModuleDir(extensionPath);
	return fs.existsSync(path.join(moduleDir, PROXY_MODULE, 'server.py'));
}

function parsePythonVersion(output: string): { major: number; minor: number } | undefined {
	const match = output.match(/Python\s+(\d+)\.(\d+)/i);
	if (!match) {
		return undefined;
	}
	return { major: Number(match[1]), minor: Number(match[2]) };
}

function isSupportedPythonVersion(version: { major: number; minor: number }): boolean {
	return (
		version.major > MIN_PYTHON_MAJOR ||
		(version.major === MIN_PYTHON_MAJOR && version.minor >= MIN_PYTHON_MINOR)
	);
}

async function findPythonCommand(): Promise<string[]> {
	const candidates =
		process.platform === 'win32'
			? [['py', '-3'], ['python'], ['python3']]
			: [['python3'], ['python']];

	for (const args of candidates) {
		try {
			const result = await runCommand(args[0], args.slice(1).concat(['--version']));
			if (result.code !== 0) {
				continue;
			}
			const versionText = `${result.stdout}\n${result.stderr}`;
			const version = parsePythonVersion(versionText);
			if (!version) {
				continue;
			}
			if (!isSupportedPythonVersion(version)) {
				throw new BridgeError('error.pythonTooOld', {
					version: `${version.major}.${version.minor}`,
				});
			}
			return args;
		} catch (error) {
			if (error instanceof BridgeError) {
				throw error;
			}
		}
	}

	throw new BridgeError('error.pythonNotFound');
}

function runCommand(
	command: string,
	args: string[],
	options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<CommandResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			env: options.env ?? process.env,
			windowsHide: true,
		});

		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', (chunk: Buffer | string) => {
			stdout += chunk.toString();
		});
		child.stderr?.on('data', (chunk: Buffer | string) => {
			stderr += chunk.toString();
		});
		child.on('error', reject);
		child.on('close', (code) => resolve({ code, stdout, stderr }));
	});
}

async function createVirtualEnv(
	pythonCommand: string[],
	venvDir: string,
	output: vscode.OutputChannel
): Promise<void> {
	fs.mkdirSync(path.dirname(venvDir), { recursive: true });
	output.appendLine(`Creating proxy virtual environment: ${venvDir}`);
	const result = await runCommand(pythonCommand[0], [
		...pythonCommand.slice(1),
		'-m',
		'venv',
		venvDir,
	]);
	if (result.code !== 0) {
		throw new BridgeError('error.venvCreateFailed', {
			details: (result.stderr || result.stdout).trim(),
		});
	}
}

async function hasPyYaml(pythonPath: string): Promise<boolean> {
	const result = await runCommand(pythonPath, ['-c', 'import yaml']);
	return result.code === 0;
}

async function installProxyDependencies(
	venvDir: string,
	output: vscode.OutputChannel
): Promise<void> {
	const pip = getVenvPip(venvDir);
	if (!fs.existsSync(pip)) {
		throw new BridgeError('error.pipNotFound', { path: pip });
	}

	output.appendLine('Installing bundled proxy dependency: PyYAML');
	const result = await runCommand(pip, ['install', 'PyYAML>=6.0']);
	if (result.code !== 0) {
		throw new BridgeError('error.pypyamlInstallFailed', {
			details: (result.stderr || result.stdout).trim(),
		});
	}
}

function buildBundledLaunch(
	venvDir: string,
	sourceDir: string,
	moduleDir: string,
	version: string
): BundledProxyLaunch {
	const pythonPath = getVenvPython(venvDir);
	return {
		command: pythonPath,
		args: ['-m', PROXY_MODULE],
		cwd: sourceDir,
		env: {
			...process.env,
			PYTHONPATH: moduleDir,
		},
		version,
	};
}

export async function ensureBundledProxyRuntime(
	context: vscode.ExtensionContext,
	output: vscode.OutputChannel
): Promise<BundledProxyLaunch> {
	const extensionPath = context.extensionPath;
	const sourceDir = getBundledProxySourceDir(extensionPath);
	const moduleDir = getBundledProxyModuleDir(extensionPath);

	if (!isBundledProxyAvailable(extensionPath)) {
		throw new BridgeError('error.bundledSourceMissing');
	}

	const bundledVersion = readBundledVersion(sourceDir);
	const venvDir = getProxyVenvDir(context);
	const installedVersion = readInstalledVersion(venvDir);
	const pythonPath = getVenvPython(venvDir);
	const runtimeReady =
		fs.existsSync(pythonPath) &&
		installedVersion === bundledVersion &&
		(await hasPyYaml(pythonPath));

	if (runtimeReady) {
		const launch = buildBundledLaunch(venvDir, sourceDir, moduleDir, bundledVersion);
		output.appendLine(
			`Bundled proxy ready (${bundledVersion}) from extension source: ${moduleDir}`
		);
		bundledLaunch = launch;
		return launch;
	}

	const systemPython = await findPythonCommand();
	if (!fs.existsSync(venvDir)) {
		await createVirtualEnv(systemPython, venvDir, output);
	} else if (!fs.existsSync(pythonPath)) {
		fs.rmSync(venvDir, { recursive: true, force: true });
		await createVirtualEnv(systemPython, venvDir, output);
	}

	if (!(await hasPyYaml(getVenvPython(venvDir)))) {
		await installProxyDependencies(venvDir, output);
	}

	writeInstalledVersion(venvDir, bundledVersion);
	const launch = buildBundledLaunch(venvDir, sourceDir, moduleDir, bundledVersion);
	output.appendLine(
		`Bundled proxy runtime ready (${bundledVersion}). Python source: ${moduleDir}`
	);
	bundledLaunch = launch;
	return launch;
}

export function shouldUseBundledProxyConfiguration(
	config: vscode.WorkspaceConfiguration
): boolean {
	return config.get<boolean>('useBundledProxy') ?? true;
}

async function prepareBundledProxyWithProgress(
	context: vscode.ExtensionContext,
	output: vscode.OutputChannel
): Promise<BundledProxyLaunch | undefined> {
	const locale = getEffectiveLocale(context);

	try {
		return await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: t(locale, 'extension.preparingProxy'),
				cancellable: false,
			},
			() => ensureBundledProxyRuntime(context, output)
		);
	} catch (error) {
		bundledLaunch = undefined;
		const message = formatBridgeError(error, locale);
		output.appendLine(`ERROR: ${message}`);

		const action = await vscode.window.showWarningMessage(
			t(locale, 'extension.proxyPrepareFailed', { message }),
			t(locale, 'extension.btnShowLogs'),
			t(locale, 'extension.btnOpenDashboard')
		);
		if (action === t(locale, 'extension.btnShowLogs')) {
			output.show(true);
		} else if (action === t(locale, 'extension.btnOpenDashboard')) {
			await vscode.commands.executeCommand('deepseek-cursor-bridge.openDashboard');
		}
		return undefined;
	}
}

export function ensureProxyConfiguration(
	context: vscode.ExtensionContext,
	output: vscode.OutputChannel,
	callbacks: ProxyConfigurationCallbacks = {}
): void {
	const config = vscode.workspace.getConfiguration('deepseekBridge');
	if (!shouldUseBundledProxyConfiguration(config)) {
		bundledLaunch = undefined;
		preparationPromise = undefined;
		callbacks.onReady?.();
		return;
	}

	if (bundledLaunch) {
		callbacks.onReady?.();
		return;
	}

	if (preparationPromise) {
		void preparationPromise.then((launch) => {
			if (launch) {
				callbacks.onReady?.();
			}
		});
		return;
	}

	preparationPromise = prepareBundledProxyWithProgress(context, output).finally(() => {
		preparationPromise = undefined;
	});

	void preparationPromise.then((launch) => {
		if (launch) {
			callbacks.onReady?.();
		}
	});
}
