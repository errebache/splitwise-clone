import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Oops! Une erreur s'est produite
            </h2>
            
            <p className="text-gray-600 mb-6">
              Quelque chose s'est mal passé. Veuillez réessayer ou rafraîchir la page.
            </p>
            
            {this.state.error && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-700 font-mono">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 flex items-center justify-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Réessayer</span>
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Rafraîchir
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}