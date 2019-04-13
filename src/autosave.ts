export function autoSave(code: string) {
	localStorage.setItem("autoSaved", code);
}

export function getLastSavedVersion(): string | undefined {
	return localStorage.getItem("autoSaved") || undefined;
}