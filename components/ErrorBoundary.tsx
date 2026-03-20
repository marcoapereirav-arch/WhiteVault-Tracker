import React from 'react';
import { Icons } from './Icons';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('WhiteVault Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-8 shadow-2xl border border-black/10 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.Close className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-display font-bold text-onyx mb-2">
              Algo salió mal
            </h2>
            <p className="text-graphite text-sm mb-6">
              Ha ocurrido un error inesperado. Por favor, recarga la página para continuar.
            </p>
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-graphite cursor-pointer uppercase tracking-widest font-bold">
                  Detalles del error
                </summary>
                <pre className="mt-2 p-3 bg-stone text-xs text-red-600 overflow-auto max-h-32 border border-black/5">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-onyx text-white font-display font-bold text-sm uppercase tracking-widest hover:bg-alloy transition-colors"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
