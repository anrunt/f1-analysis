import { useState } from 'react'
import type { Driver } from '../types'

type Props = {
  drivers: Driver[]
  driversLoading: boolean
  driversError: string | null
  comparing: boolean
  onCompare: (driverA: number, driverB: number) => void
}

function DriverSelector({ drivers, driversLoading, driversError, comparing, onCompare }: Props) {
  const [driverA, setDriverA] = useState<number | null>(null)
  const [driverB, setDriverB] = useState<number | null>(null)

  function handleCompare() {
    if (driverA === null || driverB === null || driverA === driverB || driversLoading || comparing) {
      return
    }

    onCompare(driverA, driverB)
  }

  return (
    <>
      <div className="driver-picker flex flex-col gap-[20px] [&_>_.eyebrow]:mb-[-3px] mobile:grid mobile:grid-cols-2 mobile:gap-[17px_13px] mobile:[&_>_.eyebrow]:[grid-column:1_/_-1]">
        <p className="eyebrow [font:400_9px/1.6_var(--mono)] text-(--muted) tracking-[.08em]">COMPARISON PAIR</p>
        <div className="driver-field min-w-0 flex flex-col gap-[9px] driver-field--a">
          <label htmlFor="driver-a" className="[font:9px_var(--mono)] uppercase text-(--muted) tracking-[.04em] flex items-center gap-[8px]"><span className="driver-dot inline-block w-[6px] h-[6px] bg-(--driver-a) shrink-0" aria-hidden="true" />Driver A</label>
          <select
            id="driver-a"
            value={driverA ?? ''}
            onChange={(event) => setDriverA(event.target.value === '' ? null : Number(event.target.value))}
            disabled={driversLoading || comparing}
            className="w-full min-w-0 min-h-[42px] p-[10px_25px_10px_10px] [border:1px_solid_var(--border)] rounded-[2px] text-(--text) bg-[#141518] text-[12px] cursor-pointer disabled:opacity-[.6] disabled:cursor-not-allowed"
          >
            <option value="">Select driver</option>
            {drivers.map((driver) => (
              <option key={driver.driver_number} value={driver.driver_number}>
                {driver.full_name ?? driver.name_acronym ?? `Driver #${driver.driver_number}`} · #{driver.driver_number}
                {driver.team_name ? ` — ${driver.team_name}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="driver-field min-w-0 flex flex-col gap-[9px] driver-field--b [&_.driver-dot]:bg-(--driver-b)">
          <label htmlFor="driver-b" className="[font:9px_var(--mono)] uppercase text-(--muted) tracking-[.04em] flex items-center gap-[8px]"><span className="driver-dot inline-block w-[6px] h-[6px] bg-(--driver-a) shrink-0" aria-hidden="true" />Driver B</label>
          <select
            id="driver-b"
            value={driverB ?? ''}
            onChange={(event) => setDriverB(event.target.value === '' ? null : Number(event.target.value))}
            disabled={driversLoading || comparing}
            className="w-full min-w-0 min-h-[42px] p-[10px_25px_10px_10px] [border:1px_solid_var(--border)] rounded-[2px] text-(--text) bg-[#141518] text-[12px] cursor-pointer disabled:opacity-[.6] disabled:cursor-not-allowed"
          >
            <option value="">Select driver</option>
            {drivers.map((driver) => (
              <option key={driver.driver_number} value={driver.driver_number}>
                {driver.full_name ?? driver.name_acronym ?? `Driver #${driver.driver_number}`} · #{driver.driver_number}
                {driver.team_name ? ` — ${driver.team_name}` : ''}
              </option>
            ))}
          </select>
        </div>
        <p className="picker-note text-(--muted) [font:10px/1.8_var(--mono)] mobile:[grid-column:1_/_-1] mobile:text-[9px]">Fastest available laps · delta A − B</p>
      </div>
      {driversLoading && <p className="status text-[12px] leading-[1.7] mt-[14px] text-(--muted)" role="status">Loading drivers…</p>}
      {driversError && <p className="error text-[12px] leading-[1.7] mt-[14px] text-[#ff8894] [overflow-wrap:anywhere]" role="alert">{driversError}</p>}
      {!driversLoading && !driversError && drivers.length === 0 && (
        <p className="status text-[12px] leading-[1.7] mt-[14px] text-(--muted)">No drivers available for this session.</p>
      )}
      {driverA !== null && driverA === driverB && (
        <p className="status text-[12px] leading-[1.7] mt-[14px] text-(--muted)">Choose two different drivers.</p>
      )}
      <button
        className="compare-button w-full min-h-[42px] flex justify-between items-center gap-[12px] p-[11px_13px] mt-[20px] [border:1px_solid_var(--accent)] rounded-[2px] text-[#fff] bg-[#bc1d2e] text-[12px] font-medium cursor-pointer [transition:background_.15s,_border-color_.15s] [&:hover:not(:disabled)]:bg-[#df2338] [&:hover:not(:disabled)]:[border-color:#ff3045] disabled:bg-[#221719] disabled:[border-color:#482129] disabled:text-[#ac8b91] disabled:cursor-not-allowed mobile:mt-[15px] motion-reduce:transition-none"
        type="button"
        onClick={handleCompare}
        disabled={driversLoading || comparing || driverA === null || driverB === null || driverA === driverB}
      >
        {comparing ? 'Loading…' : 'Compare laps'}
      </button>
    </>
  )
}

export default DriverSelector
