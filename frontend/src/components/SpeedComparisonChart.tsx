import Plot from 'react-plotly.js'
import type { Data, Layout } from 'plotly.js'
import type { ComparisonResult } from '../types'

type Props = {
  result: ComparisonResult
}

function SpeedComparisonChart({ result }: Props) {
  const distancePercent = result.relative_distance.map((distance) => distance * 100)
  const traces: Data[] = []

  if (result.driver_a.speed_kmh !== null) {
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: `Driver A · #${result.driver_a.driver_number}`,
      x: [...distancePercent],
      y: [...result.driver_a.speed_kmh],
      line: { color: '#e9f56b', width: 2 },
      hovertemplate: '%{y:.1f} km/h<extra>%{fullData.name}</extra>',
    })
  }

  if (result.driver_b.speed_kmh !== null) {
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: `Driver B · #${result.driver_b.driver_number}`,
      x: [...distancePercent],
      y: [...result.driver_b.speed_kmh],
      line: { color: '#76c7d0', width: 2 },
      hovertemplate: '%{y:.1f} km/h<extra>%{fullData.name}</extra>',
    })
  }

  const layout: Partial<Layout> = {
    autosize: true,
    paper_bgcolor: '#1b211e',
    plot_bgcolor: '#1b211e',
    font: { color: '#abb5a9', family: 'Courier New, monospace', size: 12 },
    margin: { l: 76, r: 26, t: 36, b: 84 },
    xaxis: {
      title: { text: 'Normalized available telemetry distance [%]' },
      range: [0, 100],
      ticksuffix: '%',
      gridcolor: '#343c36',
      zeroline: false,
    },
    yaxis: {
      title: { text: 'Speed [km/h]' },
      gridcolor: '#343c36',
      zeroline: false,
    },
    showlegend: true,
    legend: { orientation: 'h', x: 0, y: 1.12 },
    hovermode: 'x unified',
  }

  return (
    <section className="speed-chart" aria-labelledby="speed-chart-title">
      <div className="results-heading">
        <p className="eyebrow">TELEMETRY / SPEED</p>
        <h2 id="speed-chart-title">Speed comparison</h2>
      </div>

      {traces.length > 0 ? (
        <Plot
          data={traces}
          layout={layout}
          config={{ displaylogo: false, responsive: true }}
          useResizeHandler
          className="speed-chart-plot"
        />
      ) : (
        <p className="speed-chart-message">No speed telemetry is available for either driver.</p>
      )}

      {result.driver_a.speed_kmh === null && traces.length > 0 && (
        <p className="speed-chart-message">Speed telemetry is unavailable for driver A (#{result.driver_a.driver_number}).</p>
      )}
      {result.driver_b.speed_kmh === null && traces.length > 0 && (
        <p className="speed-chart-message">Speed telemetry is unavailable for driver B (#{result.driver_b.driver_number}).</p>
      )}

      <p className="speed-chart-note">
        Distance is normalized separately for each lap. Telemetry alignment is approximate.
      </p>
    </section>
  )
}

export default SpeedComparisonChart
