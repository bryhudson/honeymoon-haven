import React from 'react';
import { RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false };
    }

    static getDerivedStateFromError(error) {
        // Check for chunk load error (version mismatch)
        const isChunkError = error?.message?.includes('Failed to fetch dynamically imported module') ||
            error?.message?.includes('Importing a module script failed');
        return { hasError: true, error, isChunkError };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // SPECIFIC UI FOR VERSION MISMATCH (Chunk Load Error)
            if (this.state.isChunkError) {
                return (
                    <div className="fixed inset-0 z-[999999] bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[24px] max-w-[400px] w-full p-8 text-center shadow-2xl relative">
                            {/* Icon */}
                            <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                <Sparkles className="w-8 h-8 text-indigo-600" />
                            </div>
                            
                            <h1 className="text-2xl font-bold text-slate-900 mb-3">Update Available</h1>
                            
                            <p className="text-slate-500 mb-8 text-[15px] leading-relaxed">
                                A new version of HHR has been installed. Please relaunch the app to apply the latest features and improvements.
                            </p>
                            
                            <button
                                onClick={this.handleReload}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 px-6 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Relaunch to Apply
                            </button>

                            <p className="text-[13px] text-slate-400 mt-5">
                                This only takes a second and ensures the app runs smoothly.
                            </p>
                        </div>
                    </div>
                );
            }

            // GENERIC ERROR FALLBACK
            return (
                <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-red-50 p-4 rounded-full mb-4">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong.</h1>
                    <p className="text-slate-500 mb-6">We encountered an unexpected error.</p>

                    <div className="bg-slate-100 p-4 rounded-lg text-left overflow-auto max-w-lg w-full mb-6 max-h-48 border border-slate-200">
                        <p className="text-red-600 font-mono text-xs break-all">
                            {this.state.error && this.state.error.toString()}
                        </p>
                        {this.state.errorInfo && (
                            <pre className="text-slate-500 font-mono text-[10px] mt-2 whitespace-pre-wrap">
                                {this.state.errorInfo.componentStack}
                            </pre>
                        )}
                    </div>

                    <button
                        onClick={this.handleReload}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
