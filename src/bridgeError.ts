import { getEffectiveLocale, t, UiLocale } from './i18n';
import { TranslationKey } from './i18n/types';
import * as vscode from 'vscode';

export class BridgeError extends Error {
	constructor(
		readonly translationKey: TranslationKey,
		readonly translationParams?: Record<string, string>
	) {
		super(translationKey);
		this.name = 'BridgeError';
	}
}

export function formatBridgeError(
	error: unknown,
	locale: UiLocale
): string {
	if (error instanceof BridgeError) {
		return t(locale, error.translationKey, error.translationParams);
	}
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

export function localeFromContext(context: vscode.ExtensionContext): UiLocale {
	return getEffectiveLocale(context);
}
