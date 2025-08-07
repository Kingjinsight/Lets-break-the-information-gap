import { Component, type ErrorInfo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--color-bg-primary)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md w-full text-center"
          >
            <div className="glass-card p-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
                style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444'
                }}
              >
                <AlertTriangle className="h-8 w-8" />
              </motion.div>

              <h1 
                className="text-2xl font-bold mb-4"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Oops! Something went wrong
              </h1>

              <p 
                className="text-sm mb-6"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                We encountered an unexpected error. This has been logged and we'll look into it.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary 
                    className="cursor-pointer text-sm font-medium mb-2"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Error Details
                  </summary>
                  <pre 
                    className="text-xs p-3 rounded-lg overflow-auto max-h-40"
                    style={{ 
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="space-y-3">
                <motion.button
                  onClick={this.handleReload}
                  className="btn-accent w-full flex items-center justify-center space-x-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reload Page</span>
                </motion.button>

                <motion.button
                  onClick={this.handleGoHome}
                  className="btn-secondary w-full flex items-center justify-center space-x-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Home className="h-4 w-4" />
                  <span>Go to Dashboard</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
