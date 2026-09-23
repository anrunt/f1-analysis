import { useState } from 'react'
import { z } from 'zod'
import { ApiErrorSchema, ComparisonResultSchema } from './types'
import type { ComparisonResult } from './types'
import SpeedComparisonChart from './components/SpeedComparisonChart'
import './App.css'

function App() {
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCompare() {
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/compare?session_id=9586&driver_a=4&driver_b=81')
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
    <main className="dashboard">
      <header className="site-header">
        <span className="site-mark" aria-hidden="true">◩</span>
        <span>APEX / LAP ANALYSIS</span>
        <span className="site-header-end">OPENF1 DATA</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">MONZA · QUALIFYING · 2024</p>
        <h1 id="page-title">Lap <em>against</em> lap.</h1>
        <p className="intro-description">
          Compare Norris and Piastri’s fastest available laps.
          One click, two lap times, one difference.
        </p>
        <button type="button" onClick={handleCompare} disabled={loading}>
          {loading ? 'Loading…' : 'Compare Norris vs Piastri'}
          <span aria-hidden="true">↗</span>
        </button>
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
              <h3>Norris</h3>
              <p className="lap-meta">Lap {result.driver_a.lap_number}</p>
              <p className="lap-time">{result.driver_a.lap_time_s.toFixed(3)} <span>s</span></p>
            </article>
            <article className="lap-card">
              <div className="lap-card-top"><span>DRIVER B</span><span>#{result.driver_b.driver_number}</span></div>
              <h3>Piastri</h3>
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

      <footer className="site-footer">01 / LAP COMPARISON <span>DATA SOURCE — OPENF1</span></footer>
    </main>
  )
}

export default App
