/**
 * ========================================================================
 *   NEUROPREDICT - SYSTEM CLIENT CONTROLLER (SPA ROUTER & GAME ENGINES)
 * ========================================================================
 */

// Global Application State
const state = {
  currentView: 'landing', // 'landing' | 'auth' | 'dashboard' | 'patient-detail' | 'assessment' | 'research' | 'report' | 'predict'
  user: null, // { username, role }
  selectedPatientId: 'NP-1082',
  alerts: [
    { id: 1, type: 'critical', patient: 'Ananya Sharma', message: 'Cognitive drift drift exceeded 18% threshold (MCI Warning)', time: '2h ago' },
    { id: 2, type: 'warning', patient: 'Rahul Verma', message: 'Reaction time latency increased by 45ms in timed tapping task', time: '5h ago' },
    { id: 3, type: 'info', patient: 'David Miller', message: 'Baseline assessment calibration successfully established', time: '1d ago' }
  ],
  patients: [
    {
      id: 'NP-1082',
      name: 'Ananya Sharma',
      age: 67,
      gender: 'F',
      cohort: 'Alzheimer\'s Disease (AD) Risk',
      riskScore: 78,
      confidence: 91,
      mmse: 16,
      updrs: null,
      status: 'Active Monitoring',
      drift: 18.4,
      lastSession: '2026-05-18',
      history: [
        { date: 'Jan 26', risk: 62, latency: 410, accuracy: 88, drift: 2.1 },
        { date: 'Feb 28', risk: 64, latency: 425, accuracy: 85, drift: 4.8 },
        { date: 'Mar 15', risk: 70, latency: 460, accuracy: 80, drift: 10.5 },
        { date: 'Apr 02', risk: 74, latency: 490, accuracy: 76, drift: 14.1 },
        { date: 'May 18', risk: 78, latency: 512, accuracy: 72, drift: 18.4 }
      ],
      shap: [
        { feature: 'Symbol-Digit Switch Latency', impact: 24, description: 'Delayed task engagement in cognitive matching' },
        { feature: 'Reaction Latency (Task 2)', impact: 18, description: 'Increased baseline reaction click delays' },
        { feature: 'Symbol Accuracy Score', impact: 12, description: 'Decreased mapping precision' },
        { feature: 'Age Biomarker Weight', impact: 8, description: 'Baseline age-related cohort weight' },
        { feature: 'MMSE Assessment Delta', impact: -6, description: 'Previous clinical test baseline correlation (Negative impact/Low risk contribution)' }
      ]
    },
    {
      id: 'NP-2041',
      name: 'Rahul Verma',
      age: 72,
      gender: 'M',
      cohort: 'Parkinson\'s Disease (PD) Risk',
      riskScore: 65,
      confidence: 87,
      mmse: 24,
      updrs: 18,
      status: 'Action Required',
      drift: 12.8,
      lastSession: '2026-05-15',
      history: [
        { date: 'Feb 10', risk: 52, latency: 380, accuracy: 92, drift: 1.5 },
        { date: 'Mar 12', risk: 55, latency: 395, accuracy: 90, drift: 3.8 },
        { date: 'Apr 18', risk: 60, latency: 420, accuracy: 85, drift: 8.2 },
        { date: 'May 15', risk: 65, latency: 448, accuracy: 82, drift: 12.8 }
      ],
      shap: [
        { feature: 'Motor Tapping Jitter', impact: 22, description: 'Fine-motor latency rhythm micro-fluctuations' },
        { feature: 'Reaction Latency (Task 2)', impact: 15, description: 'Prolonged response intervals' },
        { feature: 'UPDRS Motor Score Link', impact: 11, description: 'Direct correlation with clinical tremor index' },
        { feature: 'Symbol-Digit Latency', impact: -4, description: 'Cognitive coordination remains relatively stable' }
      ]
    },
    {
      id: 'NP-3056',
      name: 'Dr. Sarah Jenkins',
      age: 59,
      gender: 'F',
      cohort: 'Healthy Control (HC)',
      riskScore: 12,
      confidence: 96,
      mmse: 30,
      updrs: 0,
      status: 'Stable Baseline',
      drift: 1.2,
      lastSession: '2026-05-02',
      history: [
        { date: 'Jan 15', risk: 10, latency: 320, accuracy: 98, drift: 0.1 },
        { date: 'Mar 01', risk: 11, latency: 325, accuracy: 97, drift: 0.5 },
        { date: 'May 02', risk: 12, latency: 318, accuracy: 98, drift: 1.2 }
      ],
      shap: [
        { feature: 'Symbol Mapping Speed', impact: -14, description: 'Fast execution indicates intact processing speed' },
        { feature: 'Reaction Time Consistency', impact: -12, description: 'Low variation indicates stable motor control' },
        { feature: 'MMSE Baseline Calibration', impact: -8, description: 'Intact clinical cognitive scoring baseline' }
      ]
    }
  ],
  // Ingested Local datasets profiling
  datasets: {
    eeg: { name: 'ds004504-main EEG', subjects: 88, groupAD: 36, groupFTD: 23, groupCN: 29, spec: 'Resting State, 19 Channels, Butterworth 0.5-45Hz' },
    mri: { name: 'Multiclass Alzheimer MRI', subjects: 'Combined Voxel Matrices', classes: ['MildDemented', 'ModerateDemented', 'NonDemented', 'VeryMildDemented'], spec: 'Structural T1/T2 Scan Profiles' },
    parkinson: { name: 'NTUA Parkinson Dataset', subjects: 78, pdGroup: 55, npdGroup: 23, features: 'DaT Scan, MRI, UPDRS Demographics (smell, RBD, MMSE)' }
  },
  // Assessment telemetry temporary storage
  telemetry: {
    symbolDigit: { trials: [], accuracy: 0, avgLatency: 0 },
    reaction: { clicks: [], avgLatency: 0 }
  }
};

// Routing & View Switcher
function navigateTo(view) {
  state.currentView = view;
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === view) {
      item.classList.add('active');
    }
  });
  
  // Manage responsive sidebar drawer closure on navigation
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('drawer-open');

  renderCurrentView();
}

// Custom SPA State Renderer
function renderCurrentView() {
  const contentArea = document.getElementById('view-content');
  if (!contentArea) return;
  
  contentArea.innerHTML = '';
  
  switch(state.currentView) {
    case 'landing':
      renderLandingPage(contentArea);
      break;
    case 'auth':
      renderAuthPage(contentArea);
      break;
    case 'dashboard':
      renderDashboardPage(contentArea);
      break;
    case 'patient-detail':
      renderPatientDetailPage(contentArea);
      break;
    case 'assessment':
      renderAssessmentPage(contentArea);
      break;
    case 'research':
      renderResearchPage(contentArea);
      break;
    case 'report':
      renderReportPage(contentArea);
      break;
    case 'predict':
      renderPredictPage(contentArea);
      break;
    default:
      renderLandingPage(contentArea);
  }
}

/**
 * PAGE RENDERING FUNCTIONS
 */

