/* ── ViZA · app.js ───────────────────────────────────────── */
const API = '';  // empty = same origin (FastAPI serves frontend)

const CHART_DEFAULTS = {
  font: { family: "'IBM Plex Mono', monospace", size: 10 },
  color: '#888888'
};
Chart.defaults.font = CHART_DEFAULTS.font;
Chart.defaults.color = CHART_DEFAULTS.color;

const COLORS = {
  gold: '#C9A84C',
  goldLight: '#E8C97A',
  red: '#E63946',
  green: '#57CC99',
  blue: '#4CC9F0',
  muted: '#333333',
  border: '#2a2a2a'
};

// ── State ────────────────────────────────────────────────────
let state = {
  allProvinces: [],
  selectedProvince: 'ALL',
  sdData: null,
  unData: null,
  indData: null,
  charts: {}
};

// ── Helpers ──────────────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(API + url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function destroyChart(key) {
  if (state.charts[key]) {
    state.charts[key].destroy();
    delete state.charts[key];
  }
}

function makeChart(id, config) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  state.charts[id] = new Chart(ctx, config);
}

function gridLines() {
  return { color: COLORS.border, lineWidth: 0.5 };
}

function barConfig(labels, datasets, options = {}) {
  return {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: datasets.length > 1, labels: { boxWidth: 10, padding: 12, font: { size: 10 } } } },
      scales: {
        x: { grid: gridLines(), ticks: { maxRotation: 35 } },
        y: { grid: gridLines(), beginAtZero: false, ...options.y }
      },
      ...options
    }
  };
}

function hbarConfig(labels, data, color, options = {}) {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: data.map(v => v < (options.threshold || 999) ? color : COLORS.red), borderWidth: 0 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: gridLines(), beginAtZero: false, ...options.x },
        y: { grid: { display: false }, ticks: { font: { size: 9 } } }
      }
    }
  };
}

function pct(v, nat, higherIsBetter = true) {
  const below = higherIsBetter ? v < nat : v > nat;
  const cls = below ? 'below' : 'above';
  const badge = below ? '<span class="badge warn">▼ BELOW AVG</span>' : '<span class="badge ok">▲ ABOVE AVG</span>';
  return `<span class="${cls}">${v}%${badge}</span>`;
}

function pctRaw(v, nat, higherIsBetter = true) {
  const below = higherIsBetter ? v < nat : v > nat;
  const cls = below ? 'below' : 'above';
  const badge = below ? '<span class="badge warn">▼</span>' : '<span class="badge ok">▲</span>';
  return `<span class="${cls}">${v}${badge}</span>`;
}

function filterProvinces(list) {
  if (state.selectedProvince === 'ALL') return list;
  return list.filter(p => p.code === state.selectedProvince);
}

// ── Timestamp ────────────────────────────────────────────────
function updateTimestamp() {
  const el = document.getElementById('timestamp');
  if (el) el.textContent = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) + ' SAST';
}
setInterval(updateTimestamp, 1000);
updateTimestamp();

// ── Province Pills ───────────────────────────────────────────
function buildProvincePills(provinces) {
  const wrap = document.getElementById('province-pills');
  wrap.innerHTML = '<button class="pill active" data-code="ALL">ALL</button>';
  provinces.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.dataset.code = p.code;
    btn.textContent = p.code;
    btn.title = p.name;
    wrap.appendChild(btn);
  });
  wrap.addEventListener('click', e => {
    if (!e.target.classList.contains('pill')) return;
    wrap.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    state.selectedProvince = e.target.dataset.code;
    renderAll();
  });

  // Flag form province select
  const sel = document.getElementById('flag-province');
  if (sel) {
    provinces.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }
}

// ── Ticker ───────────────────────────────────────────────────
function buildTicker(summary) {
  const items = [
    `ELECTRICITY ACCESS: ${summary.service_delivery.electricity}% NATIONAL AVG`,
    `WATER ACCESS: ${summary.service_delivery.water}% NATIONAL AVG`,
    `YOUTH UNEMPLOYMENT (15–24): ${summary.unemployment.youth_15_24}%`,
    `MATRIC PASS RATE: ${summary.indicators.matric_pass_rate}%`,
    `CLINIC DISTANCE AVG: ${summary.indicators.clinic_access_km}KM`,
    `SANITATION ACCESS: ${summary.service_delivery.sanitation}%`,
    `OVERALL UNEMPLOYMENT: ${summary.unemployment.overall}%`,
    `PROVINCES MONITORED: ${summary.provinces_monitored}`,
    `DATA SOURCES CONNECTED: ${summary.data_sources}`,
    `NEET RATE (15–24): ${summary.unemployment.youth_15_24}%`
  ];
  const text = items.join('   ·   ') + '   ·   ' + items.join('   ·   ');
  document.getElementById('ticker').textContent = text;
}

