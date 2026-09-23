import { useState } from 'react'
import { z } from 'zod'
import { ApiErrorSchema, ComparisonResultSchema } from '../types'
import type { ComparisonResult, Session } from '../types'
import { useDrivers } from '../hooks/useDrivers'
import DriverSelector from './DriverSelector'
import SpeedComparisonChart from './SpeedComparisonChart'

type Props = {
  session: Session
}

function SessionComparison({ session }: Props) {
  const { drivers, driversLoading, driversError } = useDrivers(session.session_key)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function getDriverName(number: number) {
    const driver = drivers.find((entry) => entry.driver_number === number)
    return driver?.full_name ?? driver?.name_acronym ?? `Driver #${number}`
  }

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
    <>
      <section className="session-controls" aria-label="Lap comparison">
        <p className="eyebrow">{session.circuit_short_name} · {session.session_name} · {session.year}</p>
        <DriverSelector
          drivers={drivers}
          driversLoading={driversLoading}
          driversError={driversError}
          comparing={loading}
          onCompare={handleCompare}
        />
        {loading && <p className="status" role="status">Fetching lap data…</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {result && (
        <section className="results" aria-labelledby="results-title">
          <div className="results-heading">
            <p className="eyebrow">SESSION {result.session_key} / RESULTS</p>
            <h2 id="results-title">Lap times</h2>
          </div>

          <div className="lap-grid">
            <article className="lap-card">
              <div className="lap-card-top"><span>DRIVER A</span><span>#{result.driver_a.driver_number}</span></div>
              <h3>{getDriverName(result.driver_a.driver_number)}</h3>
              <p className="lap-meta">Lap {result.driver_a.lap_number}</p>
              <p className="lap-time">{result.driver_a.lap_time_s.toFixed(3)} <span>s</span></p>
            </article>
            <article className="lap-card">
              <div className="lap-card-top"><span>DRIVER B</span><span>#{result.driver_b.driver_number}</span></div>
              <h3>{getDriverName(result.driver_b.driver_number)}</h3>
              <p className="lap-meta">Lap {result.driver_b.lap_number}</p>
              <p className="lap-time">{result.driver_b.lap_time_s.toFixed(3)} <span>s</span></p>
            </article>
          </div>

          <div className="delta-row">
            <div>
              <span className="delta-label">DELTA / A − B</span>
              <p>A negative value means driver A set the faster lap.</p>
            </div>
            <strong>{result.lap_delta_s > 0 ? '+' : ''}{result.lap_delta_s.toFixed(3)} <span>s</span></strong>
          </div>

          <SpeedComparisonChart result={result} />
        </section>
      )}
    </>
  )
}

export default SessionComparison
