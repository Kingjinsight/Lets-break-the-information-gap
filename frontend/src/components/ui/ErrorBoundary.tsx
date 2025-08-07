import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--color-bg-primary)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center"
          >
            <div className="glass-card p-8">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              >
                <AlertTriangle className="h-8 w-8" style={{ color: '#ef4444' }} />
              </div>
              
              <h1 
                className="text-2xl font-bold mb-4"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Something went wrong
              </h1>
              
              <p 
                className="mb-6"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                We encountered an unexpected error. This has been logged and we're working to fix it.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div 
                  className="p-4 rounded-lg mb-6 text-left"
                  style={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <p className="text-sm font-mono" style={{ color: '#ef4444' }}>
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReload}
                  className="btn-accent flex items-center justify-center space-x-2 py-3 px-4"
                >
                  <RefreshCw className="h-5 w-5" />
                  <span>Reload Page</span>
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="btn-secondary flex items-center justify-center space-x-2 py-3 px-4"
                >
                  <Home className="h-5 w-5" />
                  <span>Go Home</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 简单的错误显示组件
interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  className = '' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-lg border ${className}`}
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.2)'
      }}
    >
      <div className="flex items-start space-x-3">
        <AlertTriangle 
          className="h-5 w-5 flex-shrink-0 mt-0.5" 
          style={{ color: '#ef4444' }} 
        />
        <div className="flex-1">
          <p className="text-sm" style={{ color: '#ef4444' }}>
            {error}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium hover:underline"
              style={{ color: '#ef4444' }}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ErrorBoundary;
