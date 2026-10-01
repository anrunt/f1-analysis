import { useState } from 'react'
import SessionComparison from './components/SessionComparison'
import { useSessions } from './hooks/useSessions'
import './App.css'

function App() {
  const { sessions, sessionsLoading, sessionsError } = useSessions(2024)
  const [selectedSessionKey, setSelectedSessionKey] = useState<number | null>(null)
  const selectedSession = sessions.find((session) => session.session_key === selectedSessionKey) ?? null

  const sessionControl = (
    <section className="session-setup" aria-labelledby="session-setup-title">
      <div className="setup-fields">
        <h2 id="session-setup-title">Session setup</h2>
        <div className="driver-field session-field">
          <label htmlFor="session">Session / 2024 qualifying</label>
          <select
            id="session"
            value={selectedSessionKey ?? ''}
            onChange={(event) => setSelectedSessionKey(event.target.value === '' ? null : Number(event.target.value))}
            disabled={sessionsLoading}
          >
            <option value="">Select session</option>
            {sessions.map((session) => (
              <option key={session.session_key} value={session.session_key}>
                {session.circuit_short_name} · {session.session_name} ·{' '}
                {new Date(session.date_start).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
                })}
              </option>
            ))}
          </select>
        </div>
        {sessionsLoading && <p className="status" role="status">Loading sessions…</p>}
        {sessionsError && <p className="error" role="alert">{sessionsError}</p>}
        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <p className="status">No qualifying sessions available for 2024.</p>
        )}
      </div>
    </section>
  )

  return (
    <main className="dashboard">
      <header className="site-header">
        <div className="site-brand">
          <strong><span>f1</span>-analysis</strong>
        </div>
        <div className="site-header-end">
          <a className="site-credit" href="https://github.com/anrunt" target="_blank" rel="noopener noreferrer"><span>made by</span> anrunt</a>
        </div>
      </header>

      {selectedSession ? (
        <SessionComparison key={selectedSession.session_key} session={selectedSession} sessionControl={sessionControl} />
      ) : (
        <div className="workspace">
          <aside className="workspace-sidebar">{sessionControl}</aside>
          <section className="telemetry-workspace" aria-labelledby="page-title">
            <div className="workspace-heading"><div><p className="eyebrow">TELEMETRY WORKSPACE</p><h1 id="page-title">Lap comparison</h1></div></div>
            <div className="workspace-empty">
              <span className="empty-symbol" aria-hidden="true">⌁</span>
              <h2>Start your analysis</h2>
              <p>Select a qualifying session, then compare two drivers’ fastest available laps.</p>
            </div>
          </section>
          <aside className="comparison-summary" aria-label="Comparison summary">
            <div className="summary-heading"><h2>COMPARISON SUMMARY</h2></div>
            <div className="summary-empty"><p>Your lap times and sector differences will appear here</p></div>
          </aside>
        </div>
      )}

    </main>
  )
}

export default App
