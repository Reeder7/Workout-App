import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'

export function Settings() {
  const nav = useNavigate()
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)
  const plans = useStore((s) => s.plans)
  const sessions = useStore((s) => s.sessions)

  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function doExport() {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `iron-log-backup-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function doImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = importData(String(reader.result))
      setMsg(ok ? 'Backup imported successfully.' : 'Could not read that file.')
    }
    reader.readAsText(file)
  }

  return (
    <div className="app">
      <div className="row-between" style={{ marginBottom: 8 }}>
        <button className="icon-btn" onClick={() => nav('/library')} aria-label="Back">
          <Icon name="back" size={18} />
        </button>
      </div>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">Everything is stored privately on this device.</p>

      <div className="section-head">
        <h2>Units</h2>
      </div>
      <div className="card">
        <div className="row" style={{ gap: 10 }}>
          {(['lb', 'kg'] as const).map((u) => (
            <button
              key={u}
              className={`btn grow${settings.unit === u ? ' btn-primary' : ''}`}
              onClick={() => setSettings({ unit: u })}
            >
              {u === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginBottom: 0, marginTop: 10 }}>
          This changes the label only — your logged numbers aren't converted.
        </p>
      </div>

      <div className="section-head">
        <h2>Your name</h2>
      </div>
      <div className="card">
        <input
          placeholder="Optional — used in greetings"
          value={settings.name ?? ''}
          onChange={(e) => setSettings({ name: e.target.value })}
        />
      </div>

      <div className="section-head">
        <h2>Backup & data</h2>
      </div>
      <div className="card">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>
              {plans.length} plans · {sessions.length} workouts
            </div>
            <div className="faint" style={{ fontSize: 12 }}>
              Export a backup to keep your data safe or move it to another device.
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn grow" onClick={doExport}>
            <Icon name="download" size={16} /> Export
          </button>
          <button className="btn grow" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) doImport(f)
            e.target.value = ''
          }}
        />
        {msg && (
          <p className="hint" style={{ marginBottom: 0, marginTop: 10 }}>
            {msg}
          </p>
        )}
      </div>

      <div className="spacer" />
      <button className="btn btn-danger btn-block" onClick={() => setConfirmReset(true)}>
        <Icon name="trash" size={16} /> Reset all data
      </button>

      <p className="faint center" style={{ fontSize: 11, marginTop: 20 }}>
        Iron Log · your training, tracked. v0.1
      </p>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset everything?">
        <p className="hint" style={{ marginTop: 0 }}>
          This permanently deletes all plans, workouts, and custom exercises on this device.
          Consider exporting a backup first.
        </p>
        <button
          className="btn btn-danger btn-block"
          onClick={() => {
            resetAll()
            setConfirmReset(false)
            nav('/')
          }}
        >
          Yes, delete everything
        </button>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 8 }}
          onClick={() => setConfirmReset(false)}
        >
          Cancel
        </button>
      </Sheet>
    </div>
  )
}
