const concepts = {
  1: {name: 'Amber Terminal', description: 'Maksimum informacji na jednym ekranie. Bursztynowe nagłówki, zwarta typografia i układ inspirowany terminalem analitycznym.', tags: ['Gęsty układ', 'Terminal', 'Amber / black']},
  2: {name: 'Pit Wall', description: 'Konsola inżyniera w czerni i bieli z mocnym czerwonym akcentem. Trzy kanały telemetrii w centrum, wybór kierowców po lewej i wyniki stale widoczne po prawej.', tags: ['Rekomendacja', 'Black / white', 'Signal red']},
  3: {name: 'Engineering Sheet', description: 'Jasny warsztat analityczny. Precyzyjna siatka, spokojna hierarchia i czytelność podczas długiej pracy z danymi.', tags: ['Jasny motyw', 'Techniczny', 'Ink / paper']},
  4: {name: 'Race Control', description: 'Operacyjny charakter motorsportu. Duże wyniki po lewej, zwarty stos wykresów po prawej i mocna czerwona identyfikacja.', tags: ['Wyraźna hierarchia', 'Motorsport', 'Red / charcoal']},
  5: {name: 'Apex Instruments', description: 'Nowoczesny pulpit instrumentów. Duży wykres prędkości, panel różnic sektorowych i limonkowy akcent na granatowym tle.', tags: ['Duży wykres', 'Przestrzenny', 'Lime / midnight']},
};

let data;
let activeConcept = '1';
const preview = document.querySelector('#preview');
const signed = (value) => `${value > 0 ? '+' : ''}${value.toFixed(3)}`;
const lapTime = (value) => `${Math.floor(value / 60)}:${(value % 60).toFixed(3).padStart(6, '0')}`;

function logo() {
  return '<div class="app-brand"><span class="apex-symbol">A<span></span></span><strong>APEX<span class="brand-caption">LAP INTELLIGENCE</span></strong></div>';
}

function header(extra = '') {
  return `<header class="app-header">${logo()}<div class="app-context"><span class="context-location">BEL / SPA-FRANCORCHAMPS</span><span class="context-session">2024 · QUALIFYING</span></div>${extra}<span class="archive-badge"><i></i> ARCHIVE / 9570</span></header>`;
}

function context() {
  return '<div class="context-controls"><div><small>SESSION</small><strong>Spa-Francorchamps <span>▾</span></strong></div><div><small>YEAR / TYPE</small><strong>2024 / Qualifying</strong></div></div>';
}

function driverPicker() {
  return `<div class="driver-picker"><div class="picker-label">COMPARISON PAIR</div>${[data.driverA, data.driverB].map((driver, i) => `<div class="picker-driver driver-${i ? 'b' : 'a'}"><span class="driver-dot"></span><span><small>DRIVER ${i ? 'B' : 'A'} / ${driver.team.toUpperCase()}</small><strong>${driver.name}</strong></span><b>${driver.number}</b></div>`).join('')}<span class="reference-note">Fastest available laps · A − B</span></div>`;
}

function driverResults() {
  return `<div class="driver-results">${[data.driverA, data.driverB].map((driver, i) => `<section class="driver-result driver-${i ? 'b' : 'a'}"><div class="result-label"><span class="driver-dot"></span>${i ? 'B' : 'A'} / ${driver.code} <span class="result-lap">LAP ${driver.lap}</span></div><div class="result-name">${driver.name}<span>#${driver.number}</span></div><strong class="result-time">${lapTime(driver.time)}</strong><span class="result-team">${driver.team} · ${driver.time.toFixed(3)} s</span></section>`).join('')}</div>`;
}

function delta() {
  return `<section class="delta-block"><div class="panel-eyebrow">LAP DELTA <span>A − B</span></div><strong>${signed(data.delta)}<small> s</small></strong><p><span class="driver-dot"></span>SAINZ FASTER BY 0.361 s</p></section>`;
}

function sectors(style = '') {
  return `<section class="sector-panel ${style}"><div class="panel-heading"><h3>Sector comparison</h3><span>A − B / s</span></div><div class="sector-rows">${data.sectors.map((value, i) => `<div class="sector-row"><span class="sector-id">S${i + 1}</span><div class="sector-bar"><span style="width:${Math.abs(value) / 0.346 * 88}%;" class="${value < 0 ? 'gain' : 'loss'}"></span></div><strong class="${value < 0 ? 'driver-a-text' : 'driver-b-text'}">${signed(value)}</strong><span class="sector-winner">${value < 0 ? 'SAI' : 'ALB'}</span></div>`).join('')}</div><p class="sector-explanation">Independent sector deltas, not cumulative.</p></section>`;
}

