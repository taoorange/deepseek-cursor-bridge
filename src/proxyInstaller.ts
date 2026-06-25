import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const VENV_DIR_NAME = 'proxy-venv';
const BUNDLED_PROXY_DIR = path.join('vendor', 'deepseek-cursor-proxy');
const INSTALLED_VERSION_FILE = '.installed-version';
const PROXY_MODULE = 'deepseek_cursor_proxy';

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

let bundledLaunch: BundledProxyLaunch | undefined;

export function getBundledProxyLaunch(): BundledProxyLaunch | undefined {
	return bundledLaunch;
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

async function findPythonCommand(): Promise<string[]> {
	const candidates =
		process.platform === 'win32'
			? [['py', '-3'], ['python'], ['python3']]
			: [['python3'], ['python']];

	for (const args of candidates) {
		try {
			const result = await runCommand(args[0], args.slice(1).concat(['--version']));
			if (result.code === 0) {
				return args;
			}
		} catch {
			// try next candidate
		}
	}

	throw new Error(
		'Python 3.10+ is required but was not found on PATH. Install Python 3 and try again.'
	);
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
		throw new Error(
			`Failed to create Python virtual environment.\n${result.stderr || result.stdout}`.trim()
		);
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
		throw new Error(`pip not found in virtual environment: ${pip}`);
	}

	output.appendLine('Installing bundled proxy dependency: PyYAML');
	const result = await runCommand(pip, ['install', 'PyYAML>=6.0']);
	if (result.code !== 0) {
		throw new Error(
			`Failed to install proxy dependencies.\n${result.stderr || result.stdout}`.trim()
		);
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
		throw new Error(
			`Bundled proxy source not found at ${moduleDir}. Reinstall the DeepSeek Bridge extension.`
		);
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

export async function ensureProxyConfiguration(
	context: vscode.ExtensionContext,
	output: vscode.OutputChannel
): Promise<void> {
	const config = vscode.workspace.getConfiguration('deepseekBridge');
	if (!shouldUseBundledProxyConfiguration(config)) {
		bundledLaunch = undefined;
		return;
	}

	const locale =
		config.get<string>('uiLanguage') === 'zh'
			? 'zh'
			: config.get<string>('uiLanguage') === 'en'
				? 'en'
				: vscode.env.language.startsWith('zh')
					? 'zh'
					: 'en';

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title:
				locale === 'zh'
					? '正在准备内置 DeepSeek 代理…'
					: 'Preparing built-in DeepSeek proxy…',
			cancellable: false,
		},
		() => ensureBundledProxyRuntime(context, output)
	);
}
