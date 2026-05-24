import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid var(--color-destructive)',
          borderRadius: 6,
          fontSize: 12,
          color: 'var(--color-destructive)',
          fontFamily: 'var(--font-heading)',
        }}>
          ⚠ {this.props.name ?? 'Component'} error: {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}