function legend() {
  return '<div class="chart-legend"><span><i class="legend-a"></i>SAI <small>#55</small></span><span><i class="legend-b"></i>ALB <small>#23</small></span></div>';
}

function chart(id, className = '') {
  const channel = data.charts.find((entry) => entry.id === id);
  const names = {speed: ['Speed', 'km/h', 350], throttle: ['Throttle', '%', 100], brake: ['Brake', 'ON / OFF', 1]};
  const [name, unit, max] = names[id];
  const plot = {left: 46, right: 776, top: 18, bottom: 156};
  const x = (value) => plot.left + value / 100 * (plot.right - plot.left);
  const y = (value) => plot.bottom - value / max * (plot.bottom - plot.top);
  const yTicks = id === 'speed' ? [0, 100, 200, 300] : id === 'throttle' ? [0, 50, 100] : [0, 1];
  const grid = yTicks.map((value) => `<line class="plot-grid" x1="${plot.left}" y1="${y(value)}" x2="${plot.right}" y2="${y(value)}"/><text class="plot-label" x="35" y="${y(value) + 4}" text-anchor="end">${id === 'brake' ? value ? 'ON' : 'OFF' : value}</text>`).join('') + [0, 20, 40, 60, 80, 100].map((value) => `<line class="plot-grid" x1="${x(value)}" y1="${plot.top}" x2="${x(value)}" y2="${plot.bottom}"/><text class="plot-label" x="${x(value)}" y="179" text-anchor="middle">${value}%</text>`).join('');
  const traces = channel.traces.map((trace, index) => {
    let path = '';
    let previous = null;
    for (const point of trace.points) {
      if (point[1] === null) { previous = null; continue; }
      if (previous === null) path += `M${x(point[0]).toFixed(2)},${y(point[1]).toFixed(2)}`;
      else if (id === 'brake') path += `H${x(point[0]).toFixed(2)}V${y(point[1]).toFixed(2)}`;
      else path += `L${x(point[0]).toFixed(2)},${y(point[1]).toFixed(2)}`;
      previous = point;
    }
    return `<path class="trace trace-${index ? 'b' : 'a'}" d="${path}"/>`;
  }).join('');
  return `<section class="chart-panel ${className}" data-channel="${id}"><div class="chart-heading"><h3><span class="channel-index">${{speed:'01',throttle:'02',brake:'03'}[id]}</span>${name}<small>${unit}</small></h3>${legend()}</div><div class="plot-wrap"><svg viewBox="0 0 800 192" preserveAspectRatio="none" role="img" aria-label="${name}: Sainz versus Albon. Normalized lap distance from 0 to 100 percent.">${grid}${traces}<line class="plot-cursor" x1="0" y1="18" x2="0" y2="156"/></svg><div class="plot-readout" aria-hidden="true"></div></div></section>`;
}

function telemetryNote() {
  return '<div class="telemetry-note"><span>OPENF1 / ARCHIVED SESSION</span><span>Normalized lap distance · approximate alignment · gaps = unknown samples</span></div>';
}

function sessionInfo() {
  return '<section class="session-info"><div class="panel-eyebrow">SESSION CONTEXT</div><dl><div><dt>Circuit</dt><dd>Spa-Francorchamps</dd></div><div><dt>Session</dt><dd>Qualifying</dd></div><div><dt>Date</dt><dd>27 JUL 2024</dd></div><div><dt>Session key</dt><dd>9570</dd></div></dl><span class="small-note">Historical data · OpenF1</span></section>';
}

function terminal() {
  return `${header('<span class="workspace-label">WORKSPACE / LAP COMPARE</span>')}<div class="terminal-command"><span class="command-prefix">APEX &gt;</span><strong>SPA 2024 / QUAL / SAI vs ALB</strong><span class="command-status">COMPARISON LOADED</span></div><div class="terminal-body"><aside class="terminal-sidebar"><div class="panel-strip">01 / SESSION SETUP</div>${context()}${driverPicker()}${sessionInfo()}</aside><div class="terminal-main"><div class="terminal-result-strip">${driverResults()}${delta()}</div><div class="panel-strip">02 / TELEMETRY OVERLAY <span>NORMALIZED DISTANCE / %</span></div>${chart('speed')}${chart('throttle')}${chart('brake')}</div><aside class="terminal-sectors"><div class="panel-strip">03 / SECTORS</div>${sectors()}<div class="terminal-matrix"><div class="panel-eyebrow">SECTOR WINNER</div><div><span>S1</span><b class="driver-a-text">SAI</b></div><div><span>S2</span><b class="driver-a-text">SAI</b></div><div><span>S3</span><b class="driver-b-text">ALB</b></div><p>2 / 3 sectors<br>in favour of Sainz</p></div></aside></div>${telemetryNote()}`;
}

