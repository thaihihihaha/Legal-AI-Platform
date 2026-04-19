import React from 'react';
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/slices/uiSlice';

/**
 * Error Boundary Component
 * Catches errors in child components and displays fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console and monitoring service
    console.error('❌ Error caught by boundary:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Send to monitoring service (e.g., Sentry)
    this.logErrorToService(error, errorInfo);

    // If too many errors, force reload
    if (this.state.errorCount > 5) {
      console.warn('⚠️ Too many errors, reloading page...');
      setTimeout(() => window.location.reload(), 3000);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // TODO: Integrate with Sentry or similar service
    const errorData = {
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    // Log to server
    fetch('/v1/logs/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData),
    }).catch(err => console.error('Failed to log error:', err));
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Đã xảy ra lỗi</h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'Điều gì đó đã sai'}
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mb-6 p-3 bg-gray-100 rounded text-sm">
                <summary className="cursor-pointer font-semibold">Chi tiết lỗi</summary>
                <pre className="mt-2 overflow-auto text-xs">
                  {this.state.error?.stack}
                </pre>
                <pre className="mt-2 overflow-auto text-xs">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReset}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-2"
            >
              🔄 Thử lại
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              🏠 Quay về trang chủ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