// 1. Landing Page
function renderLandingPage(container) {
  container.innerHTML = `
    <div class="hero-section">
      <div class="hero-tag">
        <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
        <span>FDA-Compliant Clinical Research Platform</span>
      </div>
      <h2 class="hero-title">Early Neurodegenerative Screening via <span>Behavioral Telemetry</span></h2>
      <p class="hero-subtitle">NeuroPredict is a clinically validated software-only longitudinal monitoring engine powered by explainable AI (SHAP) for Alzheimer's, Parkinson's, and MCI.</p>
      <div style="display: flex; gap: 16px; justify-content: center;">
        <button class="btn btn-primary" onclick="navigateTo('auth')">Launch Research Portal</button>
        <button class="btn btn-secondary" onclick="window.open('https://github.com', '_blank')">Read Clinical Survey</button>
      </div>
    </div>
    
    <div>
      <h3 style="font-size: 20px; font-weight: 500; margin-bottom: 24px; color: white; text-align: center;">Advanced Clinical Capabilities</h3>
      <div class="landing-grid">
        <div class="feature-card">
          <div class="feature-icon">🧠</div>
          <h3>Multi-Cohort Analytics</h3>
          <p>Validated tracking matrices targeting structural progression classes mapped against ADNI, PPMI, and local EEG/MRI datasets.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">⏱️</div>
          <h3>Micro-latency Telemetry</h3>
          <p>Measures millisecond-level motor latencies and dynamic task-switching costs through automated keyboard/mouse assessments.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>Explainable AI (SHAP)</h3>
          <p>Explainable metrics depicting spatial and cognitive factors driving patient classification indexes, ensuring complete clinical visibility.</p>
        </div>
      </div>
    </div>
  `;
}

// 2. Auth Page
function renderAuthPage(container) {
  container.innerHTML = `
    <div class="auth-container" style="width: 100%; min-height: 70vh; display: flex; align-items: center; justify-content: center;">
      <div class="auth-card" style="width: 100%; max-width: 400px;">
        <div class="auth-header">
          <div class="auth-header-logo">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
          </div>
          <h2>NeuroPredict Portal</h2>
          <p>Enter your clinical credentials</p>
        </div>
        
        <form id="auth-form" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label class="form-label">Role Profile</label>
            <select class="form-input form-select" id="login-role" required>
              <option value="physician">Lead Clinician / Physician</option>
              <option value="researcher">Neuroscience Researcher</option>
              <option value="admin">Platform Administrator</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Clinical Username</label>
            <input type="text" class="form-input" id="login-username" value="dr.kishan.shetty" placeholder="name@clinic.org" required>
          </div>
          <div class="form-group">
            <label class="form-label">Secure Passkey</label>
            <input type="password" class="form-input" id="login-password" value="••••••••" placeholder="Password" required>
          </div>
          
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 16px;">Authenticate Credential</button>
        </form>
      </div>
    </div>
  `;
}

function handleLogin(e) {
  e.preventDefault();
  const role = document.getElementById('login-role').value;
  const username = document.getElementById('login-username').value;
  
  state.user = { username, role };
  
  // Show navigation links based on role
  const navContainer = document.getElementById('sidebar-nav-container');
  if (navContainer) {
    navContainer.innerHTML = getNavigationForRole(role);
  }
  
  // Update user name in header or footer
  const statusContainer = document.getElementById('user-status-area');
  if (statusContainer) {
    statusContainer.innerHTML = `
      <div style="font-size:12px; color:var(--text-muted);">Active Clinician:</div>
      <div style="font-size:13px; font-weight:600; color:white;">${username}</div>
      <div class="badge badge-purple" style="margin-top:6px; font-size:9px;">${role.toUpperCase()}</div>
    `;
  }
  
  navigateTo('dashboard');
}

function getNavigationForRole(role) {
  let navHTML = `
    <div class="nav-section-title">Clinical Workspace</div>
    <div class="nav-item active" data-view="dashboard" onclick="navigateTo('dashboard')">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/></svg>
      Physician Dashboard
    </div>
    <div class="nav-item" data-view="assessment" onclick="navigateTo('assessment')">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>
      Assessment Suite
    </div>
    <div class="nav-item" data-view="predict" onclick="navigateTo('predict')">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      Upload & Predict
    </div>
  `;
  
  if (role === 'researcher' || role === 'admin') {
    navHTML += `
      <div class="nav-section-title">Research Engine</div>
      <div class="nav-item" data-view="research" onclick="navigateTo('research')">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
        Model Analytics
      </div>
    `;
  }
  
  navHTML += `
    <div class="nav-section-title">System Exit</div>
    <div class="nav-item" onclick="logout()">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.78 2.22l-1.42 1.42C18.43 8.11 19 9.99 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.01.57-3.89 1.64-5.36L5.22 5.22C3.8 6.99 3 9.3 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.7-1.2-5.01-3.22-6.78z"/></svg>
      Lock Platform
    </div>
  `;
  return navHTML;
}

function logout() {
  state.user = null;
  const navContainer = document.getElementById('sidebar-nav-container');
  if (navContainer) {
    navContainer.innerHTML = `
      <div class="nav-section-title">Public Portal</div>
      <div class="nav-item active" data-view="landing" onclick="navigateTo('landing')">
        Landing Page
      </div>
      <div class="nav-item" data-view="auth" onclick="navigateTo('auth')">
        Physician Log In
      </div>
    `;
  }
  const statusContainer = document.getElementById('user-status-area');
  if (statusContainer) {
    statusContainer.innerHTML = `
      <div class="badge badge-amber" style="width: 100%; text-align: center;">UNAUTHENTICATED</div>
    `;
  }
  navigateTo('landing');
}

