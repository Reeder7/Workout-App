import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * Catches render crashes (e.g. from corrupt persisted/imported state) so the
 * app shows a recovery screen instead of a white screen that returns on every
 * launch. Offers a data reset that clears the persisted store.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  handleReset = () => {
    try {
      localStorage.removeItem('iron-log-v1')
    } catch {
      /* ignore */
    }
    location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app">
          <div className="empty" style={{ paddingTop: 60 }}>
            <div className="empty-emoji">🛠️</div>
            <h1 className="page-title" style={{ fontSize: 22 }}>
              Something went wrong
            </h1>
            <p className="hint">
              The app hit an error while loading your data. You can reload, or reset the app’s
              stored data if it keeps happening. Resetting removes plans, workouts, and notes
              on this device.
            </p>
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 16 }}
              onClick={() => location.reload()}
            >
              Reload
            </button>
            <button
              className="btn btn-danger btn-block"
              style={{ marginTop: 10 }}
              onClick={this.handleReset}
            >
              Reset app data
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
