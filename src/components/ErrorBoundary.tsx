"use client";

import React from "react";

interface Props {
    children: React.ReactNode;
    fallbackTitle?: string;
}

interface State {
    hasError: boolean;
    message: string;
    resetKey: number;
}

/**
 * Catches render errors so one broken panel does not blank the whole app.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false, message: "", resetKey: 0 };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, message: error?.message || "Something went wrong." };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("ErrorBoundary caught:", error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
                    <h2 className="text-xl font-semibold text-white/90">
                        {this.props.fallbackTitle || "This section failed to load"}
                    </h2>
                    <p className="text-sm text-white/50 max-w-md">{this.state.message}</p>
                    <button
                        type="button"
                        className="rounded-lg bg-indigo-500/80 hover:bg-indigo-500 px-4 py-2 text-sm text-white"
                        onClick={() =>
                            this.setState((s) => ({ hasError: false, message: "", resetKey: s.resetKey + 1 }))
                        }
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return <div key={this.state.resetKey}>{this.props.children}</div>;
    }
}