function pitwall() {
  return `${header()}<div class="pitwall-body"><aside class="pitwall-sidebar"><div class="sidebar-section-number">WORKSPACE 01</div><div class="side-active"><span>◈</span> Lap comparison</div><div class="sidebar-title">Session setup</div>${context()}${driverPicker()}<div class="sidebar-bottom">${sessionInfo()}</div></aside><section class="pitwall-main"><div class="work-title"><div><span class="panel-eyebrow">TELEMETRY WORKSPACE</span><h2>Lap comparison<span> / </span><em>SAI × ALB</em></h2></div><span class="data-chip">3 CHANNELS</span></div>${chart('speed')}${chart('throttle')}${chart('brake')}</section><aside class="pitwall-summary"><div class="summary-title">COMPARISON SUMMARY<span>↗</span></div>${delta()}${driverResults()}${sectors()}<div class="insight"><span class="panel-eyebrow">LARGEST SECTOR DIFFERENCE</span><strong>Sector 02</strong><p>Sainz gains <b>0.346 s</b> in the middle sector.</p></div></aside></div>${telemetryNote()}`;
}

function engineering() {
  return `${header('<span class="workspace-label">ENGINEERING WORKSHEET / 01</span>')}<div class="engineering-body"><aside class="engineering-sidebar"><span class="sheet-id">ANALYSIS / 9570</span><h2>Comparison<br>parameters.</h2>${context()}${driverPicker()}${sessionInfo()}<div class="sheet-stamp">APEX / ENGINEERING<br>QUALIFYING ARCHIVE</div></aside><div class="engineering-main"><div class="sheet-title"><div><span class="panel-eyebrow">BELGIAN GRAND PRIX / 2024</span><h2>Two laps. Every difference.</h2></div><span class="sheet-page">01 / 01</span></div><div class="sheet-results">${driverResults()}${delta()}</div>${sectors('horizontal-sectors')}${chart('speed','hero-chart')}<div class="sheet-channel-pair">${chart('throttle')}${chart('brake')}</div></div></div>${telemetryNote()}`;
}

function racecontrol() {
  return `${header('<span class="workspace-label">PERFORMANCE ANALYSIS</span>')}<div class="race-context"><span class="race-session-code">BEL<span>24</span></span><div><small>SESSION / 9570</small><strong>Spa-Francorchamps <span>›</span> Qualifying</strong></div><span class="race-context-right">27.07.2024 <span>/</span> ARCHIVED SESSION</span></div><div class="race-body"><aside class="race-summary"><div class="race-title"><span class="panel-eyebrow">HEAD TO HEAD</span><h2>SAINZ<span>VS</span>ALBON</h2></div>${driverResults()}${delta()}${sectors()}</aside><section class="race-telemetry"><div class="race-chart-title"><h2>Telemetry analysis</h2><span>03 / CHANNELS</span></div>${chart('speed')}${chart('throttle')}${chart('brake')}</section></div>${telemetryNote()}`;
}

function instruments() {
  return `${header('<span class="workspace-label">ANALYSIS / TELEMETRY</span>')}<div class="instruments-body"><div class="instrument-title"><div><span class="panel-eyebrow">SPA-FRANCORCHAMPS / QUALIFYING 2024</span><h2>Performance, in detail<span>.</span></h2></div><span class="instrument-session">SESSION 9570<br><small>27 JUL 2024 / ARCHIVE</small></span></div><div class="instrument-summary">${driverResults()}${delta()}</div><div class="instrument-grid"><div class="instrument-charts">${chart('speed','hero-chart')}<div class="instrument-channel-pair">${chart('throttle')}${chart('brake')}</div></div><aside class="instrument-aside">${sectors()}<div class="sector-focus"><div class="panel-eyebrow">DECISIVE SECTOR</div><span>02</span><strong>−0.346<small> s</small></strong><p>Largest sector gain for Sainz.</p><div class="focus-ruler">${'<i></i>'.repeat(24)}</div></div></aside></div></div>${telemetryNote()}`;
}

const renderers = {1: terminal, 2: pitwall, 3: engineering, 4: racecontrol, 5: instruments};

