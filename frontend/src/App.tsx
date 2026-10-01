import { useState } from 'react'
import SessionComparison from './components/SessionComparison'
import { useSessions } from './hooks/useSessions'

function App() {
  const { sessions, sessionsLoading, sessionsError } = useSessions(2024)
  const [selectedSessionKey, setSelectedSessionKey] = useState<number | null>(null)
  const selectedSession = sessions.find((session) => session.session_key === selectedSessionKey) ?? null

  const sessionControl = (
    <section className="session-setup" aria-labelledby="session-setup-title">
      <div className="setup-fields p-[25px_19px_20px] [border-bottom:1px_solid_var(--border)] mobile:p-[20px_16px]">
        <h2 id="session-setup-title" className="text-[16px] font-medium mb-[22px] mobile:mb-[14px] mobile:text-[15px]">Session setup</h2>
        <div className="driver-field min-w-0 flex flex-col gap-[9px] session-field">
          <label htmlFor="session" className="[font:12px_var(--mono)] uppercase text-(--muted) tracking-[.04em] flex items-center gap-[8px]">Session / 2024 qualifying</label>
          <select
            id="session"
            value={selectedSessionKey ?? ''}
            onChange={(event) => setSelectedSessionKey(event.target.value === '' ? null : Number(event.target.value))}
            disabled={sessionsLoading}
            className="w-full min-w-0 min-h-[42px] p-[10px_25px_10px_10px] [border:1px_solid_var(--border)] rounded-[2px] text-(--text) bg-[#141518] text-[12px] cursor-pointer disabled:opacity-[.6] disabled:cursor-not-allowed"
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
        {sessionsLoading && <p className="status text-[12px] leading-[1.7] mt-[14px] text-(--muted)" role="status">Loading sessions…</p>}
        {sessionsError && <p className="error text-[12px] leading-[1.7] mt-[14px] text-[#ff8894] [overflow-wrap:anywhere]" role="alert">{sessionsError}</p>}
        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <p className="status text-[12px] leading-[1.7] mt-[14px] text-(--muted)">No qualifying sessions available for 2024.</p>
        )}
      </div>
    </section>
  )

  return (
    <main className="dashboard min-h-dvh flex flex-col">
      <header className="site-header min-h-[65px] flex items-center gap-[30px] p-[12px_23px] bg-[#0d0e10] [border-bottom:1px_solid_var(--border)] mobile:p-[13px_16px] mobile:gap-[18px]">
        <div className="site-brand flex items-center gap-[11px]">
          <strong className="text-[22px] font-semibold leading-none tracking-[-.03em] tiny:text-[19px]"><span className="text-(--accent)">f1</span>-analysis</strong>
        </div>
        <div className="site-header-end ml-auto flex items-center gap-[25px] [font:9px_var(--mono)] text-(--muted)">
          <a className="site-credit text-(--text) no-underline [font:12px_'IBM_Plex_Sans',_sans-serif] whitespace-nowrap [&:hover]:text-(--accent) focus-visible:[outline:2px_solid_var(--accent)] focus-visible:[outline-offset:4px] mobile:text-[11px]" href="https://github.com/anrunt" target="_blank" rel="noopener noreferrer"><span className="text-(--muted)">made by</span> anrunt</a>
        </div>
      </header>

      {selectedSession ? (
        <SessionComparison key={selectedSession.session_key} session={selectedSession} sessionControl={sessionControl} />
      ) : (
        <div className="workspace grid grid-cols-[242px_minmax(0,_1fr)_272px] flex-1 wide:grid-cols-[270px_minmax(0,_1fr)_310px] compact:grid-cols-[209px_minmax(0,_1fr)_236px] stacked:grid-cols-[215px_minmax(0,_1fr)] mobile:flex mobile:flex-col">
          <aside className="workspace-sidebar min-w-0 bg-[#0b0c0e] [border-right:1px_solid_var(--border)] flex flex-col mobile:[border-right:0] mobile:[border-bottom:1px_solid_var(--border)]">{sessionControl}</aside>
          <section className="telemetry-workspace min-w-0 p-[25px_22px_17px] flex flex-col wide:p-[28px] compact:p-[22px_15px_15px] mobile:p-[22px_16px]" aria-labelledby="page-title">
            <div className="workspace-heading flex items-center justify-between gap-[15px] mb-[23px] mobile:mb-[18px]"><div><p className="eyebrow [font:400_9px/1.6_var(--mono)] text-(--muted) tracking-[.08em]">TELEMETRY WORKSPACE</p><h1 id="page-title" className="text-[23px] font-medium tracking-[-.6px] mt-[8px] leading-[1.5] compact:text-[19px] stacked:text-[18px] mobile:text-[22px] tiny:text-[19px]">Lap comparison</h1></div></div>
            <div className="workspace-empty flex-1 min-h-[440px] flex flex-col justify-center items-center text-center p-[35px_20px] [border:1px_solid_var(--border)] bg-(--panel) rounded-[3px] [&_>_p:not(.eyebrow)]:max-w-[360px] [&_>_p:not(.eyebrow)]:text-[13px] [&_>_p:not(.eyebrow)]:leading-[1.8] [&_>_p:not(.eyebrow):not(.error)]:text-(--muted) [&_>_p:not(.eyebrow)]:mt-[14px] [&_>_p.error]:text-[#ff8894] mobile:min-h-[330px] mobile:p-[28px_16px]">
              <span className="empty-symbol text-[74px] leading-none text-(--accent) mb-[27px]" aria-hidden="true">⌁</span>
              <h2 className="text-[clamp(22px,_2.2vw,_32px)] font-medium tracking-[-.6px] mt-[13px] mobile:text-[24px]">Start your analysis</h2>
              <p>Select a qualifying session, then compare two drivers’ fastest available laps.</p>
            </div>
          </section>
          <aside className="comparison-summary min-w-0 bg-[#0d0e10] [border-left:1px_solid_var(--border)] stacked:[grid-column:1_/_-1] stacked:[border-left:0] stacked:[border-top:1px_solid_var(--border)] stacked:grid stacked:grid-cols-2 tablet:gap-[14px] tablet:p-[22px_20px] tablet:content-start mobile:gap-[12px] mobile:p-[20px_16px] mobile:content-start" aria-label="Comparison summary">
            <div className="summary-heading flex items-center justify-between gap-[8px] p-[24px_20px] [border-bottom:1px_solid_var(--border)] compact:pl-[17px] compact:pr-[17px] stacked:[grid-column:1_/_-1] tablet:p-[0_0_4px] tablet:[border-bottom:0] mobile:p-[0_0_4px] mobile:[border-bottom:0]"><h2 className="[font:9px/1.6_var(--mono)] text-(--muted) tracking-[.08em] flex items-center min-h-[20px]">COMPARISON SUMMARY</h2></div>
            <div className="summary-empty p-[28px_20px] stacked:[grid-column:1_/_-1] tablet:p-[16px_18px] tablet:[border:1px_solid_var(--border)] tablet:rounded-[4px] tablet:bg-(--panel) mobile:p-[16px_12px] mobile:[border:1px_solid_var(--border)] mobile:rounded-[4px] mobile:bg-(--panel)"><p className="text-[12px] leading-[1.8] text-(--muted)">Your lap times and sector differences will appear here</p></div>
          </aside>
        </div>
      )}

    </main>
  )
}

export default App
