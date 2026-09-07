/** Run state updates after the current effect flush (react-hooks/set-state-in-effect). */
export function deferEffectWork(work: () => void): () => void {
    const timer = window.setTimeout(work, 0);
    return () => window.clearTimeout(timer);
}
