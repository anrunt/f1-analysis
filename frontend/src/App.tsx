import { useState } from 'react'
import { z } from 'zod'
import { ApiErrorSchema, ComparisonResultSchema } from './types'
import type { ComparisonResult } from './types'
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
        <h1 id="page-title">Okrążenie <em>kontra</em> okrążenie.</h1>
        <p className="intro-description">
          Zestawienie najszybszych dostępnych okrążeń Norrisa i Piastriego.
          Jedno kliknięcie, dwa czasy, jedna różnica.
        </p>
        <button type="button" onClick={handleCompare} disabled={loading}>
          {loading ? 'Ładowanie…' : 'Porównaj Norris vs Piastri'}
          <span aria-hidden="true">↗</span>
        </button>
        {loading && <p className="status" role="status">Pobieranie danych okrążeń…</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {result && (
        <section className="results" aria-labelledby="results-title">
          <div className="results-heading">
            <p className="eyebrow">SESSION {result.session_key} / RESULTS</p>
            <h2 id="results-title">Porównanie czasów</h2>
          </div>

          <div className="lap-grid">
            <article className="lap-card">
              <div className="lap-card-top"><span>KIEROWCA A</span><span>#{result.driver_a.driver_number}</span></div>
              <h3>Norris</h3>
              <p className="lap-meta">Okrążenie {result.driver_a.lap_number}</p>
              <p className="lap-time">{result.driver_a.lap_time_s.toFixed(3)} <span>s</span></p>
            </article>
            <article className="lap-card">
              <div className="lap-card-top"><span>KIEROWCA B</span><span>#{result.driver_b.driver_number}</span></div>
              <h3>Piastri</h3>
              <p className="lap-meta">Okrążenie {result.driver_b.lap_number}</p>
              <p className="lap-time">{result.driver_b.lap_time_s.toFixed(3)} <span>s</span></p>
            </article>
          </div>

          <div className="delta-row">
            <div>
              <span className="delta-label">DELTA / A − B</span>
              <p>Wartość ujemna oznacza szybsze okrążenie kierowcy A.</p>
            </div>
            <strong>{result.lap_delta_s > 0 ? '+' : ''}{result.lap_delta_s.toFixed(3)} <span>s</span></strong>
          </div>
        </section>
      )}

      <footer className="site-footer">01 / LAP COMPARISON <span>DATA SOURCE — OPENF1</span></footer>
    </main>
  )
}

export default App
