import * as vscode from 'vscode';
import en from './locales/en.json';
import zh from './locales/zh.json';
import { TranslationKey, TranslationMap, UiLocale } from './types';

const STORAGE_KEY = 'deepseekBridge.uiLocale';

const catalogs: Record<UiLocale, TranslationMap> = { zh, en };

export function getStoredLocale(context: vscode.ExtensionContext): UiLocale | undefined {
	const stored = context.globalState.get<string>(STORAGE_KEY);
	return stored === 'zh' || stored === 'en' ? stored : undefined;
}

export function getEffectiveLocale(context: vscode.ExtensionContext): UiLocale {
	const config = vscode.workspace.getConfiguration('deepseekBridge');
	const setting = config.get<string>('uiLanguage') ?? 'auto';

	if (setting === 'zh' || setting === 'en') {
		return setting;
	}

	return getStoredLocale(context) ?? 'en';
}

export async function setStoredLocale(
	context: vscode.ExtensionContext,
	locale: UiLocale
): Promise<void> {
	await context.globalState.update(STORAGE_KEY, locale);
}

export function toggleLocale(locale: UiLocale): UiLocale {
	return locale === 'zh' ? 'en' : 'zh';
}

export function getTranslations(locale: UiLocale): TranslationMap {
	return catalogs[locale];
}

export function t(
	locale: UiLocale,
	key: TranslationKey,
	params?: Record<string, string>
): string {
	let text = catalogs[locale][key] ?? catalogs.en[key] ?? key;
	if (params) {
		for (const [name, value] of Object.entries(params)) {
			text = text.replaceAll(`{${name}}`, value);
		}
	}
	return text;
}

export type { TranslationKey, TranslationMap, UiLocale } from './types';
