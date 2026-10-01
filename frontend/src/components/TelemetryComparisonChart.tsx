import Plot from 'react-plotly.js'
import type { Data, Layout, ScatterData } from 'plotly.js'
import type { ComparisonResult } from '../types'

type Props = {
  result: ComparisonResult
}

function TelemetryComparisonChart({ result }: Props) {
  const distancePercent = result.relative_distance.map((distance) => distance * 100)
  const speedTraces: Data[] = []
  const throttleTraces: Data[] = []
  const brakeTraces: Data[] = []
  const speedMessages: string[] = []
  const throttleMessages: string[] = []
  const brakeMessages: string[] = []

  for (const [index, driver] of [result.driver_a, result.driver_b].entries()) {
    const driverLabel = index === 0 ? 'A' : 'B'
    const driverName = `Driver ${driverLabel} · #${driver.driver_number}`
    const color = index === 0 ? '#e9f56b' : '#76c7d0'
    const baseTrace: Partial<ScatterData> = {
      type: 'scatter',
      mode: 'lines',
      name: driverName,
      x: [...distancePercent],
      connectgaps: false,
      showlegend: true,
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
  }

  const baseLayout: Partial<Layout> = {
    autosize: true,
    paper_bgcolor: '#1b211e',
    plot_bgcolor: '#1b211e',
    font: { color: '#abb5a9', family: 'Courier New, monospace', size: 12 },
    margin: { l: 100, r: 26, t: 48, b: 76 },
    xaxis: {
      title: { text: 'Normalized lap distance [%]' },
      range: [0, 100],
      ticksuffix: '%',
      gridcolor: '#343c36',
      zeroline: false,
    },
    showlegend: true,
    legend: { orientation: 'h', x: 0, y: 1.15 },
    hovermode: 'x unified',
  }

  const speedLayout: Partial<Layout> = {
    ...structuredClone(baseLayout),
    yaxis: {
      title: { text: 'Speed [km/h]' },
      gridcolor: '#343c36',
      zeroline: false,
      fixedrange: true,
    },
  }

  const throttleLayout: Partial<Layout> = {
    ...structuredClone(baseLayout),
    yaxis: {
      title: { text: 'Throttle [%]' },
      range: [0, 100],
      ticksuffix: '%',
      gridcolor: '#343c36',
      zeroline: false,
      fixedrange: true,
    },
  }

  const brakeLayout: Partial<Layout> = {
    ...structuredClone(baseLayout),
    yaxis: {
      title: { text: 'Brake' },
      range: [-0.15, 1.15],
      tickmode: 'array',
      tickvals: [0, 1],
      ticktext: ['Released', 'Pressed'],
      gridcolor: '#343c36',
      zeroline: false,
      fixedrange: true,
    },
  }

  const charts = [
    {
      id: 'speed',
      title: 'Speed comparison',
      eyebrow: 'TELEMETRY / SPEED',
      traces: speedTraces,
      layout: speedLayout,
      messages: speedMessages,
      emptyMessage: 'No speed telemetry is available for either driver.',
    },
    {
      id: 'throttle',
      title: 'Throttle comparison',
      eyebrow: 'TELEMETRY / THROTTLE',
      traces: throttleTraces,
      layout: throttleLayout,
      messages: throttleMessages,
      emptyMessage: 'No throttle telemetry is available for either driver.',
    },
    {
      id: 'brake',
      title: 'Brake comparison',
      eyebrow: 'TELEMETRY / BRAKE',
      traces: brakeTraces,
      layout: brakeLayout,
      messages: brakeMessages,
      emptyMessage: 'No brake telemetry is available for either driver.',
    },
  ]

  return (
    <div className="telemetry-charts">
      {charts.map((chart) => (
        <section
          key={chart.id}
          className="telemetry-chart"
          aria-labelledby={`telemetry-${chart.id}-title`}
        >
          <div className="results-heading">
            <p className="eyebrow">{chart.eyebrow}</p>
            <h2 id={`telemetry-${chart.id}-title`}>{chart.title}</h2>
          </div>

          {chart.traces.length > 0 ? (
            <>
              <Plot
                data={chart.traces}
                layout={chart.layout}
                config={{ displaylogo: false, responsive: true }}
                useResizeHandler
                className={`telemetry-chart-plot telemetry-chart-plot--${chart.id}`}
              />
              {chart.messages.length > 0 && (
                <ul className="telemetry-chart-messages">
                  {chart.messages.map((message) => <li key={message}>{message}</li>)}
                </ul>
              )}
            </>
          ) : (
            <p className="telemetry-chart-message">{chart.emptyMessage}</p>
          )}
        </section>
      ))}

      <p className="telemetry-chart-note">
        Distance is normalized separately for each lap. Telemetry alignment is approximate.
        Gaps indicate unknown measurements; brake steps hold the last sampled state.
      </p>
    </div>
  )
}

export default TelemetryComparisonChart
