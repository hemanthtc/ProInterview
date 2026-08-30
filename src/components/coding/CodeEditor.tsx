"use client";

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

/** Tab-aware editor (Monaco-style indent without the extra bundle). */
export default function CodeEditor({ value, onChange, className = "" }: CodeEditorProps) {
    return (
        <textarea
            value={value}
            spellCheck={false}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if (e.key !== "Tab") return;
                e.preventDefault();
                const el = e.currentTarget;
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const next = `${value.slice(0, start)}  ${value.slice(end)}`;
                onChange(next);
                requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = start + 2;
                });
            }}
            className={className}
        />
    );
}
