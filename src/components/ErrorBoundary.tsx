import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { BRAND } from '../lib/brand'

type Props = { children: ReactNode }
type State = { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container py-5" style={{ maxWidth: 520 }}>
          <Alert variant="danger">
            <Alert.Heading>Something went wrong</Alert.Heading>
            <p className="mb-2 small">{this.state.error.message || 'Unexpected error'}</p>
            <p className="small text-muted mb-3">
              Try reloading. If this keeps happening on {BRAND}, clear site data or contact support.
            </p>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => {
                this.setState({ error: null })
                window.location.href = '/'
              }}
            >
              Go home
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="ms-2"
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          </Alert>
        </div>
      )
    }
    return this.props.children
  }
}
