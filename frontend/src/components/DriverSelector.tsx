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
      <div className="driver-picker">
        <div className="driver-field">
          <label htmlFor="driver-a">Driver A</label>
          <select
            id="driver-a"
            value={driverA ?? ''}
            onChange={(event) => setDriverA(event.target.value === '' ? null : Number(event.target.value))}
            disabled={driversLoading || comparing}
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
        <div className="driver-field">
          <label htmlFor="driver-b">Driver B</label>
          <select
            id="driver-b"
            value={driverB ?? ''}
            onChange={(event) => setDriverB(event.target.value === '' ? null : Number(event.target.value))}
            disabled={driversLoading || comparing}
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
      </div>
      {driversLoading && <p className="status" role="status">Loading drivers…</p>}
      {driversError && <p className="error" role="alert">{driversError}</p>}
      {!driversLoading && !driversError && drivers.length === 0 && (
        <p className="status">No drivers available for this session.</p>
      )}
      {driverA !== null && driverA === driverB && (
        <p className="status">Choose two different drivers.</p>
      )}
      <button
        type="button"
        onClick={handleCompare}
        disabled={driversLoading || comparing || driverA === null || driverB === null || driverA === driverB}
      >
        {comparing ? 'Loading…' : 'Compare laps'}
        <span aria-hidden="true">↗</span>
      </button>
    </>
  )
}

export default DriverSelector
