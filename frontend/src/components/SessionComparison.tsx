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
    <div className="workspace grid grid-cols-[242px_minmax(0,_1fr)_272px] flex-1 wide:grid-cols-[270px_minmax(0,_1fr)_310px] compact:grid-cols-[209px_minmax(0,_1fr)_236px] stacked:grid-cols-[215px_minmax(0,_1fr)] mobile:flex mobile:flex-col">
      <aside className="workspace-sidebar min-w-0 bg-[#0b0c0e] [border-right:1px_solid_var(--border)] flex flex-col mobile:[border-right:0] mobile:[border-bottom:1px_solid_var(--border)]">
        {sessionControl}
        <section className="session-controls p-[22px_19px] mobile:p-[20px_16px]" aria-label="Driver comparison setup">
          <DriverSelector
            drivers={drivers}
            driversLoading={driversLoading}
            driversError={driversError}
            comparing={loading}
            onCompare={handleCompare}
          />
        </section>
        <section className="session-context p-[22px_19px] [border-top:1px_solid_var(--border)] mt-[0] stacked:mt-[25px] mobile:mt-[0] mobile:p-[17px_16px]" aria-labelledby="session-context-title">
          <h2 id="session-context-title" className="eyebrow [font:400_9px/1.6_var(--mono)] text-(--muted) tracking-[.08em]">SESSION CONTEXT</h2>
          <dl className="m-[18px_0] mobile:grid mobile:grid-cols-2 mobile:gap-[10px_20px] mobile:m-[14px_0]">
            <div className="flex justify-between gap-[12px] mb-[13px] [font:9px/1.5_var(--mono)] mobile:m-[0] mobile:flex-col mobile:gap-[4px]"><dt className="text-(--muted) shrink-0">Circuit</dt><dd className="m-[0] text-right [overflow-wrap:anywhere] mobile:text-left">{session.circuit_short_name}</dd></div>
            <div className="flex justify-between gap-[12px] mb-[13px] [font:9px/1.5_var(--mono)] mobile:m-[0] mobile:flex-col mobile:gap-[4px]"><dt className="text-(--muted) shrink-0">Session</dt><dd className="m-[0] text-right [overflow-wrap:anywhere] mobile:text-left">{session.session_name}</dd></div>
            <div className="flex justify-between gap-[12px] mb-[13px] [font:9px/1.5_var(--mono)] mobile:m-[0] mobile:flex-col mobile:gap-[4px]"><dt className="text-(--muted) shrink-0">Date</dt><dd className="m-[0] text-right [overflow-wrap:anywhere] mobile:text-left">{new Date(session.date_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</dd></div>
            <div className="flex justify-between gap-[12px] mb-[13px] [font:9px/1.5_var(--mono)] mobile:m-[0] mobile:flex-col mobile:gap-[4px]"><dt className="text-(--muted) shrink-0">Session key</dt><dd className="m-[0] text-right [overflow-wrap:anywhere] mobile:text-left">{session.session_key}</dd></div>
            <div className="flex justify-between gap-[12px] mb-[13px] [font:9px/1.5_var(--mono)] mobile:m-[0] mobile:flex-col mobile:gap-[4px]"><dt className="text-(--muted) shrink-0">Data source</dt><dd className="m-[0] text-right [overflow-wrap:anywhere] mobile:text-left">OpenF1</dd></div>
          </dl>
        </section>
      </aside>

      <section className="telemetry-workspace min-w-0 p-[25px_22px_17px] flex flex-col wide:p-[28px] compact:p-[22px_15px_15px] mobile:p-[22px_16px]" aria-labelledby="page-title" aria-busy={loading}>
        <div className="workspace-heading flex items-center justify-between gap-[15px] mb-[23px] mobile:mb-[18px]">
          <div>
            <p className="eyebrow [font:400_9px/1.6_var(--mono)] text-(--muted) tracking-[.08em]">TELEMETRY WORKSPACE</p>
            <h1 id="page-title" className="text-[23px] font-medium tracking-[-.6px] mt-[8px] leading-[1.5] compact:text-[19px] stacked:text-[18px] mobile:text-[22px] tiny:text-[19px]">Lap comparison{result && <span className="comparison-codes [font:12px_var(--mono)] text-(--accent) tracking-[-.4px] whitespace-nowrap compact:text-[11px] stacked:block stacked:mt-[7px] mobile:inline mobile:text-[11px]"> / {getDriverCode(result.driver_a.driver_number)} × {getDriverCode(result.driver_b.driver_number)}</span>}</h1>
          </div>
        </div>
        {result ? (
          <TelemetryComparisonChart
            result={result}
            driverALabel={getDriverCode(result.driver_a.driver_number)}
            driverBLabel={getDriverCode(result.driver_b.driver_number)}
          />
        ) : (
          <div className="workspace-empty flex-1 min-h-[440px] flex flex-col justify-center items-center text-center p-[35px_20px] [border:1px_solid_var(--border)] bg-(--panel) rounded-[3px] [&_>_p:not(.eyebrow)]:max-w-[360px] [&_>_p:not(.eyebrow)]:text-[13px] [&_>_p:not(.eyebrow)]:leading-[1.8] [&_>_p:not(.eyebrow):not(.error)]:text-(--muted) [&_>_p:not(.eyebrow)]:mt-[14px] [&_>_p.error]:text-[#ff8894] mobile:min-h-[330px] mobile:p-[28px_16px]">
            <span className={`empty-symbol text-[74px] leading-none text-(--accent) mb-[27px] ${loading ? 'empty-symbol--loading animate-telemetry-pulse motion-reduce:animate-none' : ''}`} aria-hidden="true">⌁</span>
            <p className="eyebrow [font:400_9px/1.6_var(--mono)] text-(--muted) tracking-[.08em]">{loading ? 'LOADING TELEMETRY' : error ? 'COMPARISON UNAVAILABLE' : 'READY TO COMPARE'}</p>
            <h2 className="text-[clamp(22px,_2.2vw,_32px)] font-medium tracking-[-.6px] mt-[13px] mobile:text-[24px]">{loading ? 'Retrieving lap data.' : error ? 'Unable to load this comparison.' : 'Choose your comparison pair.'}</h2>
            {loading ? <p role="status">Fetching lap times, sector differences and telemetry…</p> : error ? <p className="error text-[12px] leading-[1.7] mt-[14px] text-[#ff8894] [overflow-wrap:anywhere]" role="alert">{error}</p> : <p>Select two different drivers and run a lap comparison.</p>}
          </div>
        )}
      </section>

      <aside className="comparison-summary min-w-0 bg-[#0d0e10] [border-left:1px_solid_var(--border)] stacked:[grid-column:1_/_-1] stacked:[border-left:0] stacked:[border-top:1px_solid_var(--border)] stacked:grid stacked:grid-cols-2 tablet:gap-[14px] tablet:p-[22px_20px] tablet:content-start mobile:gap-[12px] mobile:p-[20px_16px] mobile:content-start" aria-labelledby="results-title">
        <div className="summary-heading flex items-center justify-between gap-[8px] p-[24px_20px] [border-bottom:1px_solid_var(--border)] compact:pl-[17px] compact:pr-[17px] stacked:[grid-column:1_/_-1] tablet:p-[0_0_4px] tablet:[border-bottom:0] mobile:p-[0_0_4px] mobile:[border-bottom:0]"><h2 id="results-title" className="[font:9px/1.6_var(--mono)] text-(--muted) tracking-[.08em] flex items-center min-h-[20px]">COMPARISON SUMMARY</h2></div>
        {result ? (
          <>
            <section className={`delta-block p-[24px_20px] [border-bottom:1px_solid_var(--border)] bg-[#151517] compact:pl-[17px] compact:pr-[17px] tablet:min-w-0 tablet:min-h-[192px] tablet:p-[16px_18px] tablet:[border:1px_solid_var(--border)] tablet:rounded-[4px] tablet:bg-(--panel) tablet:[grid-column:1] tablet:[grid-row:3] tablet:flex tablet:flex-col mobile:min-w-0 mobile:min-h-[192px] mobile:p-[16px_12px] mobile:[border:1px_solid_var(--border)] mobile:rounded-[4px] mobile:bg-(--panel) mobile:[grid-column:1] mobile:[grid-row:3] mobile:flex mobile:flex-col mobile:[&_>_p_.driver-dot]:mt-[5px] ${result.lap_delta_s < 0 ? 'delta-block--a' : result.lap_delta_s > 0 ? 'delta-block--b [&_.driver-dot]:bg-(--driver-b) [&_>_strong]:text-(--driver-b)' : 'delta-block--equal [&_>_strong]:text-(--driver-b)'}`} aria-labelledby="lap-delta-title">
              <h3 id="lap-delta-title" className="eyebrow [font:400_9px/1.6_var(--mono)] text-(--muted) tracking-[.08em] flex items-center min-h-[20px] justify-between gap-[12px] mobile:gap-[6px] mobile:flex-wrap">LAP DELTA <span className="tracking-normal text-[12px] font-medium mobile:text-[11px]">A − B</span></h3>
              <strong className="[font:500_44px_var(--mono)] text-(--driver-a) tracking-[-2px] block m-[17px_0_14px] whitespace-nowrap wide:text-[51px] compact:text-[38px] mobile:text-[clamp(23px,_7vw,_34px)] mobile:tracking-[-1.5px]">{result.lap_delta_s > 0 ? '+' : ''}{result.lap_delta_s.toFixed(3)}<small className="text-[17px] tracking-normal mobile:text-[14px]"> s</small></strong>
              <p className="flex gap-[7px] items-center [font:9px/1.6_var(--mono)] text-(--muted) compact:text-[8px] tablet:mt-auto mobile:text-[9px] mobile:mt-auto mobile:items-start">{result.lap_delta_s === 0 ? 'Equal lap times' : <><span className="driver-dot inline-block w-[6px] h-[6px] bg-(--driver-a) shrink-0" aria-hidden="true" />{result.lap_delta_s < 0 ? getDriverCode(result.driver_a.driver_number) : getDriverCode(result.driver_b.driver_number)} faster by {Math.abs(result.lap_delta_s).toFixed(3)} s</>}</p>
            </section>
            <div className="lap-grid stacked:[grid-column:2] stacked:[grid-row:2_/_4] stacked:[border-left:1px_solid_var(--border)] tablet:contents mobile:contents">
              {[result.driver_a, result.driver_b].map((lap, index) => {
                const driver = drivers.find((entry) => entry.driver_number === lap.driver_number)
                return (
                  <article key={lap.driver_number} className={`lap-card p-[18px_20px] [border-bottom:1px_solid_var(--border)] compact:pl-[17px] compact:pr-[17px] tablet:min-w-0 tablet:min-h-[192px] tablet:p-[16px_18px] tablet:[border:1px_solid_var(--border)] tablet:rounded-[4px] tablet:bg-(--panel) tablet:flex tablet:flex-col mobile:min-w-0 mobile:min-h-[192px] mobile:p-[16px_12px] mobile:[border:1px_solid_var(--border)] mobile:rounded-[4px] mobile:bg-(--panel) mobile:flex mobile:flex-col ${index === 0 ? 'lap-card--a tablet:[grid-column:1] tablet:[grid-row:2] mobile:[grid-column:1] mobile:[grid-row:2]' : 'lap-card--b [&_.driver-dot]:bg-(--driver-b) [&_.lap-card-top]:text-(--driver-b) tablet:[grid-column:2] tablet:[grid-row:2] mobile:[grid-column:2] mobile:[grid-row:2]'}`}>
                    <div className="lap-card-top flex justify-between gap-[8px] [font:9px_var(--mono)] text-(--driver-a) [&_>_span:first-child]:flex [&_>_span:first-child]:items-center [&_>_span:first-child]:gap-[7px] [&_>_span:last-child]:text-[12px] [&_>_span:last-child]:font-medium [&_>_span:last-child]:text-(--muted) tablet:min-h-[20px] tablet:items-center mobile:text-[8px] mobile:flex-wrap mobile:gap-[6px] mobile:min-h-[28px] mobile:items-center mobile:[&_>_span:last-child]:text-[11px]"><span><i className="driver-dot inline-block w-[6px] h-[6px] bg-(--driver-a) shrink-0" aria-hidden="true" />{index === 0 ? 'A' : 'B'} / {driver?.name_acronym ? `${driver.name_acronym} / #${lap.driver_number}` : `#${lap.driver_number}`}</span><span>LAP {lap.lap_number}</span></div>
                    <h3 className="flex justify-between gap-[10px] text-[13px] font-medium m-[11px_0_13px] compact:text-[12px] tablet:min-h-[36px] tablet:leading-[1.5] mobile:min-h-[36px] mobile:leading-[1.5] mobile:[overflow-wrap:anywhere] mobile:m-[12px_0]">{getDriverName(lap.driver_number)}</h3>
                    <p className="lap-time [font:500_29px_var(--mono)] tracking-[-1.5px] compact:text-[26px] tablet:mt-auto mobile:mt-auto mobile:text-[clamp(20px,_5.5vw,_26px)] mobile:tracking-[-1px]">{formatLapTime(lap.lap_time_s)}</p>
                    <p className="lap-meta [font:10px/1.6_var(--mono)] text-(--muted) mt-[7px] tablet:min-h-[32px] mobile:text-[9px] mobile:min-h-[29px]">{driver?.team_name ? `${driver.team_name} · ` : ''}{lap.lap_time_s.toFixed(3)} s</p>
                  </article>
                )
              })}
            </div>
            <section className="sector-deltas p-[21px_20px] [border-bottom:1px_solid_var(--border)] compact:pl-[17px] compact:pr-[17px] tablet:min-w-0 tablet:min-h-[192px] tablet:p-[16px_18px] tablet:[border:1px_solid_var(--border)] tablet:rounded-[4px] tablet:bg-(--panel) tablet:[grid-column:2] tablet:[grid-row:3] mobile:min-w-0 mobile:min-h-[192px] mobile:p-[16px_12px] mobile:[border:1px_solid_var(--border)] mobile:rounded-[4px] mobile:bg-(--panel) mobile:[grid-column:2] mobile:[grid-row:3]" aria-labelledby="sector-deltas-title">
              <div className="sector-heading flex justify-between gap-[8px] items-center mobile:flex-col mobile:items-start"><h3 id="sector-deltas-title" className="text-[12px] font-medium">Sector comparison</h3><span className="[font:12px_var(--mono)] text-(--muted)">A − B / s</span></div>
              <div className="sector-grid mt-[14px]">
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
                    <div key={index} className={`sector-row flex items-center gap-[9px] [border-bottom:1px_solid_var(--border)] p-[13px_0] tablet:last:[border-bottom:0] tablet:last:pb-[0] mobile:gap-[5px] mobile:last:[border-bottom:0] mobile:last:pb-[0] ${outcome === 'a' ? 'sector-row--a [&_strong]:text-(--driver-a) [&_.sector-bar_>_span]:bg-(--driver-a)' : outcome === 'b' ? 'sector-row--b [&_strong]:text-(--driver-b) [&_.sector-bar_>_span]:bg-(--driver-b)' : ''}`} title={description}>
                      <span className="sector-label text-(--muted) [font:10px_var(--mono)]">S{index + 1}</span>
                      <span className="sector-bar flex-1 min-w-0 h-[4px] bg-[#202226]" aria-hidden="true"><span style={{ width: `${barWidth}%` }} className="block h-[4px] bg-(--muted)" /></span>
                      <strong className="min-w-[53px] text-right [font:11px_var(--mono)] text-(--muted) mobile:text-[10px] mobile:min-w-[48px]">{value}</strong>
                      <span className="sector-winner [font:11px_var(--mono)] text-(--muted) min-w-[22px] text-right mobile:text-[10px]">{winner}</span>
                      <span className="sr-only">seconds. {description}.</span>
                    </div>
                  )
                })}
              </div>
            </section>
            {largestSector !== null && (
              <section className="sector-insight p-[21px_20px] compact:pl-[17px] compact:pr-[17px] stacked:[grid-column:1_/_-1] tablet:p-[18px_0_0] tablet:[border-top:1px_solid_var(--border)] mobile:p-[16px_0_0] mobile:[border-top:1px_solid_var(--border)]">
                <h3 className="eyebrow [font:400_9px/1.6_var(--mono)] text-(--muted) tracking-[.08em]">LARGEST SECTOR DIFFERENCE</h3>
                <strong className="block text-[20px] font-medium m-[12px_0_9px]">Sector {String(largestSector.index + 1).padStart(2, '0')}</strong>
                <p className="text-[12px] text-(--muted) leading-[1.8]">{largestSector.delta === 0 ? 'All available sector times are equal.' : <>{largestSector.delta < 0 ? getDriverCode(result.driver_a.driver_number) : getDriverCode(result.driver_b.driver_number)} gains <b className="text-(--text) font-medium">{Math.abs(largestSector.delta).toFixed(3)} s</b> in this sector.</>}</p>
              </section>
            )}
          </>
        ) : (
          <div className="summary-empty p-[28px_20px] stacked:[grid-column:1_/_-1] tablet:p-[16px_18px] tablet:[border:1px_solid_var(--border)] tablet:rounded-[4px] tablet:bg-(--panel) mobile:p-[16px_12px] mobile:[border:1px_solid_var(--border)] mobile:rounded-[4px] mobile:bg-(--panel)"><p className="text-[12px] leading-[1.8] text-(--muted)">Your lap times and sector differences will appear here</p></div>
        )}
      </aside>
    </div>
  )
}

export default SessionComparison
