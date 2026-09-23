import { useState } from 'react'
import SessionComparison from './components/SessionComparison'
import { useSessions } from './hooks/useSessions'
import './App.css'

function App() {
  const { sessions, sessionsLoading, sessionsError } = useSessions(2024)
  const [selectedSessionKey, setSelectedSessionKey] = useState<number | null>(null)
  const selectedSession = sessions.find((session) => session.session_key === selectedSessionKey) ?? null

  return (
    <main className="dashboard">
      <header className="site-header">
        <span className="site-mark" aria-hidden="true">◩</span>
        <span>APEX / LAP ANALYSIS</span>
        <span className="site-header-end">OPENF1 DATA</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">QUALIFYING · 2024</p>
        <h1 id="page-title">Lap <em>against</em> lap.</h1>
        <p className="intro-description">
          Choose a qualifying session and two drivers to compare their fastest available laps.
          One click, two lap times, one difference.
        </p>
        <div className="driver-field session-field">
          <label htmlFor="session">Qualifying session</label>
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
      </section>

      {selectedSession && (
        <SessionComparison key={selectedSession.session_key} session={selectedSession} />
      )}

      <footer className="site-footer">01 / LAP COMPARISON <span>DATA SOURCE — OPENF1</span></footer>
    </main>
  )
}

export default App
