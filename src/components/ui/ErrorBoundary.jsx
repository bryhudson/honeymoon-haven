import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { UpdateAvailableModal } from './UpdateAvailableModal';

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
                return <UpdateAvailableModal onReload={this.handleReload} />;
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
