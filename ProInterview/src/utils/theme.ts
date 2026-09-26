export type ThemeMode = "dark" | "light" | "eyeprotect";

export function readStoredTheme(): ThemeMode {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("globalTheme");
    if (saved === "light" || saved === "eyeprotect" || saved === "dark") return saved;
    return "dark";
}

export function applyThemeToDocument(theme: ThemeMode): void {
    if (typeof document === "undefined") return;
    document.documentElement.className =
        theme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${theme}`;
    document.documentElement.style.colorScheme = theme === "eyeprotect" ? "light" : theme;
}

export function createInitialThemeState(): ThemeMode {
    const theme = readStoredTheme();
    applyThemeToDocument(theme);
    return theme;
}

export function persistTheme(theme: ThemeMode): void {
    localStorage.setItem("globalTheme", theme);
    applyThemeToDocument(theme);
}