function workspace(id) {
  return `<article class="workspace theme-${id}" aria-label="${concepts[id].name}">${renderers[id]()}</article>`;
}

function showConcept(id) {
  activeConcept = String(id);
  document.querySelectorAll('[data-concept]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.concept === activeConcept)));
  const overview = activeConcept === 'all';
  document.querySelector('#concept-number').textContent = overview ? 'PORÓWNANIE KIERUNKÓW' : `KIERUNEK 0${id}`;
  document.querySelector('#concept-title').textContent = overview ? 'Pięć sposobów na profesjonalny APEX.' : concepts[id].name;
  document.querySelector('#concept-description').textContent = overview ? 'Ten sam zestaw danych, pięć różnych układów. Kliknij projekt, aby obejrzeć go w pełnym rozmiarze.' : concepts[id].description;
  document.querySelector('#concept-tags').innerHTML = overview ? '' : concepts[id].tags.map((tag) => `<span>${tag}</span>`).join('');
  preview.classList.toggle('overview', overview);
  preview.innerHTML = overview ? Object.entries(concepts).map(([key, concept]) => `<button class="overview-card" data-open="${key}" aria-label="Otwórz ${concept.name}"><div class="mini-stage">${workspace(key)}</div><div class="overview-caption"><span>0${key}</span><strong>${concept.name}</strong><span>Otwórz ↗</span></div><p>${concept.description}</p></button>`).join('') : workspace(id);
  if (overview) resizeThumbnails();
  else bindChartHover();
  history.replaceState(null, '', `#${overview ? 'all' : id}`);
}

function resizeThumbnails() {
  document.querySelectorAll('.mini-stage').forEach((stage) => {
    stage.style.setProperty('--mini-scale', stage.clientWidth / 1240);
    stage.style.height = `${780 * stage.clientWidth / 1240}px`;
  });
}

function bindChartHover() {
  document.querySelectorAll('.chart-panel').forEach((panel) => {
    const plot = panel.querySelector('.plot-wrap');
    plot.addEventListener('pointermove', (event) => {
      const rect = plot.getBoundingClientRect();
      const svgX = (event.clientX - rect.left) / rect.width * 800;
      const percent = Math.max(0, Math.min(100, (svgX - 46) / 730 * 100));
      document.querySelectorAll('.chart-panel').forEach((target) => {
        const cursor = target.querySelector('.plot-cursor');
        cursor.setAttribute('x1', 46 + percent * 7.3);
        cursor.setAttribute('x2', 46 + percent * 7.3);
        cursor.style.opacity = 1;
        const channel = data.charts.find((entry) => entry.id === target.dataset.channel);
        const values = channel.traces.map((trace) => {
          let closest = trace.points[0];
          for (const point of trace.points) {
            if (target.dataset.channel === 'brake') {
              if (point[0] <= percent) closest = point;
            } else if (Math.abs(point[0] - percent) < Math.abs(closest[0] - percent)) closest = point;
          }
          if (closest[1] === null) return '—';
          return target.dataset.channel === 'brake' ? closest[1] ? 'ON' : 'OFF' : `${closest[1].toFixed(1)}${target.dataset.channel === 'speed' ? ' km/h' : '%'}`;
        });
        const readout = target.querySelector('.plot-readout');
        readout.textContent = `${percent.toFixed(1)}%  /  SAI ${values[0]}  /  ALB ${values[1]}`;
        readout.style.opacity = 1;
      });
    });
    plot.addEventListener('pointerleave', () => document.querySelectorAll('.plot-cursor, .plot-readout').forEach((element) => { element.style.opacity = 0; }));
  });
}

document.querySelector('.concept-navigation').addEventListener('click', (event) => {
  const button = event.target.closest('[data-concept]');
  if (button && data) showConcept(button.dataset.concept);
});
preview.addEventListener('click', (event) => {
  const button = event.target.closest('[data-open]');
  if (button) { showConcept(button.dataset.open); window.scrollTo({top: 0, behavior: 'smooth'}); }
});
window.addEventListener('resize', () => { if (activeConcept === 'all') resizeThumbnails(); });

try {
  const response = await fetch('./session.json');
  if (!response.ok) throw new Error(`Session data: ${response.status}`);
  data = await response.json();
  const hash = location.hash.slice(1);
  showConcept(hash === 'all' || concepts[hash] ? hash : '1');
} catch (error) {
  preview.textContent = `Nie udało się załadować mockupów: ${error.message}`;
}