// ── Summary Cards ────────────────────────────────────────────
function buildSummaryCards(summary, anomalyCount) {
  document.getElementById('val-electricity').textContent = summary.service_delivery.electricity + '%';
  document.getElementById('val-water').textContent = summary.service_delivery.water + '%';
  document.getElementById('val-unemployment').textContent = summary.unemployment.youth_15_24 + '%';
  document.getElementById('val-matric').textContent = summary.indicators.matric_pass_rate + '%';
  document.getElementById('val-anomalies').textContent = anomalyCount;
  document.getElementById('val-sources').textContent = summary.data_sources;
}

// ── SERVICE DELIVERY ─────────────────────────────────────────
function renderServiceDelivery() {
  if (!state.sdData) return;
  const provinces = filterProvinces(state.sdData.provinces);
  const avg = state.sdData.national_average;
  const labels = provinces.map(p => p.code);

  makeChart('chart-sd-bar', barConfig(labels, [
    { label: 'Electricity', data: provinces.map(p => p.electricity), backgroundColor: COLORS.gold, borderWidth: 0 },
    { label: 'Water', data: provinces.map(p => p.water), backgroundColor: COLORS.blue, borderWidth: 0 }
  ], { y: { min: 30, max: 100 } }));

  makeChart('chart-sd-sanitation', {
    ...hbarConfig(provinces.map(p => p.name), provinces.map(p => p.sanitation), COLORS.green, { threshold: avg.sanitation }),
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: gridLines(), min: 20, max: 100 },
        y: { grid: { display: false }, ticks: { font: { size: 9 } } }
      }
    }
  });

  const sanctionH = document.getElementById('chart-sd-sanitation');
  if (sanctionH) sanctionH.style.height = '220px';

  makeChart('chart-sd-refuse', {
    type: 'bar',
    data: {
      labels: provinces.map(p => p.code),
      datasets: [{
        data: provinces.map(p => p.refuse_removal),
        backgroundColor: provinces.map(p => p.refuse_removal < avg.refuse_removal ? COLORS.red : COLORS.gold),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { x: { grid: gridLines() }, y: { grid: gridLines(), min: 20, max: 100 } }
    }
  });

  // Table
  const tbl = document.getElementById('table-sd');
  tbl.innerHTML = `
    <tr>
      <th>PROVINCE</th>
      <th>ELECTRICITY</th>
      <th>WATER</th>
      <th>SANITATION</th>
      <th>REFUSE REMOVAL</th>
      <th>POPULATION</th>
    </tr>
    <tr style="background:#111">
      <td style="color:#C9A84C;font-weight:600">NATIONAL AVG</td>
      <td>${avg.electricity}%</td>
      <td>${avg.water}%</td>
      <td>${avg.sanitation}%</td>
      <td>${avg.refuse_removal}%</td>
      <td>—</td>
    </tr>
    ${provinces.map(p => `
      <tr>
        <td style="font-weight:600">${p.name}</td>
        <td>${pct(p.electricity, avg.electricity)}</td>
        <td>${pct(p.water, avg.water)}</td>
        <td>${pct(p.sanitation, avg.sanitation)}</td>
        <td>${pct(p.refuse_removal, avg.refuse_removal)}</td>
        <td>${p.population.toLocaleString()}</td>
      </tr>`).join('')}
  `;
}

// ── UNEMPLOYMENT ─────────────────────────────────────────────
function renderUnemployment() {
  if (!state.unData) return;
  const provinces = filterProvinces(state.unData.provinces);
  const avg = state.unData.national_average;
  const labels = provinces.map(p => p.code);

  makeChart('chart-un-grouped', barConfig(labels, [
    { label: 'Ages 15–24', data: provinces.map(p => p.youth_15_24), backgroundColor: COLORS.red, borderWidth: 0 },
    { label: 'Ages 25–34', data: provinces.map(p => p.youth_25_34), backgroundColor: COLORS.gold, borderWidth: 0 }
  ], { y: { min: 0, max: 100 } }));

  makeChart('chart-un-neet', {
    type: 'bar',
    data: {
      labels: provinces.map(p => p.code),
      datasets: [{
        data: provinces.map(p => p.neet_rate),
        backgroundColor: provinces.map(p => p.neet_rate > 50 ? COLORS.red : COLORS.gold),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { x: { grid: gridLines() }, y: { grid: gridLines(), min: 0, max: 100 } }
    }
  });

  makeChart('chart-un-overall', {
    type: 'line',
    data: {
      labels: provinces.map(p => p.code),
      datasets: [
        { label: 'Province', data: provinces.map(p => p.overall), borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.1)', tension: 0.3, pointRadius: 4, fill: true },
        { label: 'National Avg', data: provinces.map(() => avg.overall), borderColor: COLORS.red, borderDash: [4, 4], pointRadius: 0, tension: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: true, labels: { boxWidth: 10 } } },
      scales: { x: { grid: gridLines() }, y: { grid: gridLines(), min: 0, max: 80 } }
    }
  });

  const tbl = document.getElementById('table-un');
  tbl.innerHTML = `
    <tr>
      <th>PROVINCE</th>
      <th>YOUTH 15–24 (%)</th>
      <th>YOUTH 25–34 (%)</th>
      <th>NEET RATE (%)</th>
      <th>OVERALL (%)</th>
    </tr>
    <tr style="background:#111">
      <td style="color:#C9A84C;font-weight:600">NATIONAL AVG</td>
      <td>${avg.youth_15_24}%</td>
      <td>${avg.youth_25_34}%</td>
      <td>—</td>
      <td>${avg.overall}%</td>
    </tr>
    ${provinces.map(p => `
      <tr>
        <td style="font-weight:600">${p.name}</td>
        <td>${pct(p.youth_15_24, avg.youth_15_24, false)}</td>
        <td>${pct(p.youth_25_34, avg.youth_25_34, false)}</td>
        <td>${pctRaw(p.neet_rate, 50, false)}</td>
        <td>${pct(p.overall, avg.overall, false)}</td>
      </tr>`).join('')}
  `;
}

// ── INDICATORS ───────────────────────────────────────────────
function renderIndicators() {
  if (!state.indData) return;
  const provinces = filterProvinces(state.indData.provinces);
  const avg = state.indData.national_average;
  const labels = provinces.map(p => p.code);

  makeChart('chart-ind-education', barConfig(labels, [
    { label: 'Matric Pass Rate', data: provinces.map(p => p.matric_pass_rate), backgroundColor: COLORS.green, borderWidth: 0 },
    { label: 'Dropout Rate', data: provinces.map(p => p.school_dropout_rate), backgroundColor: COLORS.red, borderWidth: 0 }
  ]));

  makeChart('chart-ind-clinic', {
    type: 'bar',
    data: {
      labels: provinces.map(p => p.code),
      datasets: [{
        data: provinces.map(p => p.clinic_access_km),
        backgroundColor: provinces.map(p => p.clinic_access_km > avg.clinic_access_km + 5 ? COLORS.red : COLORS.blue),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { x: { grid: gridLines() }, y: { grid: gridLines(), beginAtZero: true } }
    }
  });

  makeChart('chart-ind-crime', {
    type: 'bar',
    data: {
      labels: provinces.map(p => p.code),
      datasets: [{
        data: provinces.map(p => p.crime_index),
        backgroundColor: provinces.map(p => p.crime_index > avg.crime_index ? COLORS.red : COLORS.gold),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { x: { grid: gridLines() }, y: { grid: gridLines(), beginAtZero: true } }
    }
  });

  const tbl = document.getElementById('table-ind');
  tbl.innerHTML = `
    <tr>
      <th>PROVINCE</th>
      <th>MATRIC PASS RATE</th>
      <th>DROPOUT RATE</th>
      <th>CLINIC DISTANCE (KM)</th>
      <th>CRIME INDEX</th>
    </tr>
    <tr style="background:#111">
      <td style="color:#C9A84C;font-weight:600">NATIONAL AVG</td>
      <td>${avg.matric_pass_rate}%</td>
      <td>${avg.school_dropout_rate}%</td>
      <td>${avg.clinic_access_km} km</td>
      <td>${avg.crime_index}</td>
    </tr>
    ${provinces.map(p => `
      <tr>
        <td style="font-weight:600">${p.name}</td>
        <td>${pct(p.matric_pass_rate, avg.matric_pass_rate)}</td>
        <td>${pct(p.school_dropout_rate, avg.school_dropout_rate, false)}</td>
        <td>${pctRaw(p.clinic_access_km, avg.clinic_access_km, false)}</td>
        <td>${pctRaw(p.crime_index, avg.crime_index, false)}</td>
      </tr>`).join('')}
  `;
}

// ── ANOMALIES ────────────────────────────────────────────────
async function renderAnomalies() {
  const container = document.getElementById('anomaly-list');
  try {
    const data = await fetchJSON('/api/anomalies');
    if (!data.provinces.length) {
      container.innerHTML = '<div class="no-flags">No anomalies detected — all provinces within threshold.</div>';
      return;
    }
    container.innerHTML = data.provinces.map(a => `
      <div class="anomaly-card-item">
        <div class="anomaly-province">⚠ ${a.province} <span style="font-size:13px;font-family:var(--mono);color:#888">(${a.issues.length} issue${a.issues.length > 1 ? 's' : ''})</span></div>
        <div class="anomaly-issues">
          ${a.issues.map(i => `
            <div class="anomaly-issue">
              <span class="issue-name">${i.indicator}</span>
              <div class="issue-bar-wrap"><div class="issue-bar" style="width:${Math.min(i.gap * 3, 100)}%"></div></div>
              <span class="issue-gap">−${i.gap}pp vs national</span>
            </div>`).join('')}
        </div>
      </div>`).join('');
  } catch (e) {
    container.innerHTML = '<div class="no-flags">Could not load anomaly data.</div>';
  }
}

// ── FLAGS ────────────────────────────────────────────────────
async function renderFlags() {
  const log = document.getElementById('audit-log');
  const countEl = document.getElementById('flag-count');
  try {
    const data = await fetchJSON('/api/flags');
    if (countEl) countEl.textContent = `(${data.total} TOTAL)`;
    if (!data.flags.length) {
      log.innerHTML = '<div class="no-flags">No flags submitted yet. Be the first to report incorrect data.</div>';
      return;
    }
    log.innerHTML = data.flags.map(f => `
      <div class="audit-entry">
        <div class="audit-top">
          <span class="audit-id">#${f.id}</span>
          <span class="${f.status === 'RESOLVED' ? 'audit-status-resolved' : 'audit-status-pending'}">${f.status}</span>
        </div>
        <div><span class="audit-province">${f.province}</span> · ${f.category} · ${f.indicator}</div>
        <div class="audit-note">"${f.citizen_note}"</div>
        <div class="audit-time">${new Date(f.timestamp).toLocaleString('en-ZA')} · ${f.contact}</div>
      </div>`).join('');
  } catch (e) {
    log.innerHTML = '<div class="no-flags">Could not load flags.</div>';
  }
}

// Flag submit
document.getElementById('flag-submit').addEventListener('click', async () => {
  const feedback = document.getElementById('flag-feedback');
  const body = {
    province: document.getElementById('flag-province').value,
    category: document.getElementById('flag-category').value,
    indicator: document.getElementById('flag-indicator').value,
    reported_value: parseFloat(document.getElementById('flag-value').value) || 0,
    citizen_note: document.getElementById('flag-note').value,
    contact: document.getElementById('flag-contact').value || 'Anonymous'
  };
  if (!body.indicator || !body.citizen_note) {
    feedback.className = 'flag-feedback error';
    feedback.textContent = 'Please fill in the indicator and your note before submitting.';
    return;
  }
  try {
    const res = await fetch(API + '/api/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    feedback.className = 'flag-feedback success';
    feedback.textContent = `Flag submitted · ID: #${data.flag_id} · Status: ${data.status}`;
    document.getElementById('flag-indicator').value = '';
    document.getElementById('flag-value').value = '';
    document.getElementById('flag-note').value = '';
    document.getElementById('flag-contact').value = '';
    renderFlags();
  } catch (e) {
    feedback.className = 'flag-feedback error';
    feedback.textContent = 'Submission failed. Please try again.';
  }
});

// ── Tab switching ────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'anomalies') renderAnomalies();
    if (tab.dataset.tab === 'citizen') renderFlags();
  });
});

// ── Render all data panels ───────────────────────────────────
function renderAll() {
  renderServiceDelivery();
  renderUnemployment();
  renderIndicators();
}

// ── Boot ─────────────────────────────────────────────────────
async function init() {
  try {
    const [summary, provinces, sdData, unData, indData, anomalies] = await Promise.all([
      fetchJSON('/api/summary'),
      fetchJSON('/api/provinces'),
      fetchJSON('/api/service-delivery'),
      fetchJSON('/api/unemployment'),
      fetchJSON('/api/indicators'),
      fetchJSON('/api/anomalies')
    ]);

    state.allProvinces = provinces;
    state.sdData = sdData;
    state.unData = unData;
    state.indData = indData;

    buildTicker(summary);
    buildSummaryCards(summary, anomalies.total_anomalies);
    buildProvincePills(provinces);
    renderAll();
  } catch (e) {
    console.error('ViZA init error:', e);
  }
}

init();
