import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('AuraDesk Error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
                    <div className="volumetric-surface rounded-[32px] p-10 max-w-lg w-full text-center space-y-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
                                Something went wrong
                            </h2>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                                An unexpected error occurred. Your data is safe — it's stored locally in your browser.
                            </p>
                        </div>
                        {this.state.error && (
                            <div className="volumetric-input rounded-[16px] px-4 py-3 text-left">
                                <p className="text-xs font-mono break-all" style={{ color: 'var(--text-muted)' }}>
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="volumetric-btn px-6 py-3 rounded-[16px] text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="volumetric-btn volumetric-btn-primary px-6 py-3 rounded-[16px] text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Reload App
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
