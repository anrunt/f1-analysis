import { useState } from 'react'
import type { ReactNode } from 'react'
import { z } from 'zod'
import { ApiErrorSchema, ComparisonResultSchema } from '../types'
import type { ComparisonResult, Session } from '../types'
import { useDrivers } from '../hooks/useDrivers'
import DriverSelector from './DriverSelector'
import TelemetryComparisonChart from './TelemetryComparisonChart'

type Props = {
  session: Session
  sessionControl: ReactNode
}

function formatLapTime(seconds: number) {
  const milliseconds = Math.round(seconds * 1000)
  const minutes = Math.floor(milliseconds / 60000)
  const remainingSeconds = ((milliseconds % 60000) / 1000).toFixed(3).padStart(6, '0')
  return `${minutes}:${remainingSeconds}`
}

function SessionComparison({ session, sessionControl }: Props) {
  const { drivers, driversLoading, driversError } = useDrivers(session.session_key)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function getDriverName(number: number) {
    const driver = drivers.find((entry) => entry.driver_number === number)
    return driver?.full_name ?? driver?.name_acronym ?? `Driver #${number}`
  }

  function getDriverCode(number: number) {
    const driver = drivers.find((entry) => entry.driver_number === number)
    return driver?.name_acronym ?? `#${number}`
  }

  let largestSector: { index: number; delta: number } | null = null
  for (const [index, delta] of (result?.sector_deltas_s ?? []).entries()) {
    if (delta !== null && (largestSector === null || Math.abs(delta) > Math.abs(largestSector.delta))) {
      largestSector = { index, delta }
    }
  }
  const largestSectorMagnitude = largestSector === null ? 0 : Math.abs(largestSector.delta)

  async function handleCompare(driverA: number, driverB: number) {
    setResult(null)
    setError(null)
    setLoading(true)

    const params = new URLSearchParams({
      session_id: String(session.session_key),
      driver_a: String(driverA),
      driver_b: String(driverB),
    })

    try {
      const response = await fetch(`/api/compare?${params}`)
      const data: unknown = await response.json()

      if (!response.ok) {
        const apiError = ApiErrorSchema.safeParse(data)
        throw new Error(apiError.success ? apiError.data.detail : 'Could not retrieve the comparison.')
      }

      setResult(ComparisonResultSchema.parse(data))
    } catch (caughtError) {
      setError(
        caughtError instanceof z.ZodError || caughtError instanceof SyntaxError
          ? 'Received an invalid response from the server.'
          : caughtError instanceof Error
            ? caughtError.message
            : 'Could not retrieve the comparison.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        {sessionControl}
        <section className="session-controls" aria-label="Driver comparison setup">
          <DriverSelector
            drivers={drivers}
            driversLoading={driversLoading}
            driversError={driversError}
            comparing={loading}
            onCompare={handleCompare}
          />
        </section>
        <section className="session-context" aria-labelledby="session-context-title">
          <h2 id="session-context-title" className="eyebrow">SESSION CONTEXT</h2>
          <dl>
            <div><dt>Circuit</dt><dd>{session.circuit_short_name}</dd></div>
            <div><dt>Session</dt><dd>{session.session_name}</dd></div>
            <div><dt>Date</dt><dd>{new Date(session.date_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</dd></div>
            <div><dt>Session key</dt><dd>{session.session_key}</dd></div>
            <div><dt>Data source</dt><dd>OpenF1</dd></div>
          </dl>
        </section>
      </aside>

      <section className="telemetry-workspace" aria-labelledby="page-title" aria-busy={loading}>
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">TELEMETRY WORKSPACE</p>
            <h1 id="page-title">Lap comparison{result && <span className="comparison-codes"> / {getDriverCode(result.driver_a.driver_number)} × {getDriverCode(result.driver_b.driver_number)}</span>}</h1>
          </div>
        </div>
        {result ? (
          <TelemetryComparisonChart
            result={result}
            driverALabel={getDriverCode(result.driver_a.driver_number)}
            driverBLabel={getDriverCode(result.driver_b.driver_number)}
          />
        ) : (
          <div className="workspace-empty">
            <span className={`empty-symbol${loading ? ' empty-symbol--loading' : ''}`} aria-hidden="true">⌁</span>
            <p className="eyebrow">{loading ? 'LOADING TELEMETRY' : error ? 'COMPARISON UNAVAILABLE' : 'READY TO COMPARE'}</p>
            <h2>{loading ? 'Retrieving lap data.' : error ? 'Unable to load this comparison.' : 'Choose your comparison pair.'}</h2>
            {loading ? <p role="status">Fetching lap times, sector differences and telemetry…</p> : error ? <p className="error" role="alert">{error}</p> : <p>Select two different drivers and run a lap comparison.</p>}
          </div>
        )}
      </section>

      <aside className="comparison-summary" aria-labelledby="results-title">
        <div className="summary-heading"><h2 id="results-title">COMPARISON SUMMARY</h2></div>
        {result ? (
          <>
            <section className={`delta-block delta-block--${result.lap_delta_s < 0 ? 'a' : result.lap_delta_s > 0 ? 'b' : 'equal'}`} aria-labelledby="lap-delta-title">
              <h3 id="lap-delta-title" className="eyebrow">LAP DELTA <span>A − B</span></h3>
              <strong>{result.lap_delta_s > 0 ? '+' : ''}{result.lap_delta_s.toFixed(3)}<small> s</small></strong>
              <p>{result.lap_delta_s === 0 ? 'Equal lap times' : <><span className="driver-dot" aria-hidden="true" />{result.lap_delta_s < 0 ? getDriverCode(result.driver_a.driver_number) : getDriverCode(result.driver_b.driver_number)} faster by {Math.abs(result.lap_delta_s).toFixed(3)} s</>}</p>
            </section>
            <div className="lap-grid">
              {[result.driver_a, result.driver_b].map((lap, index) => {
                const driver = drivers.find((entry) => entry.driver_number === lap.driver_number)
                return (
                  <article key={lap.driver_number} className={`lap-card lap-card--${index === 0 ? 'a' : 'b'}`}>
                    <div className="lap-card-top"><span><i className="driver-dot" aria-hidden="true" />{index === 0 ? 'A' : 'B'} / {driver?.name_acronym ? `${driver.name_acronym} / #${lap.driver_number}` : `#${lap.driver_number}`}</span><span>LAP {lap.lap_number}</span></div>
                    <h3>{getDriverName(lap.driver_number)}</h3>
                    <p className="lap-time">{formatLapTime(lap.lap_time_s)}</p>
                    <p className="lap-meta">{driver?.team_name ? `${driver.team_name} · ` : ''}{lap.lap_time_s.toFixed(3)} s</p>
                  </article>
                )
              })}
            </div>
            <section className="sector-deltas" aria-labelledby="sector-deltas-title">
              <div className="sector-heading"><h3 id="sector-deltas-title">Sector comparison</h3><span>A − B / s</span></div>
              <div className="sector-grid">
                {result.sector_deltas_s.map((delta, index) => {
                  let value = '—'
                  let winner = '—'
                  let description = 'Data unavailable'
                  let outcome = 'neutral'
                  if (delta !== null) {
                    value = `${delta > 0 ? '+' : ''}${delta.toFixed(3)}`
                    if (delta < 0) {
                      outcome = 'a'
                      winner = getDriverCode(result.driver_a.driver_number)
                      description = `Driver A · ${getDriverName(result.driver_a.driver_number)} faster`
                    } else if (delta > 0) {
                      outcome = 'b'
                      winner = getDriverCode(result.driver_b.driver_number)
                      description = `Driver B · ${getDriverName(result.driver_b.driver_number)} faster`
                    } else {
                      winner = '='
                      description = 'Equal sector time'
                    }
                  }
                  const barWidth = delta === null || largestSectorMagnitude === 0 ? 0 : Math.abs(delta) / largestSectorMagnitude * 100
                  return (
                    <div key={index} className={`sector-row sector-row--${outcome}`} title={description}>
                      <span className="sector-label">S{index + 1}</span>
                      <span className="sector-bar" aria-hidden="true"><span style={{ width: `${barWidth}%` }} /></span>
                      <strong>{value}</strong>
                      <span className="sector-winner">{winner}</span>
                      <span className="sr-only">seconds. {description}.</span>
                    </div>
                  )
                })}
              </div>
            </section>
            {largestSector !== null && (
              <section className="sector-insight">
                <h3 className="eyebrow">LARGEST SECTOR DIFFERENCE</h3>
                <strong>Sector {String(largestSector.index + 1).padStart(2, '0')}</strong>
                <p>{largestSector.delta === 0 ? 'All available sector times are equal.' : <>{largestSector.delta < 0 ? getDriverCode(result.driver_a.driver_number) : getDriverCode(result.driver_b.driver_number)} gains <b>{Math.abs(largestSector.delta).toFixed(3)} s</b> in this sector.</>}</p>
              </section>
            )}
          </>
        ) : (
          <div className="summary-empty"><p>Your lap times and sector differences will appear here</p></div>
        )}
      </aside>
    </div>
  )
}

export default SessionComparison