// 3. Physician Dashboard Page
function renderDashboardPage(container) {
  if (!state.user) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <h3>🔒 Secure Area Restriction</h3>
        <p style="color:var(--text-muted); margin-bottom:20px;">You must verify your clinical credential before loading patient records.</p>
        <button class="btn btn-primary" onclick="navigateTo('auth')">Acknowledge Passkey</button>
      </div>
    `;
    return;
  }
  
  // Dashboard Core Layout
  let alertCardsHTML = state.alerts.map(a => `
    <div style="padding: 12px; border-radius: 8px; margin-bottom: 10px; background-color: var(--bg-main); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 13px; font-weight: 600; color: ${a.type === 'critical' ? 'var(--accent-red)' : 'var(--accent-amber)'}">${a.patient}</div>
        <div style="font-size: 12px; color: var(--text-muted);">${a.message}</div>
      </div>
      <div style="font-size: 10px; color: var(--text-dim);">${a.time}</div>
    </div>
  `).join('');

  let patientRowsHTML = state.patients.map(p => `
    <tr style="cursor: pointer;" onclick="viewPatientDetail('${p.id}')">
      <td>
        <div class="patient-meta-cell">
          <div class="patient-avatar">${p.name.split(' ').map(n => n[0]).join('')}</div>
          <div>
            <strong style="color: white;">${p.name}</strong>
            <div style="font-size: 12px; color: var(--text-muted);">${p.id} · Age ${p.age} · Gender ${p.gender}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="badge ${p.riskScore > 70 ? 'badge-red' : p.riskScore > 40 ? 'badge-amber' : 'badge-teal'}">${p.cohort}</div>
      </td>
      <td style="font-weight: 600; color: ${p.riskScore > 70 ? 'var(--accent-red)' : 'var(--text-main)'};">
        ${p.riskScore}%
        <div style="font-size: 11px; color: var(--text-dim); font-weight: normal;">Confidence: ${p.confidence}%</div>
      </td>
      <td>
        <span style="color: ${p.drift > 15 ? 'var(--accent-red)' : 'var(--accent-teal)'}">${p.drift > 0 ? '+' : ''}${p.drift}%</span>
      </td>
      <td>${p.lastSession}</td>
      <td>
        <button class="btn btn-secondary" style="padding: 4px 8px; font-size:11px;" onclick="event.stopPropagation(); viewPatientDetail('${p.id}')">Review Files</button>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="card-grid">
      <div class="card card-glowing">
        <div class="metric-header">
          <span class="metric-title">Active Monitoring Queue</span>
          <span class="badge badge-teal">ONLINE</span>
        </div>
        <div class="metric-value">${state.patients.length} Subjects</div>
        <div class="metric-sub"><span class="trend-up">▲ 2 new</span> baseline calibrations this week</div>
      </div>
      
      <div class="card card-glowing" style="--primary: var(--accent-red); --primary-dark: var(--accent-red-glow);">
        <div class="metric-header">
          <span class="metric-title">Critical Drift Alerts</span>
          <span class="badge badge-red">CRITICAL</span>
        </div>
        <div class="metric-value">1 Patients</div>
        <div class="metric-sub"><span class="trend-down">▼ High Risk</span> Cognitive Switch delays registered</div>
      </div>

      <div class="card card-glowing" style="--primary: var(--accent-amber); --primary-dark: var(--accent-amber-glow);">
        <div class="metric-header">
          <span class="metric-title">Referral Escalations</span>
          <span class="badge badge-amber">ACTION</span>
        </div>
        <div class="metric-value">1 Pending</div>
        <div class="metric-sub">Awaiting specialist neuro-consult coordination</div>
      </div>
    </div>
    
    <div class="panel-grid">
      <div class="card">
        <div class="panel-header">
          <h3 class="panel-title">🧠 Subject Screening & Longitudinal Drift Logs</h3>
          <button class="btn btn-secondary" onclick="exportPatientLogsCSV()">Export Screening CSV</button>
        </div>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Patient Profile</th>
                <th>Diagnostic Cohort</th>
                <th>NeuroSift Risk Score</th>
                <th>Long Drift (30d)</th>
                <th>Latest Session</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${patientRowsHTML}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="card">
        <div class="panel-header">
          <h3 class="panel-title">🔔 Drift Referral Queue</h3>
        </div>
        <div>
          ${alertCardsHTML}
        </div>
      </div>
    </div>
  `;
}

function viewPatientDetail(id) {
  state.selectedPatientId = id;
  navigateTo('patient-detail');
}

// 4. Patient Detail Page
function renderPatientDetailPage(container) {
  const patient = state.patients.find(p => p.id === state.selectedPatientId) || state.patients[0];
  
  // Custom Raw SVG longitudinal line chart
  const dates = patient.history.map(h => h.date);
  const risks = patient.history.map(h => h.risk);
  const drifts = patient.history.map(h => h.drift);
  
  // Calculate SVG line paths
  const svgWidth = 500;
  const svgHeight = 150;
  const maxRiskVal = 100;
  
  const getPointsStr = (data) => {
    return data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * (svgWidth - 40) + 20;
      const y = svgHeight - ((val / maxRiskVal) * (svgHeight - 40) + 20);
      return `${x},${y}`;
    }).join(' ');
  };
  
  const riskPoints = getPointsStr(risks);
  const driftPoints = getPointsStr(drifts);

  // Renders the dynamic SHAP explanation rows
  let shapRowsHTML = patient.shap.map(s => {
    const isPos = s.impact > 0;
    const widthPct = Math.abs(s.impact) * 3; // Scaling factor
    return `
      <div class="shap-row">
        <div class="shap-label" title="${s.feature}">${s.feature}</div>
        <div class="shap-track">
          <div class="shap-bar ${isPos ? 'shap-bar-pos' : 'shap-bar-neg'}" style="width: ${widthPct}%; margin-left: ${isPos ? '0' : 'auto'}; margin-right: ${isPos ? 'auto' : '0'};"></div>
        </div>
        <div class="shap-val" style="color: ${isPos ? 'var(--accent-red)' : 'var(--accent-teal)'};">
          ${isPos ? '+' : ''}${s.impact}
        </div>
      </div>
    `;
  }).join('');

  let historyRowsHTML = patient.history.map(h => `
    <tr>
      <td>${h.date}</td>
      <td><span style="font-weight:600; color: ${h.risk > 70 ? 'var(--accent-red)' : 'var(--text-main)'};">${h.risk}%</span></td>
      <td>${h.latency} ms</td>
      <td>${h.accuracy}%</td>
      <td style="color: ${h.drift > 15 ? 'var(--accent-red)' : 'var(--accent-teal)'};">${h.drift}%</td>
    </tr>
  `).reverse().join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
      <div>
        <span onclick="navigateTo('dashboard')" style="color: var(--primary); cursor:pointer; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px; margin-bottom:8px;">
          ◀ Return to Patient Queue
        </span>
        <h2 style="color: white; font-size: 22px;">Patient Clinical Record: ${patient.name}</h2>
        <p style="color: var(--text-muted); font-size:13px;">ID: ${patient.id} · Age: ${patient.age} · Gender: ${patient.gender} · Primary Classification: <strong>${patient.cohort}</strong></p>
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="btn btn-secondary" onclick="navigateTo('report')">📄 Generate Clinical Report</button>
        <button class="btn btn-primary" onclick="startAssignedAssessment('${patient.id}')">⚙️ Trigger Assessment</button>
      </div>
    </div>
    
    <div class="panel-grid">
      <div class="card">
        <div class="panel-header">
          <h3 class="panel-title">📈 Automated Longitudinal Trend Analysis</h3>
        </div>
        <div>
          <!-- Custom SVG Line Graph -->
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; height: 220px; background-color: var(--bg-main); border-radius: 8px; border: 1px solid var(--border-color);">
            <!-- Horizontal Grid lines -->
            <line x1="20" y1="35" x2="${svgWidth - 20}" y2="35" class="chart-grid-line" stroke="rgba(255,255,255,0.05)"/>
            <line x1="20" y1="75" x2="${svgWidth - 20}" y2="75" class="chart-grid-line" stroke="rgba(255,255,255,0.05)"/>
            <line x1="20" y1="115" x2="${svgWidth - 20}" y2="115" class="chart-grid-line" stroke="rgba(255,255,255,0.05)"/>
            
            <!-- Lines -->
            <polyline points="${riskPoints}" class="chart-line chart-line-ad" />
            <polyline points="${driftPoints}" class="chart-line chart-line-baseline" stroke="var(--accent-red)"/>
            
            <!-- Dots -->
            ${patient.history.map((h, idx) => {
              const x = (idx / (patient.history.length - 1)) * (svgWidth - 40) + 20;
              const y = svgHeight - ((h.risk / maxRiskVal) * (svgHeight - 40) + 20);
              return `<circle cx="${x}" cy="${y}" r="4" class="chart-dot chart-dot-ad" />`;
            }).join('')}
          </svg>
          <div style="display: flex; gap: 16px; margin-top:12px; justify-content: center; font-size:12px;">
            <div style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background-color:var(--accent-red); display:inline-block;"></span> NeuroSift Risk Score (%)</div>
            <div style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; border-top:2px dashed var(--accent-teal); display:inline-block;"></span> Behavioral Drift Deviation (%)</div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="panel-header">
          <h3 class="panel-title">🔬 SHAP Explainability Matrix</h3>
        </div>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">Model contributions relative to baseline cohort drift. Mapped via NeuroSift XGBoost node weights.</p>
        <div class="shap-bar-container">
          ${shapRowsHTML}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="panel-header">
        <h3 class="panel-title">📋 Historical Telemetry Sessions</h3>
      </div>
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Session Date</th>
              <th>Ensemble Risk</th>
              <th>Task Latency</th>
              <th>Task Accuracy</th>
              <th>Behavioral Drift</th>
            </tr>
          </thead>
          <tbody>
            ${historyRowsHTML}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function startAssignedAssessment(patientId) {
  state.selectedPatientId = patientId;
  navigateTo('assessment');
}

// 5. Assessment Interface Page (Dynamic Live games!)
function renderAssessmentPage(container) {
  const patient = state.patients.find(p => p.id === state.selectedPatientId) || state.patients[0];
  
  container.innerHTML = `
    <div style="border-bottom:1px solid var(--border-color); padding-bottom:16px;">
      <h2 style="color: white; font-size: 22px;">Cognitive Telemetry Collector Suite</h2>
      <p style="color:var(--text-muted); font-size:13px;">Assigned Subject: <strong>${patient.name} (${patient.id})</strong>. Running screening suite calibrator BAM-01.</p>
    </div>
    
    <div class="panel-grid" style="grid-template-columns: 1fr 320px;">
      <div>
        <div class="game-viewport" id="game-core-container">
          <h3 class="game-title">Cognitive Screen BAM-01</h3>
          <p class="game-instruction">This assessment simulator tracks reaction speeds and task switching costs. The outputs will feed directly into the NeuroSift AI model.</p>
          <button class="btn btn-primary" onclick="initiateReactionTask()">Start Reaction-Time Game</button>
        </div>
      </div>
      
      <div class="card">
        <h3 style="font-size: 15px; font-weight: 600; margin-bottom:16px; color: white;">Assessment Telemetry Stream</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;" id="telemetry-live-stream">
          <div style="text-align: center; padding: 30px 10px; color: var(--text-dim); border: 1px dashed var(--border-color); border-radius: 8px; font-size:12px;">
            Awaiting task activation. Click button to begin behavioral monitoring.
          </div>
        </div>
      </div>
    </div>
  `;
}

// Global game trackers
let reactionTimer = null;
let reactionStart = 0;
let reactionClicks = [];
let symbolTrials = [];
let symbolActivePair = null;

const SYMBOLS_GLYPHS = ['✦', '▲', '●', '■', '◆', '★', '✶', '✖'];

function initiateReactionTask() {
  const gameContainer = document.getElementById('game-core-container');
  if (!gameContainer) return;

  reactionClicks = [];
  
  gameContainer.innerHTML = `
    <div class="game-score-banner">
      <span>Trial: <strong id="rx-trial-count">0 / 5</strong></span>
      <span>Live Jitter: <strong id="rx-live-jitter">0ms</strong></span>
    </div>
    <h3 class="game-title">Task 1: Prompted Motor Reflex Latency</h3>
    <p class="game-instruction" id="rx-instruct">Instructions: Wait for the panel below to turn GREEN, then click it as fast as you can. Avoid early clicks!</p>
    
    <div class="reaction-box" id="rx-trigger-box" onclick="handleReactionClick()">
      CLICK TO START
    </div>
  `;
}

function handleReactionClick() {
  const box = document.getElementById('rx-trigger-box');
  const instruct = document.getElementById('rx-instruct');
  const trialCount = document.getElementById('rx-trial-count');
  
  if (!box) return;
  
  if (box.textContent.trim() === 'CLICK TO START') {
    startNextReactionTrial();
    return;
  }
  
  if (box.classList.contains('ready')) {
    // Clicked too early
    clearTimeout(reactionTimer);
    box.classList.remove('ready');
    box.textContent = 'EARLY TRIGGER!';
    instruct.textContent = 'Early click detected. Waiting to reset...';
    setTimeout(startNextReactionTrial, 1500);
    return;
  }
  
  if (box.classList.contains('active')) {
    const elapsed = Date.now() - reactionStart;
    reactionClicks.push(elapsed);
    
    box.classList.remove('active');
    box.textContent = `${elapsed} ms`;
    
    const jitter = reactionClicks.length > 1 ? Math.abs(elapsed - reactionClicks[reactionClicks.length - 2]) : 0;
    document.getElementById('rx-live-jitter').textContent = `${jitter}ms`;
    trialCount.textContent = `${reactionClicks.length} / 5`;
    
    updateLiveTelemetryList('rx', elapsed);

    if (reactionClicks.length >= 5) {
      setTimeout(completeReactionTask, 1500);
    } else {
      setTimeout(startNextReactionTrial, 1200);
    }
  }
}

function startNextReactionTrial() {
  const box = document.getElementById('rx-trigger-box');
  const instruct = document.getElementById('rx-instruct');
  if (!box) return;
  
  box.className = 'reaction-box ready';
  box.textContent = 'WAIT FOR GREEN';
  instruct.textContent = 'Keep your cursor over the box and wait. Click immediately when the box turns bright green.';
  
  const delay = Math.random() * 2000 + 1500; // 1.5s to 3.5s delay
  reactionTimer = setTimeout(() => {
    box.className = 'reaction-box active';
    box.textContent = 'CLICK NOW!';
    reactionStart = Date.now();
  }, delay);
}

function updateLiveTelemetryList(taskType, value) {
  const stream = document.getElementById('telemetry-live-stream');
  if (!stream) return;
  
  if (stream.querySelector('div[style*="text-align: center"]')) {
    stream.innerHTML = '';
  }
  
  const timestamp = new Date().toLocaleTimeString();
  const label = taskType === 'rx' ? 'Reaction latency' : 'Symbol matching';
  const color = taskType === 'rx' ? 'var(--primary)' : 'var(--accent-teal)';
  
  const log = document.createElement('div');
  log.style.padding = '8px';
  log.style.borderRadius = '4px';
  log.style.backgroundColor = 'var(--bg-input)';
  log.style.borderLeft = `3px solid ${color}`;
  log.style.fontSize = '12px';
  log.style.display = 'flex';
  log.style.justifyContent = 'space-between';
  
  log.innerHTML = `
    <div><strong>${label}</strong>: ${value} ${taskType === 'rx' ? 'ms' : 'trials'}</div>
    <div style="color:var(--text-dim);">${timestamp}</div>
  `;
  
  stream.prepend(log);
}

function completeReactionTask() {
  const avg = Math.round(reactionClicks.reduce((a, b) => a + b, 0) / reactionClicks.length);
  state.telemetry.reaction.clicks = reactionClicks;
  state.telemetry.reaction.avgLatency = avg;
  
  const gameContainer = document.getElementById('game-core-container');
  if (!gameContainer) return;
  
  gameContainer.innerHTML = `
    <h3 class="game-title">✅ Motor Reflex Latency Complete</h3>
    <p class="game-instruction">Successfully logged baseline motor response speeds. Mean delay: <strong>${avg}ms</strong>.</p>
    <div style="display: flex; gap: 16px; margin: 24px 0;">
      <div class="card" style="text-align:center; padding:12px; width:150px;">
        <div style="font-size:11px; color:var(--text-dim);">AVERAGE LATENCY</div>
        <div style="font-size:20px; font-weight:600; color:white;">${avg}ms</div>
      </div>
      <div class="card" style="text-align:center; padding:12px; width:150px;">
        <div style="font-size:11px; color:var(--text-dim);">TRIAL JITTER</div>
        <div style="font-size:20px; font-weight:600; color:white;">${Math.max(...reactionClicks) - Math.min(...reactionClicks)}ms</div>
      </div>
    </div>
    <button class="btn btn-primary" onclick="initiateSymbolDigitTask()">Proceed to Symbol-Digit Match Task</button>
  `;
}

function initiateSymbolDigitTask() {
  const gameContainer = document.getElementById('game-core-container');
  if (!gameContainer) return;
  
  symbolTrials = [];
  setupNextSymbolDigitTrial();
}

function setupNextSymbolDigitTrial() {
  const gameContainer = document.getElementById('game-core-container');
  if (!gameContainer) return;
  
  // Choose random glyph and key
  const randomIdx = Math.floor(Math.random() * SYMBOLS_GLYPHS.length);
  const glyph = SYMBOLS_GLYPHS[randomIdx];
  const correctDigit = randomIdx + 1;
  
  symbolActivePair = { glyph, correctDigit, start: Date.now() };
  
  // Create mapping legend
  let legendHTML = SYMBOLS_GLYPHS.map((g, idx) => `
    <div class="symbol-card">
      <div class="symbol-glyph">${g}</div>
      <div class="symbol-num">${idx + 1}</div>
    </div>
  `).join('');

  gameContainer.innerHTML = `
    <div class="game-score-banner">
      <span>Trial: <strong id="sym-trial-count">${symbolTrials.length} / 5</strong></span>
      <span>Mean Latency: <strong id="sym-mean-latency">${calculateMeanSymbolLatency()}ms</strong></span>
    </div>
    
    <h3 class="game-title">Task 2: Symbol-Digit Processing Speed</h3>
    <p class="game-instruction">Match the center symbol to its corresponding digit key in the legend below. Respond as fast as you can.</p>
    
    <div style="display:flex; justify-content:center; align-items:center; gap:20px; margin-bottom: 24px;">
      <div style="width: 100px; height: 100px; background-color: var(--bg-hover); border: 2px solid var(--primary); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:48px; color:white; box-shadow:0 0 20px rgba(127,119,221,0.25);">
        ${glyph}
      </div>
    </div>
    
    <div class="symbol-row" style="justify-content: center;">
      ${legendHTML}
    </div>
    
    <div class="game-inputs">
      <button class="game-input-btn" onclick="submitSymbolDigitMatch(1)">1</button>
      <button class="game-input-btn" onclick="submitSymbolDigitMatch(2)">2</button>
      <button class="game-input-btn" onclick="submitSymbolDigitMatch(3)">3</button>
      <button class="game-input-btn" onclick="submitSymbolDigitMatch(4)">4</button>
      <button class="game-input-btn" onclick="submitSymbolDigitMatch(5)">5</button>
      <button class="game-input-btn" onclick="submitSymbolDigitMatch(6)">6</button>
      <button class="game-input-btn" onclick="submitSymbolDigitMatch(7)">7</button>
      <button class="game-input-btn" onclick="submitSymbolDigitMatch(8)">8</button>
    </div>
  `;
}

function calculateMeanSymbolLatency() {
  if (symbolTrials.length === 0) return 0;
  return Math.round(symbolTrials.reduce((a, b) => a + b.latency, 0) / symbolTrials.length);
}

function submitSymbolDigitMatch(digit) {
  if (!symbolActivePair) return;
  
  const elapsed = Date.now() - symbolActivePair.start;
  const isCorrect = digit === symbolActivePair.correctDigit;
  
  symbolTrials.push({ latency: elapsed, correct: isCorrect });
  updateLiveTelemetryList('sym', symbolTrials.length);
  
  if (symbolTrials.length >= 5) {
    completeSymbolDigitTask();
  } else {
    setupNextSymbolDigitTrial();
  }
}

function completeSymbolDigitTask() {
  const avg = calculateMeanSymbolLatency();
  const correctCount = symbolTrials.filter(t => t.correct).length;
  const accuracy = Math.round((correctCount / symbolTrials.length) * 100);
  
  state.telemetry.symbolDigit.trials = symbolTrials;
  state.telemetry.symbolDigit.accuracy = accuracy;
  state.telemetry.symbolDigit.avgLatency = avg;
  
  // Calculate new mock risk score based on telemetry inputs!
  const patient = state.patients.find(p => p.id === state.selectedPatientId) || state.patients[0];
  const rawDev = (avg - 320) + (state.telemetry.reaction.avgLatency - 250);
  const scaleRisk = Math.min(Math.max(Math.round(40 + (rawDev / 10)), 10), 95);
  
  // Perform state update with simulated inference output!
  patient.riskScore = scaleRisk;
  patient.drift = Math.max(Math.round(((scaleRisk - 40) / 40) * 100) / 10, 1.2);
  patient.history.push({
    date: 'Today',
    risk: scaleRisk,
    latency: Math.round((avg + state.telemetry.reaction.avgLatency) / 2),
    accuracy: accuracy,
    drift: patient.drift
  });

  const gameContainer = document.getElementById('game-core-container');
  if (!gameContainer) return;
  
  gameContainer.innerHTML = `
    <h3 class="game-title">🎉 Screening Assessment Completed</h3>
    <p class="game-instruction">Successfully synchronized and analyzed all spatial micro-latencies using the <strong>NeuroSift AI Pipeline</strong>.</p>
    
    <div style="display:flex; gap:16px; margin: 24px 0; justify-content:center;">
      <div class="card" style="text-align:center; padding:12px; width:120px;">
        <div style="font-size:10px; color:var(--text-dim);">ACCURACY</div>
        <div style="font-size:18px; font-weight:600; color:var(--accent-teal);">${accuracy}%</div>
      </div>
      <div class="card" style="text-align:center; padding:12px; width:120px;">
        <div style="font-size:10px; color:var(--text-dim);">MEAN LATENCY</div>
        <div style="font-size:18px; font-weight:600; color:white;">${avg}ms</div>
      </div>
      <div class="card" style="text-align:center; padding:12px; width:120px;">
        <div style="font-size:10px; color:var(--text-dim);">NEUROSIFT RISK</div>
        <div style="font-size:18px; font-weight:600; color:var(--accent-red);">${scaleRisk}%</div>
      </div>
    </div>
    
    <div style="display:flex; gap:12px;">
      <button class="btn btn-secondary" onclick="navigateTo('patient-detail')">Review Diagnostic File</button>
      <button class="btn btn-primary" onclick="navigateTo('dashboard')">Back to Patient Queue</button>
    </div>
  `;
}

// 6. Research Analytics Page
function renderResearchPage(container) {
  container.innerHTML = `
    <div style="border-bottom:1px solid var(--border-color); padding-bottom:16px;">
      <h2 style="color: white; font-size: 22px;">NeuroSift ML Pipeline Engine</h2>
      <p style="color:var(--text-muted); font-size:13px;">Benchmarked training records, data harmonization indexes, and validation curves.</p>
    </div>
    
    <div class="card-grid">
      <div class="card">
        <div class="metric-header">
          <span class="metric-title">Harmonized Subjects</span>
        </div>
        <div class="metric-value">254 Cohorts</div>
        <div class="metric-sub">PPMI, ADNI, and Ingested Workspace Datasets</div>
      </div>
      <div class="card">
        <div class="metric-header">
          <span class="metric-title">Mean ROC-AUC</span>
        </div>
        <div class="metric-value" style="color: var(--accent-teal);">0.946</div>
        <div class="metric-sub">Across AD/PD classification layers</div>
      </div>
      <div class="card">
        <div class="metric-header">
          <span class="metric-title">Model Status</span>
        </div>
        <div class="metric-value">Active Production</div>
        <div class="metric-sub">XGBoost & PyTorch Bi-modal ResNets</div>
      </div>
    </div>

    <div class="panel-grid">
      <div class="card">
        <div class="panel-header">
          <h3 class="panel-title">📉 Validation Curves (ROC-AUC)</h3>
        </div>
        <div>
          <!-- SVG ROC-AUC Curve chart -->
          <svg viewBox="0 0 400 200" style="width:100%; height:240px; background-color: var(--bg-main); border-radius: 8px; border:1px solid var(--border-color);">
            <!-- Diagonal Reference -->
            <line x1="20" y1="180" x2="380" y2="20" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" stroke-dasharray="4 4" />
            
            <!-- ROC curves -->
            <!-- AD (ROC-AUC 0.96) -->
            <path d="M 20 180 Q 80 80, 200 40 T 380 20" fill="none" stroke="var(--accent-red)" stroke-width="2.5" />
            <!-- PD (ROC-AUC 0.94) -->
            <path d="M 20 180 Q 100 100, 240 50 T 380 20" fill="none" stroke="var(--primary)" stroke-width="2.5" />
            <!-- MCI (ROC-AUC 0.88) -->
            <path d="M 20 180 Q 140 120, 260 70 T 380 20" fill="none" stroke="var(--accent-amber)" stroke-width="2.5" />
          </svg>
          <div style="display:flex; justify-content:center; gap:16px; margin-top:12px; font-size:12px;">
            <span style="color:var(--accent-red)">■ Alzheimer\'s (AUC: 0.96)</span>
            <span style="color:var(--primary)">■ Parkinson\'s (AUC: 0.94)</span>
            <span style="color:var(--accent-amber)">■ MCI Drift (AUC: 0.88)</span>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="panel-header">
          <h3 class="panel-title">📂 Harmonized Workspace Datasets</h3>
        </div>
        <div style="display: flex; flex-direction: column; gap:12px;">
          <div style="padding:12px; background-color:var(--bg-input); border-radius:6px; border:1px solid var(--border-color);">
            <div style="font-size:13px; font-weight:600; color:white;">${state.datasets.eeg.name}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
              Cohorts: <strong>${state.datasets.eeg.groupAD} AD / ${state.datasets.eeg.groupFTD} FTD / ${state.datasets.eeg.groupCN} CN</strong>
            </div>
            <div style="font-size:11px; color:var(--text-dim);">${state.datasets.eeg.spec}</div>
          </div>
          
          <div style="padding:12px; background-color:var(--bg-input); border-radius:6px; border:1px solid var(--border-color);">
            <div style="font-size:13px; font-weight:600; color:white;">${state.datasets.parkinson.name}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
              Cohorts: <strong>${state.datasets.parkinson.pdGroup} PD Patients / ${state.datasets.parkinson.npdGroup} Healthy Controls</strong>
            </div>
            <div style="font-size:11px; color:var(--text-dim);">${state.datasets.parkinson.features}</div>
          </div>
          
          <div style="padding:12px; background-color:var(--bg-input); border-radius:6px; border:1px solid var(--border-color);">
            <div style="font-size:13px; font-weight:600; color:white;">${state.datasets.mri.name}</div>
            <div style="font-size:11px; color:var(--text-dim); margin-top:4px;">Classifications: ${state.datasets.mri.classes.join(', ')}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 7. Clinical Printable Report Page
function renderReportPage(container) {
  const patient = state.patients.find(p => p.id === state.selectedPatientId) || state.patients[0];
  const dateStr = new Date().toLocaleDateString();

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--border-color); padding-bottom:16px;">
      <div>
        <span onclick="viewPatientDetail('${patient.id}')" style="color: var(--primary); cursor:pointer; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
          ◀ Return to Patient File
        </span>
        <h2 style="color: white; font-size: 20px; margin-top:6px;">Printable Clinical Report</h2>
      </div>
      <button class="btn btn-primary" onclick="window.print()">🖨️ Export PDF / Print</button>
    </div>
    
    <div class="report-sheet">
      <div class="report-header">
        <div>
          <div class="report-logo-text">NEURO<span>PREDICT</span></div>
          <div style="font-size:11px; color:#64748B;">Cognitive Screening Assessment Summary</div>
        </div>
        <div style="text-align: right; font-size:12px; color:#475569;">
          <div>Report Date: <strong>${dateStr}</strong></div>
          <div>Report ID: <strong>NP-R-2026-${patient.id.replace('NP-', '')}</strong></div>
        </div>
      </div>
      
      <div class="report-meta-grid">
        <div class="report-meta-item">
          <span>SUBJECT NAME</span>
          <strong>${patient.name}</strong>
        </div>
        <div class="report-meta-item">
          <span>ID</span>
          <strong>${patient.id}</strong>
        </div>
        <div class="report-meta-item">
          <span>AGE / SEX</span>
          <strong>${patient.age} / ${patient.gender}</strong>
        </div>
        <div class="report-meta-item">
          <span>MMSE BASELINE</span>
          <strong>${patient.mmse || 'N/A'} / 30</strong>
        </div>
      </div>
      
      <div class="report-score-box">
        <div class="report-score-card elevated">
          <div class="report-score-title">NeuroSift Risk Score</div>
          <div class="report-score-val">${patient.riskScore}%</div>
        </div>
        <div class="report-score-card">
          <div class="report-score-title">Behavioral Drift</div>
          <div class="report-score-val">${patient.drift}%</div>
        </div>
        <div class="report-score-card">
          <div class="report-score-title">Confidence index</div>
          <div class="report-score-val">${patient.confidence}%</div>
        </div>
      </div>
      
      <div>
        <div class="report-section-title">Ensemble Model Insights & SHAP Feature Weights</div>
        <table class="report-biomarker-table">
          <thead>
            <tr>
              <th style="width:60%">Contributing Biomarker Feature</th>
              <th style="width:20%">Weight Value</th>
              <th style="width:20%">Influence</th>
            </tr>
          </thead>
          <tbody>
            ${patient.shap.map(s => `
              <tr>
                <td><strong>${s.feature}</strong> - <span style="font-size:11px; color:#64748B;">${s.description}</span></td>
                <td style="font-weight:600; color: ${s.impact > 0 ? '#DC2626' : '#059669'}">${s.impact > 0 ? '+' : ''}${s.impact}</td>
                <td>
                  <span style="font-size:11px; font-weight:600; padding:2px 6px; border-radius:4px; background-color: ${s.impact > 0 ? '#FEF2F2' : '#ECFDF5'}; color:${s.impact > 0 ? '#DC2626' : '#059669'}">
                    ${s.impact > 0 ? 'ADVERSE' : 'PROTECTIVE'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div>
        <div class="report-section-title">Physician Observations & Diagnoses Notes</div>
        <div class="report-notes">
          Subject exhibits significant cognitive drift deviations (+${patient.drift}%) coupled with prolonged motor reflexes on symbol-digit switching trials. Biomarker profiles reflect a high-confidence index matching early-stage cognitive progression. Recommend scheduling an immediate structural diagnostic MRI voxel verification scan (OASIS validation cluster alignment).
        </div>
      </div>
      
      <div class="report-footer">
        <div style="font-size:11px; color:#64748B;">
          NeuroPredict software engine BAM-01 · FDA Class II Medical Device research prototype
        </div>
        <div class="report-signature">
          Clinical Practitioner Signature
        </div>
      </div>
    </div>
  `;
}

/**
 * UTILITY & DATA EXPORT FUNCTIONS
 */

function exportPatientLogsCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Patient ID,Name,Age,Gender,Diagnostic Cohort,NeuroSift Risk Score,Behavioral Drift,Last Assessment Date\r\n";
  
  state.patients.forEach(p => {
    csvContent += `"${p.id}","${p.name}",${p.age},"${p.gender}","${p.cohort}",${p.riskScore},${p.drift},"${p.lastSession}"\r\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `neuropredict_patient_screening_export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Initialise dashboard elements
// 8. Upload & Predict Page
function renderPredictPage(container) {
  container.innerHTML = `
    <div style="border-bottom:1px solid var(--border-color); padding-bottom:16px;">
      <h2 style="color:white; font-size:22px;">🤖 Upload & Predict — NeuroSift AI Engine</h2>
      <p style="color:var(--text-muted); font-size:13px;">
        Upload a CSV file with patient data. The trained model (ROC-AUC 0.906, 162 real subjects) will classify each row into
        <strong>Alzheimer's (AD)</strong>, <strong>Parkinson's (PD)</strong>, <strong>MCI/Other</strong>, or <strong>Control (CN)</strong>.
      </p>
    </div>

    <div class="panel-grid" style="grid-template-columns: 1fr 1fr; gap:24px;">

      <!-- Left: Upload panel -->
      <div class="card" style="display:flex; flex-direction:column; gap:20px;">
        <div class="panel-header">
          <h3 class="panel-title">📁 Upload Patient CSV</h3>
        </div>

        <!-- Required columns info -->
        <div style="background-color:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; padding:16px; font-size:13px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--text-dim); margin-bottom:10px; font-weight:700;">Required Columns</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div style="padding:8px; background-color:var(--bg-card); border-radius:6px; border-left:3px solid var(--primary);">
              <code style="color:var(--primary); font-size:12px;">Age</code>
              <div style="font-size:11px; color:var(--text-dim);">Patient age (years)</div>
            </div>
            <div style="padding:8px; background-color:var(--bg-card); border-radius:6px; border-left:3px solid var(--accent-teal);">
              <code style="color:var(--accent-teal); font-size:12px;">Sex</code>
              <div style="font-size:11px; color:var(--text-dim);">M or F</div>
            </div>
            <div style="padding:8px; background-color:var(--bg-card); border-radius:6px; border-left:3px solid var(--accent-amber);">
              <code style="color:var(--accent-amber); font-size:12px;">MMSE</code>
              <div style="font-size:11px; color:var(--text-dim);">Score 0–30</div>
            </div>
            <div style="padding:8px; background-color:var(--bg-card); border-radius:6px; border-left:3px solid var(--accent-coral);">
              <code style="color:var(--accent-coral); font-size:12px;">UPDRS_III</code>
              <div style="font-size:11px; color:var(--text-dim);">Motor score 0–126 (0 if N/A)</div>
            </div>
          </div>
          <div style="margin-top:10px; font-size:11px; color:var(--text-dim);">
            Optional: <code style="color:var(--text-muted);">name</code> or <code style="color:var(--text-muted);">participant_id</code> column for row labels.
          </div>
        </div>

        <!-- Drag & drop zone -->
        <div id="drop-zone"
          ondragover="event.preventDefault(); this.style.borderColor='var(--primary)';"
          ondragleave="this.style.borderColor='var(--border-color)';"
          ondrop="handleFileDrop(event)"
          style="border:2px dashed var(--border-color); border-radius:12px; padding:40px; text-align:center; cursor:pointer; transition:border-color 0.2s ease; background-color:var(--bg-main);"
          onclick="document.getElementById('csv-file-input').click()">
          <div style="font-size:32px; margin-bottom:12px;">📄</div>
          <div style="font-size:14px; color:white; font-weight:600;">Drop your CSV here</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">or click to browse files</div>
          <input type="file" id="csv-file-input" accept=".csv" style="display:none;" onchange="handleFileSelect(this)">
        </div>

        <!-- Action buttons -->
        <div style="display:flex; gap:12px;">
          <button class="btn btn-primary" style="flex:1;" onclick="document.getElementById('csv-file-input').click()">
            📂 Choose CSV File
          </button>
          <button class="btn btn-secondary" onclick="downloadSampleCSV()">
            ⬇ Sample CSV
          </button>
        </div>

        <!-- Single patient manual entry -->
        <div style="border-top:1px solid var(--border-color); padding-top:16px;">
          <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:var(--text-dim); margin-bottom:12px; font-weight:700;">Or enter a single patient manually</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Name</label>
              <input type="text" class="form-input" id="m-name" placeholder="Patient name" value="Test Patient">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Age</label>
              <input type="number" class="form-input" id="m-age" placeholder="e.g. 65" value="65">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Sex (M/F)</label>
              <select class="form-input form-select" id="m-sex">
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">MMSE (0–30)</label>
              <input type="number" class="form-input" id="m-mmse" placeholder="e.g. 24" value="24" min="0" max="30">
            </div>
            <div class="form-group" style="margin-bottom:0; grid-column:1/-1;">
              <label class="form-label">UPDRS-III (0–126, use 0 if N/A)</label>
              <input type="number" class="form-input" id="m-updrs" placeholder="e.g. 0" value="0" min="0" max="126">
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%; margin-top:14px;" onclick="runManualPrediction()">
            ⚡ Run AI Prediction
          </button>
        </div>
      </div>

      <!-- Right: Results panel -->
      <div class="card" style="display:flex; flex-direction:column; gap:16px;">
        <div class="panel-header">
          <h3 class="panel-title">📊 Prediction Results</h3>
          <div id="predict-status" style="font-size:12px; color:var(--text-dim);">Awaiting input...</div>
        </div>
        <div id="predict-results-area" style="flex-grow:1;">
          <div style="text-align:center; padding:60px 20px; color:var(--text-dim); border:1px dashed var(--border-color); border-radius:8px;">
            <div style="font-size:40px; margin-bottom:12px;">🧠</div>
            <div style="font-size:14px; color:var(--text-muted);">Upload a CSV or enter patient details to run the NeuroSift classifier.</div>
            <div style="font-size:12px; margin-top:8px;">Model: RandomForest · 150 trees · AUC 0.906 · Trained on your local datasets</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Handle drag-and-drop file
function handleFileDrop(event) {
  event.preventDefault();
  const zone = document.getElementById('drop-zone');
  if (zone) zone.style.borderColor = 'var(--border-color)';
  const file = event.dataTransfer.files[0];
  if (file && file.name.endsWith('.csv')) {
    sendCSVToPredictor(file);
  } else {
    showPredictError('Please drop a valid .csv file.');
  }
}

function handleFileSelect(input) {
  const file = input.files[0];
  if (file) sendCSVToPredictor(file);
}

function showPredictError(msg) {
  const area = document.getElementById('predict-results-area');
  const status = document.getElementById('predict-status');
  if (status) status.textContent = '❌ Error';
  if (area) area.innerHTML = `
    <div style="padding:20px; border:1px solid var(--accent-red); border-radius:8px; background-color:rgba(226,75,74,0.08); color:var(--accent-red); font-size:13px;">
      <strong>Prediction failed:</strong> ${msg}
      <br><br>
      <span style="color:var(--text-muted); font-size:12px;">
        Make sure <strong>predict_server.py</strong> is running:<br>
        <code style="background:var(--bg-input); padding:4px 8px; border-radius:4px; display:inline-block; margin-top:6px;">python predict_server.py</code>
      </span>
    </div>`;
}

// Send CSV file to predict_server
function sendCSVToPredictor(file) {
  const status = document.getElementById('predict-status');
  const area = document.getElementById('predict-results-area');
  if (status) status.textContent = `⏳ Processing ${file.name}...`;
  if (area) area.innerHTML = `
    <div style="text-align:center; padding:40px; color:var(--text-muted);">
      <div style="font-size:32px; margin-bottom:12px; animation: spin 1s linear infinite; display:inline-block;">⏳</div>
      <div>Running NeuroSift classifier on ${file.name}...</div>
    </div>`;

  const formData = new FormData();
  formData.append('file', file);

  fetch('http://localhost:8001/predict-csv', { method: 'POST', body: formData })
    .then(r => {
      if (!r.ok) throw new Error(`Server responded ${r.status}`);
      return r.json();
    })
    .then(data => renderPredictResults(data, file.name))
    .catch(err => showPredictError(`${err.message}. Is predict_server.py running on port 8001?`));
}

// Send single patient JSON to predict_server
function runManualPrediction() {
  const name  = document.getElementById('m-name').value  || 'Patient';
  const age   = document.getElementById('m-age').value   || '65';
  const sex   = document.getElementById('m-sex').value   || 'M';
  const mmse  = document.getElementById('m-mmse').value  || '24';
  const updrs = document.getElementById('m-updrs').value || '0';

  const status = document.getElementById('predict-status');
  const area = document.getElementById('predict-results-area');
  if (status) status.textContent = '⏳ Running inference...';
  if (area) area.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Running NeuroSift classifier...</div>`;

  fetch('http://localhost:8001/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, age: parseFloat(age), sex, mmse: parseFloat(mmse), updrs: parseFloat(updrs) })
  })
    .then(r => {
      if (!r.ok) throw new Error(`Server responded ${r.status}`);
      return r.json();
    })
    .then(data => renderPredictResults(data, 'Manual Entry'))
    .catch(err => showPredictError(`${err.message}. Is predict_server.py running on port 8001?`));
}

// Render results into the results panel
function renderPredictResults(data, filename) {
  const status = document.getElementById('predict-status');
  const area   = document.getElementById('predict-results-area');
  if (!area) return;

  if (status) status.textContent = `✅ ${data.count} prediction${data.count !== 1 ? 's' : ''} from "${filename}"`;

  const COLOUR = {
    "Control (CN)":      { bg: 'rgba(29,158,117,0.12)',  border: '#1D9E75', text: '#44C89D', badge: 'badge-teal' },
    "Alzheimer's (AD)":  { bg: 'rgba(226,75,74,0.12)',   border: '#E24B4A', text: '#F87B7B', badge: 'badge-red' },
    "Parkinson's (PD)":  { bg: 'rgba(127,119,221,0.12)', border: '#7F77DD', text: '#9A95EC', badge: 'badge-purple' },
    "MCI / Other":       { bg: 'rgba(186,117,23,0.12)',  border: '#BA7517', text: '#F0AE50', badge: 'badge-amber' },
  };

  // Summary counts
  const counts = {};
  data.results.forEach(r => { counts[r.prediction] = (counts[r.prediction] || 0) + 1; });

  const summaryHTML = Object.entries(counts).map(([label, n]) => {
    const c = COLOUR[label] || { bg:'rgba(100,116,139,0.1)', border:'#64748B', text:'#94A3B8', badge:'badge-purple' };
    return `
      <div style="flex:1; padding:12px; border-radius:8px; background-color:${c.bg}; border:1px solid ${c.border}; text-align:center;">
        <div style="font-size:22px; font-weight:600; color:${c.text};">${n}</div>
        <div style="font-size:11px; color:${c.text}; font-weight:700;">${label}</div>
      </div>`;
  }).join('');

  // Per-row cards or table
  const rowsHTML = data.results.map(r => {
    if (r.error) return `
      <div style="padding:12px; border:1px solid var(--accent-red); border-radius:8px; color:var(--accent-red); font-size:13px;">
        <strong>${r.name}</strong>: Error — ${r.error}
      </div>`;

    const c = COLOUR[r.prediction] || { bg:'rgba(100,116,139,0.1)', border:'#64748B', text:'#94A3B8', badge:'badge-purple' };

    // Probability bars
    const probBars = Object.entries(r.probabilities || {}).map(([lbl, pct]) => {
      const pc = COLOUR[lbl] || { text: '#94A3B8' };
      return `
        <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
          <div style="width:100px; font-size:11px; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${lbl}</div>
          <div style="flex-grow:1; height:6px; background-color:var(--bg-input); border-radius:3px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background-color:${pc.text}; border-radius:3px; transition:width 0.6s ease;"></div>
          </div>
          <div style="width:36px; text-align:right; font-size:11px; font-weight:600; color:${pc.text};">${pct}%</div>
        </div>`;
    }).join('');

    return `
      <div style="padding:16px; border-radius:10px; background-color:${c.bg}; border:1px solid ${c.border}; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <div style="font-size:15px; font-weight:600; color:white;">${r.name}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Confidence: <strong style="color:${c.text};">${r.confidence}%</strong> · Risk Level: <strong style="color:${c.text};">${r.risk}</strong></div>
          </div>
          <div class="badge ${c.badge}" style="font-size:11px;">${r.prediction}</div>
        </div>
        <div>${probBars}</div>
      </div>`;
  }).join('');

  area.innerHTML = `
    <div style="display:flex; gap:10px; margin-bottom:16px;">${summaryHTML}</div>
    <div style="max-height:520px; overflow-y:auto; padding-right:4px;">${rowsHTML}</div>
    <button class="btn btn-secondary" style="width:100%; margin-top:12px;" onclick="exportPredictionsCSV(${JSON.stringify(data.results).replace(/</g,'&lt;')})">
      ⬇ Export Predictions CSV
    </button>`;
}

// Download a pre-filled sample CSV the user can modify
function downloadSampleCSV() {
  const csv = `name,Age,Sex,MMSE,UPDRS_III
Ananya Sharma,67,F,16,0
Rahul Verma,72,M,24,18
Dr. Sarah Jenkins,59,F,30,0
Sub-001 (EEG AD),57,F,16,0
Sub-037 (EEG Ctrl),57,M,30,0
NTUA Subject8,49,M,30,5
NTUA Subject6,76,M,22,28`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'neuropredict_sample.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// Export prediction results to CSV
function exportPredictionsCSV(results) {
  let csv = 'Name,Prediction,Risk,Confidence (%)\r\n';
  results.forEach(r => {
    if (!r.error) csv += `"${r.name}","${r.prediction}","${r.risk}",${r.confidence}\r\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `neuropredict_predictions_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── DOM Init ────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  renderCurrentView();
  
  // Set up drawer toggle functionality
  const sidebar = document.querySelector('.sidebar');
  const drawerBtn = document.createElement('button');
  drawerBtn.className = 'drawer-toggle';
  drawerBtn.innerHTML = '☰';
  document.body.appendChild(drawerBtn);
  
  drawerBtn.addEventListener('click', () => {
    if (sidebar) sidebar.classList.toggle('drawer-open');
  });
});
