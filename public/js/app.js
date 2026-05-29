/* ── UNSEEN — Frontend Logic ── */

let currentFile = null;
let currentJobId = null;
let pollInterval = null;
let activeTab = 'upload';

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initDropzone();
  initTabs();
});

function scrollToAnalyze() {
  document.getElementById('analyze').scrollIntoView({ behavior: 'smooth' });
}

// ── TABS ──
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById('tab-' + target).classList.remove('hidden');
      activeTab = target;
    });
  });
}

// ── DROPZONE ──
function initDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  });
}

function setFile(file) {
  currentFile = file;
  document.getElementById('dropzone').style.display = 'none';
  const sel = document.getElementById('fileSelected');
  sel.style.display = 'flex';
  document.getElementById('fileName').textContent = file.name + ' (' + formatSize(file.size) + ')';
}

function removeFile() {
  currentFile = null;
  document.getElementById('dropzone').style.display = '';
  document.getElementById('fileSelected').style.display = 'none';
  document.getElementById('fileInput').value = '';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

// ── ANALYSIS ──
async function startAnalysis() {
  const clientName = document.getElementById('clientName').value.trim() || 'Client';
  const analysisType = document.getElementById('analysisType').value;
  const pastedText = document.getElementById('pastedText').value.trim();

  // Validate
  if (activeTab === 'upload' && !currentFile) {
    showError('Please upload a document first.'); return;
  }
  if (activeTab === 'paste' && pastedText.length === 0) {
    showError('Please paste some text first.'); return;
  }

  // Build form data
  const formData = new FormData();
  if (activeTab === 'upload' && currentFile) {
    formData.append('document', currentFile);
  } else {
    formData.append('pastedText', pastedText);
  }
  formData.append('clientName', clientName);
  formData.append('analysisType', analysisType);

  showStep('progress');
  resetAgentStates();

  try {
    const res = await fetch('/api/analyze', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    currentJobId = data.jobId;
    startPolling();
  } catch (err) {
    showErrorStep(err.message);
  }
}

function startPolling() {
  pollInterval = setInterval(pollStatus, 1500);
}

async function pollStatus() {
  try {
    const res = await fetch('/api/status/' + currentJobId);
    const data = await res.json();

    updateProgress(data.progress, data.stage);
    updateAgentStates(data.progress);

    if (data.status === 'complete') {
      clearInterval(pollInterval);
      // Fetch report
      const rRes = await fetch('/api/report/' + currentJobId);
      const report = await rRes.json();
      renderReport(report);
    } else if (data.status === 'error') {
      clearInterval(pollInterval);
      showErrorStep(data.error || 'Analysis failed');
    }
  } catch (err) {
    clearInterval(pollInterval);
    showErrorStep('Connection lost. Please try again.');
  }
}

// ── AGENT STATE MACHINE ──
const agentStages = [
  { id: 'agent-logic', threshold: 10 },
  { id: 'agent-bull', threshold: 25 },
  { id: 'agent-bear', threshold: 42 },
  { id: 'agent-blind', threshold: 60 },
  { id: 'agent-questions', threshold: 75 },
  { id: 'agent-synth', threshold: 88 },
];

function resetAgentStates() {
  agentStages.forEach(a => {
    const el = document.getElementById(a.id);
    el.classList.remove('active', 'done');
    el.querySelector('.agent-status').textContent = 'Queued';
  });
}

function updateAgentStates(progress) {
  agentStages.forEach((a, i) => {
    const el = document.getElementById(a.id);
    const nextThreshold = agentStages[i + 1]?.threshold ?? 100;
    if (progress >= nextThreshold) {
      el.classList.remove('active');
      el.classList.add('done');
      el.querySelector('.agent-status').textContent = 'Complete';
    } else if (progress >= a.threshold) {
      el.classList.add('active');
      el.classList.remove('done');
      el.querySelector('.agent-status').textContent = 'Running';
    }
  });
}

function updateProgress(progress, stage) {
  document.getElementById('progressBar').style.width = progress + '%';
  document.getElementById('progressStage').textContent = stage;
}

// ── RENDER REPORT ──
function renderReport(report) {
  // Title + meta
  document.getElementById('reportTitle').textContent =
    report.meta.clientName + ' — ' + report.meta.analysisType;
  document.getElementById('reportMeta').textContent =
    'Generated ' + new Date(report.meta.generatedAt).toLocaleString();
  document.getElementById('reportDate').textContent =
    new Date(report.meta.generatedAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

  // Executive Summary
  document.getElementById('execSummary').innerHTML = textToHtml(report.executiveSummary);

  // Logic Map
  renderLogicMap(report.logicMap);

  // Bull / Bear
  document.getElementById('bullCase').innerHTML = textToHtml(report.bullCase);
  document.getElementById('bearCase').innerHTML = textToHtml(report.bearCase);

  // Blind Spot
  document.getElementById('blindSpot').innerHTML = textToHtml(report.blindSpot);

  // Questions
  renderQuestions(report.questions);

  // Show report section
  document.getElementById('report').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('report').scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

function renderLogicMap(lm) {
  const el = document.getElementById('logicMap');
  el.innerHTML = '';

  if (lm.coreClaim) {
    const claim = document.createElement('div');
    claim.className = 'core-claim';
    claim.textContent = lm.coreClaim;
    el.appendChild(claim);
  }

  const sections = [
    { title: 'Key Assumptions', items: lm.keyAssumptions },
    { title: 'Hidden Assumptions', items: lm.implicitAssumptions },
    { title: 'Critical Dependencies', items: lm.criticalDependencies },
    { title: 'Structural Weaknesses', items: lm.structuralWeaknesses },
  ];

  sections.forEach(s => {
    if (!s.items || s.items.length === 0) return;
    const block = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'logic-section-title';
    title.textContent = s.title;
    block.appendChild(title);
    s.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'logic-item';
      row.innerHTML = '<span class="logic-bullet">◆</span><span>' + escapeHtml(item) + '</span>';
      block.appendChild(row);
    });
    el.appendChild(block);
  });
}

function renderQuestions(questions) {
  const el = document.getElementById('questionsList');
  el.innerHTML = '';
  if (!questions || questions.length === 0) {
    el.textContent = 'No questions generated.';
    return;
  }
  questions.forEach((q, i) => {
    const item = document.createElement('div');
    item.className = 'question-item';
    item.innerHTML = `
      <div class="question-text">${i + 1}. ${escapeHtml(q.question)}</div>
      <div class="question-meta">
        ${q.why_unasked ? `<div class="question-why"><strong>Why unasked:</strong> ${escapeHtml(q.why_unasked)}</div>` : ''}
        ${q.why_it_matters ? `<div class="question-why"><strong>Why it matters:</strong> ${escapeHtml(q.why_it_matters)}</div>` : ''}
      </div>
    `;
    el.appendChild(item);
  });
}

// ── PRINT/EXPORT ──
function printReport() {
  if (!currentJobId) { window.print(); return; }
  const btn = document.querySelector('.report-actions .btn-primary');
  const orig = btn.textContent;
  btn.textContent = 'Opening...';
  btn.disabled = true;
  window.open('/api/report/' + currentJobId + '/export', '_blank');
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
}

// ── STATE HELPERS ──
function showStep(step) {
  document.getElementById('step-input').classList.add('hidden');
  document.getElementById('step-progress').classList.add('hidden');
  document.getElementById('step-error').classList.add('hidden');
  document.getElementById('step-' + step).classList.remove('hidden');
}

function showError(msg) {
  alert('⚠ ' + msg);
}

function showErrorStep(msg) {
  showStep('error');
  document.getElementById('errorMsg').textContent = msg;
}

function resetToInput() {
  clearInterval(pollInterval);
  currentJobId = null;
  showStep('input');
  document.getElementById('report').classList.add('hidden');
  document.getElementById('analyze').scrollIntoView({ behavior: 'smooth' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Converts plain text with double-newline paragraphs into safe HTML
function textToHtml(str) {
  if (!str) return '';
  return str
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${escapeHtml(p.replace(/\n/g, ' '))}</p>`)
    .join('');
}
