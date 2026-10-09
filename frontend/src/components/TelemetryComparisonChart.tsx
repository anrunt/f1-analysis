import Plot from 'react-plotly.js'
import type { Data, Layout, ScatterData } from 'plotly.js'
import type { ComparisonResult } from '../types'

type Props = {
  result: ComparisonResult
  driverALabel: string
  driverBLabel: string
}

function TelemetryComparisonChart({ result, driverALabel, driverBLabel }: Props) {
  const distancePercent = result.relative_distance.map((distance) => distance * 100)
  const speedTraces: Data[] = []
  const throttleTraces: Data[] = []
  const brakeTraces: Data[] = []
  const gearTraces: Data[] = []
  const speedMessages: string[] = []
  const throttleMessages: string[] = []
  const brakeMessages: string[] = []
  const gearMessages: string[] = []

  for (const [index, driver] of [result.driver_a, result.driver_b].entries()) {
    const driverLabel = index === 0 ? 'A' : 'B'
    const driverCode = index === 0 ? driverALabel : driverBLabel
    const driverName = `Driver ${driverLabel} · ${driverCode} · #${driver.driver_number}`
    const color = index === 0 ? '#ff3045' : '#dedee3'
    const baseTrace: Partial<ScatterData> = {
      type: 'scatter',
      mode: 'lines',
      name: driverName,
      x: [...distancePercent],
      connectgaps: false,
      showlegend: false,
    }

    if (driver.speed_kmh !== null) {
      speedTraces.push({
        ...baseTrace,
        y: [...driver.speed_kmh],
        line: { color, dash: 'solid', width: 2, shape: 'linear' },
        hovertemplate: '%{y:.1f} km/h<extra>%{fullData.name}</extra>',
      })
    } else {
      speedMessages.push(`Speed telemetry is unavailable for driver ${driverLabel} (#${driver.driver_number}).`)
    }

    if (driver.throttle_percent !== null) {
      throttleTraces.push({
        ...baseTrace,
        y: [...driver.throttle_percent],
        line: { color, dash: 'solid', width: 2, shape: 'linear' },
        hovertemplate: '%{y:.1f}%<extra>%{fullData.name}</extra>',
      })
    } else {
      throttleMessages.push(`Throttle telemetry is unavailable for driver ${driverLabel} (#${driver.driver_number}).`)
    }

    if (driver.brake_on !== null) {
      const brakeLevels = driver.brake_on.map((value) => value === null ? null : value ? 1 : 0)
      const brakeLabels = driver.brake_on.map((value) => value === null ? null : value ? 'Pressed' : 'Released')

      brakeTraces.push({
        ...baseTrace,
        y: brakeLevels,
        customdata: brakeLabels,
        line: { color, dash: 'solid', width: 2, shape: 'hv' },
        hovertemplate: '%{customdata}<extra>%{fullData.name}</extra>',
      })
    } else {
      brakeMessages.push(`Brake telemetry is unavailable for driver ${driverLabel} (#${driver.driver_number}).`)
    }

    if (driver.n_gear !== null) {
      const gearLabels = driver.n_gear.map((value) => value === null ? null : value === 0 ? 'N' : String(value))

      gearTraces.push({
        ...baseTrace,
        y: [...driver.n_gear],
        customdata: gearLabels,
        line: { color, dash: 'solid', width: 2, shape: 'hv' },
        hovertemplate: 'Gear %{customdata}<extra>%{fullData.name}</extra>',
      })
    } else {
      gearMessages.push(`Gear telemetry is unavailable for driver ${driverLabel} (#${driver.driver_number}).`)
    }
  }

  const baseLayout: Partial<Layout> = {
    autosize: true,
    paper_bgcolor: '#111214',
    plot_bgcolor: '#111214',
    font: { color: '#a2a3aa', family: 'IBM Plex Mono, monospace', size: 10 },
    margin: { l: 48, r: 18, t: 12, b: 32 },
    xaxis: {
      range: [0, 100],
      dtick: 20,
      ticksuffix: '%',
      gridcolor: '#25272c',
      zeroline: false,
      showspikes: true,
      spikemode: 'across',
      spikesnap: 'cursor',
      spikecolor: '#777982',
      spikethickness: 1,
    },
    showlegend: false,
    hovermode: 'x unified',
    hoverlabel: { bgcolor: '#1d1e22', bordercolor: '#3b3d44', font: { family: 'IBM Plex Mono, monospace', size: 11, color: '#f3f3f5' } },
  }

  const speedLayout: Partial<Layout> = {
    ...structuredClone(baseLayout),
    yaxis: {
      gridcolor: '#25272c',
      zeroline: false,
      fixedrange: true,
    },
  }

  const throttleLayout: Partial<Layout> = {
    ...structuredClone(baseLayout),
    yaxis: {
      range: [-5, 105],
      tickvals: [0, 50, 100],
      ticksuffix: '%',
      gridcolor: '#25272c',
      zeroline: false,
      fixedrange: true,
    },
  }

  const brakeLayout: Partial<Layout> = {
    ...structuredClone(baseLayout),
    yaxis: {
      range: [-0.15, 1.15],
      tickmode: 'array',
      tickvals: [0, 1],
      ticktext: ['OFF', 'ON'],
      gridcolor: '#25272c',
      zeroline: false,
      fixedrange: true,
    },
  }

  const gearLayout: Partial<Layout> = {
    ...structuredClone(baseLayout),
    yaxis: {
      range: [-0.5, 8.5],
      tickmode: 'array',
      tickvals: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      ticktext: ['N', '1', '2', '3', '4', '5', '6', '7', '8'],
      gridcolor: '#25272c',
      zeroline: false,
      fixedrange: true,
    },
  }

  const charts = [
    {
      id: 'speed',
      title: 'Speed',
      unit: 'km/h',
      traces: speedTraces,
      layout: speedLayout,
      messages: speedMessages,
      emptyMessage: 'No speed telemetry is available for either driver.',
    },
    {
      id: 'throttle',
      title: 'Throttle',
      unit: '%',
      traces: throttleTraces,
      layout: throttleLayout,
      messages: throttleMessages,
      emptyMessage: 'No throttle telemetry is available for either driver.',
    },
    {
      id: 'brake',
      title: 'Brake',
      unit: 'ON / OFF',
      traces: brakeTraces,
      layout: brakeLayout,
      messages: brakeMessages,
      emptyMessage: 'No brake telemetry is available for either driver.',
    },
    {
      id: 'gear',
      title: 'Gear',
      unit: 'N / 1–8',
      traces: gearTraces,
      layout: gearLayout,
      messages: gearMessages,
      emptyMessage: 'No gear telemetry is available for either driver.',
    },
  ]

  return (
    <div className="telemetry-charts flex flex-col gap-[13px] min-w-0">
      {charts.map((chart, index) => (
        <section
          key={chart.id}
          className="telemetry-chart min-w-0 [border:1px_solid_var(--border)] bg-(--panel) rounded-[3px] overflow-hidden"
          aria-labelledby={`telemetry-${chart.id}-title`}
        >
          <div className="chart-heading p-[13px_15px_3px] flex justify-between items-center gap-[12px] mobile:p-[13px_11px_3px]">
            <h2 id={`telemetry-${chart.id}-title`} className="flex items-center gap-[10px] text-[12px] font-medium mobile:gap-[7px]"><span className="channel-index [font:9px_var(--mono)] text-(--muted)">0{index + 1}</span>{chart.title}<small className="[font:9px_var(--mono)] text-(--muted) mobile:text-[8px]">{chart.unit}</small></h2>
            <div className="chart-legend flex gap-[16px] [font:9px_var(--mono)] compact:gap-[10px] mobile:text-[8px] mobile:gap-[10px]" aria-label="Driver colors">
              <span className="legend-driver-a flex items-center gap-[6px]"><i aria-hidden="true" className="inline-block w-[15px] h-[2px] bg-(--driver-a) mobile:w-[11px]" />{driverALabel}<small className="text-(--muted) [font:inherit]">#{result.driver_a.driver_number}</small></span>
              <span className="legend-driver-b flex items-center gap-[6px]"><i aria-hidden="true" className="inline-block w-[15px] h-[2px] bg-(--driver-b) mobile:w-[11px]" />{driverBLabel}<small className="text-(--muted) [font:inherit]">#{result.driver_b.driver_number}</small></span>
            </div>
          </div>

          {chart.traces.length > 0 ? (
            <>
              <Plot
                data={chart.traces}
                layout={chart.layout}
                config={{ displaylogo: false, responsive: true, displayModeBar: 'hover' }}
                useResizeHandler
                className="telemetry-chart-plot block w-full h-[190px] wide:h-[220px] stacked:h-[185px] mobile:h-[200px]"
              />
              {chart.messages.length > 0 && (
                <ul className="telemetry-chart-messages m-[15px] text-(--muted) text-[12px] leading-[1.7] pl-[15px]">
                  {chart.messages.map((message) => <li key={message}>{message}</li>)}
                </ul>
              )}
            </>
          ) : (
            <p className="telemetry-chart-message m-[15px] text-(--muted) text-[12px] leading-[1.7] min-h-[155px] flex items-center justify-center text-center">{chart.emptyMessage}</p>
          )}
        </section>
      ))}

      <p className="telemetry-chart-note [font:12px/1.7_var(--mono)] text-(--muted) p-[0_2px]">
        Normalized lap distance [%] · Distance is normalized separately for each lap. Telemetry alignment is approximate.
        Gaps indicate unknown measurements; brake and gear steps hold the last sampled state.
      </p>
    </div>
  )
}

export default TelemetryComparisonChart
