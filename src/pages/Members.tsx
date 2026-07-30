import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Segmented } from '../components/Segmented'
import { memberSource, memberSummary, withTimeout } from '../lib/members'
import { relativeDate } from '../lib/format'
import { toast } from '../lib/toast'
import type { MemberProfile, MemberStatus } from '../types'

type Tab = 'pending' | 'approved' | 'rejected'

export function Members() {
  const nav = useNavigate()
  const unit = useStore((s) => s.settings.unit)
  const source = memberSource()

  const [tab, setTab] = useState<Tab>('pending')
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setMembers(await withTimeout(source.list()))
    } catch (e) {
      // Held on screen with a retry, not flashed in a toast: if this fails there
      // is nothing else on the page and nothing else to do.
      setError(e instanceof Error ? e.message : "Couldn't load members")
    } finally {
      setLoading(false)
    }
  }, [source])

  useEffect(() => {
    void load()
  }, [load])

  async function review(m: MemberProfile, status: MemberStatus) {
    setBusyId(m.id)
    try {
      await withTimeout(source.setStatus(m.id, status))
      // Reflect it locally rather than refetching — one row changed.
      setMembers((list) =>
        list.map((x) => (x.id === m.id ? { ...x, status, reviewedAt: Date.now() } : x)),
      )
      toast(status === 'approved' ? `${m.displayName} approved` : `${m.displayName} rejected`,
        status === 'approved' ? 'success' : 'neutral')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That did not go through', 'danger')
    } finally {
      setBusyId(null)
    }
  }

  const shown = members.filter((m) => m.status === tab)
  const pendingCount = members.filter((m) => m.status === 'pending').length

  return (
    <div className="app">
      <PageHeader
        eyebrow="Admin"
        title="Members"
        sub="Approve who can see the feed. Nobody gets in automatically."
        onBack={() => nav('/settings')}
      />

      {!source.connected ? (
        <EmptyState
          glyph="search"
          title="No backend connected"
          body="Members live on the server. Once a Supabase project is configured, signups will appear here for approval."
        />
      ) : (
        <>
          <Segmented
            label="Member status"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'pending', label: pendingCount ? `Pending (${pendingCount})` : 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />

          {loading ? (
            <p className="hint" style={{ marginTop: 'var(--space-5)' }}>
              Loading…
            </p>
          ) : error ? (
            <EmptyState glyph="search" title="Couldn't load members" body={error}>
              <button className="btn btn-primary" onClick={() => void load()}>
                Try again
              </button>
            </EmptyState>
          ) : shown.length === 0 ? (
            <EmptyState
              glyph="people"
              title={tab === 'pending' ? 'Nothing to review' : `No ${tab} members`}
              body={
                tab === 'pending'
                  ? 'New signups will show up here with the details they entered.'
                  : undefined
              }
            />
          ) : (
            <div style={{ marginTop: 'var(--space-4)' }}>
              {shown.map((m) => {
                const summary = memberSummary(m, unit)
                return (
                  <div className="card" key={m.id}>
                    <div className="row-between">
                      <div className="grow">
                        <div style={{ fontWeight: 640, fontSize: 16 }}>{m.displayName}</div>
                        <div className="faint" style={{ fontSize: 12 }}>
                          {m.email}
                        </div>
                        {summary && (
                          <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>
                            {summary}
                          </div>
                        )}
                        <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>
                          Signed up {relativeDate(m.createdAt)}
                        </div>
                      </div>
                    </div>

                    {m.status === 'pending' ? (
                      <div className="row" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                        <button
                          className="btn btn-sm btn-primary grow"
                          disabled={busyId === m.id}
                          onClick={() => review(m, 'approved')}
                        >
                          <Icon name="check" size={15} /> Approve
                        </button>
                        <button
                          className="btn btn-sm btn-danger grow"
                          disabled={busyId === m.id}
                          onClick={() => review(m, 'rejected')}
                        >
                          <Icon name="x" size={15} /> Reject
                        </button>
                      </div>
                    ) : (
                      <div className="row" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                        <span className={`pill${m.status === 'approved' ? ' pill-accent' : ''}`}>
                          {m.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                        <button
                          className="btn btn-sm btn-ghost"
                          disabled={busyId === m.id}
                          onClick={() => review(m, m.status === 'approved' ? 'rejected' : 'approved')}
                        >
                          {m.status === 'approved' ? 'Revoke access' : 'Approve instead'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
