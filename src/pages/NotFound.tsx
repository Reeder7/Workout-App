import { useLocation, useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'

/**
 * The catch-all. Before this existed, an unmatched hash rendered nothing at all —
 * a blank page with a tab bar and no way to tell what had gone wrong.
 */
export function NotFound() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  // A leftover auth fragment is the one unmatched path worth naming, since it is
  // the only one a user reaches by following a link they were sent.
  const looksLikeAuth = /access_token|refresh_token|error_code|error=|token_hash|(^\/code=)/.test(
    pathname,
  )

  return (
    <div className="app">
      <PageHeader title={looksLikeAuth ? 'Sign-in link' : 'Page not found'} />
      <EmptyState
        glyph={looksLikeAuth ? 'note' : 'search'}
        title={looksLikeAuth ? "That link couldn't be read" : "That page doesn't exist"}
        body={
          looksLikeAuth
            ? 'The sign-in link was malformed or already used. Request a new one.'
            : 'The link may be out of date, or it pointed at something that has since been deleted.'
        }
      >
        {looksLikeAuth ? (
          <button className="btn btn-primary" onClick={() => nav('/join')}>
            Go to sign in
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => nav('/')}>
            Go to Train
          </button>
        )}
      </EmptyState>
    </div>
  )
}
