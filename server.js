const path = require('path');
const dotenvResult = require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

// Startup diagnostics — always printed when server starts
console.log('─────────────────────────────────────────');
console.log('[UNSEEN] Startup diagnostics');
console.log('[UNSEEN] CWD:', process.cwd());
console.log('[UNSEEN] .env load:', dotenvResult.error ? 'FAILED — ' + dotenvResult.error.message : 'OK');
const _key = process.env.ANTHROPIC_API_KEY;
console.log('[UNSEEN] API key:', _key ? `SET (${_key.substring(0,12)}... length ${_key.length})` : 'MISSING ✗');
console.log('─────────────────────────────────────────');

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { analyzeDocument } = require('./src/agents');
const { extractText } = require('./src/extractor');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log('[HTTP]', req.method, req.url);
  next();
});
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error('Unsupported file type. Use PDF, DOCX, TXT, or MD.'));
  }
});

const jobs = new Map();

app.get('/api/ping', (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({ ok: true, apiKey: key ? `SET (len=${key.length})` : 'MISSING' });
});

app.post('/api/analyze', upload.single('document'), async (req, res) => {
  try {
    console.log('[ANALYZE] Request received');
    const { analysisType = 'strategic_review', clientName = 'Client', pastedText } = req.body;
    let rawText = '';

    if (req.file) {
      try {
        rawText = await extractText(req.file.path, req.file.originalname);
      } catch (extractErr) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Could not read file: ' + extractErr.message });
      }
      setTimeout(() => fs.unlink(req.file.path, () => {}), 24 * 60 * 60 * 1000);
    } else if (pastedText) {
      rawText = pastedText;
    } else {
      return res.status(400).json({ error: 'No document or text provided.' });
    }

    if (!rawText || rawText.trim().length < 10) {
      return res.status(400).json({ error: 'Document is empty or could not be read.' });
    }

    const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    jobs.set(jobId, {
      status: 'pending',
      progress: 0,
      stage: 'Initializing...',
      result: null,
      error: null,
      createdAt: Date.now()
    });

    res.json({ jobId });
    runAnalysis(jobId, rawText, analysisType, clientName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

app.get('/api/report/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  if (job.status !== 'complete') {
    return res.status(400).json({ error: 'Analysis not complete' });
  }
  res.json(job.result);
});

app.get('/api/report/:jobId/export', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || job.status !== 'complete') {
    return res.status(404).send('Report not found or not complete.');
  }
  const r = job.result;
  const date = new Date(r.meta.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const nl2p = s => s.split(/\n\n+/).map(p => `<p>${esc(p.trim())}</p>`).join('');

  const questionsHtml = (r.questions || []).map((q, i) => `
    <div class="q-item">
      <div class="q-text">${i+1}. ${esc(q.question)}</div>
      ${q.why_unasked ? `<div class="q-meta"><strong>Why unasked:</strong> ${esc(q.why_unasked)}</div>` : ''}
      ${q.why_it_matters ? `<div class="q-meta"><strong>Why it matters:</strong> ${esc(q.why_it_matters)}</div>` : ''}
    </div>`).join('');

  const logicHtml = [
    { title: 'Key Assumptions', items: r.logicMap.keyAssumptions },
    { title: 'Hidden Assumptions', items: r.logicMap.implicitAssumptions },
    { title: 'Critical Dependencies', items: r.logicMap.criticalDependencies },
    { title: 'Structural Weaknesses', items: r.logicMap.structuralWeaknesses },
  ].filter(s => s.items && s.items.length).map(s => `
    <div class="logic-section">
      <div class="logic-title">${s.title}</div>
      ${s.items.map(item => `<div class="logic-item">◆ ${esc(item)}</div>`).join('')}
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>UNSEEN — ${esc(r.meta.clientName)} ${esc(r.meta.analysisType)}</title>
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #faf9f7;
    --text: #1a1a18;
    --text-muted: #5a5850;
    --accent: #8a6e2a;
    --bull: #2a6e42;
    --bear: #8a2a1e;
    --blind: #4a2a8a;
    --border: #ddd9d0;
    --font-display: 'Syne', sans-serif;
    --font-body: 'Libre Baskerville', serif;
    --font-mono: 'DM Mono', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); font-size: 10.5pt; line-height: 1.75; }
  .page { max-width: 800px; margin: 0 auto; padding: 48px 56px; }

  /* Cover */
  .cover { border-bottom: 3px solid var(--text); padding-bottom: 32px; margin-bottom: 36px; }
  .cover-logo { font-family: var(--font-display); font-size: 11pt; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); margin-bottom: 24px; }
  .cover-title { font-family: var(--font-display); font-size: 26pt; font-weight: 800; line-height: 1.1; margin-bottom: 8px; }
  .cover-sub { font-family: var(--font-mono); font-size: 8.5pt; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 24px; }
  .cover-meta { font-family: var(--font-mono); font-size: 8pt; color: var(--text-muted); }
  .cover-meta span { margin-right: 24px; }

  /* Sections */
  .section { margin-bottom: 36px; page-break-inside: avoid; }
  .section-label { font-family: var(--font-mono); font-size: 7.5pt; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 16px; }

  /* Exec summary */
  .exec-box { background: #f0ece2; border-left: 4px solid var(--accent); padding: 20px 24px; }
  .exec-box p { margin-bottom: 10px; font-size: 10.5pt; }
  .exec-box p:last-child { margin-bottom: 0; }

  /* Logic Map */
  .core-claim { font-family: var(--font-display); font-size: 11pt; font-weight: 700; margin-bottom: 16px; padding: 12px 16px; border: 1px solid var(--border); background: white; }
  .logic-section { margin-bottom: 14px; }
  .logic-title { font-family: var(--font-mono); font-size: 7.5pt; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
  .logic-item { font-size: 9.5pt; margin-bottom: 4px; padding-left: 12px; color: var(--text); }

  /* Bull / Bear */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 36px; }
  .bull-box { border-top: 3px solid var(--bull); padding-top: 12px; }
  .bear-box { border-top: 3px solid var(--bear); padding-top: 12px; }
  .bull-label { font-family: var(--font-mono); font-size: 7.5pt; letter-spacing: 0.14em; text-transform: uppercase; color: var(--bull); margin-bottom: 12px; }
  .bear-label { font-family: var(--font-mono); font-size: 7.5pt; letter-spacing: 0.14em; text-transform: uppercase; color: var(--bear); margin-bottom: 12px; }
  .bull-box p, .bear-box p { font-size: 9.5pt; margin-bottom: 9px; }

  /* Blind spot */
  .blind-box { border-left: 4px solid var(--blind); padding: 16px 20px; background: #f5f2fc; }
  .blind-box p { font-size: 10pt; margin-bottom: 9px; }
  .blind-box p:last-child { margin-bottom: 0; }

  /* Questions */
  .q-item { margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--border); }
  .q-item:last-child { border-bottom: none; }
  .q-text { font-family: var(--font-display); font-weight: 700; font-size: 10.5pt; margin-bottom: 6px; }
  .q-meta { font-size: 9pt; color: var(--text-muted); margin-top: 4px; }

  /* Footer */
  .doc-footer { border-top: 1px solid var(--border); margin-top: 48px; padding-top: 16px; font-family: var(--font-mono); font-size: 7.5pt; color: var(--text-muted); display: flex; justify-content: space-between; }

  /* Print */
  .print-btn { position: fixed; top: 20px; right: 20px; background: var(--accent); color: white; border: none; padding: 10px 20px; font-family: var(--font-display); font-weight: 700; font-size: 9pt; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; border-radius: 3px; }
  @media print {
    .print-btn { display: none; }
    body { background: white; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; }
  }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Print / Save PDF</button>
<div class="page">

  <div class="cover">
    <div class="cover-logo">◼ UNSEEN — Adversarial Strategy Intelligence</div>
    <div class="cover-title">${esc(r.meta.clientName)}</div>
    <div class="cover-sub">${esc(r.meta.analysisType)}</div>
    <div class="cover-meta">
      <span>Date: ${date}</span>
      <span>Model: ${esc(r.meta.model)}</span>
      <span>Confidential</span>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Executive Summary</div>
    <div class="exec-box">${nl2p(r.executiveSummary)}</div>
  </div>

  <div class="section">
    <div class="section-label">Logical Structure</div>
    <div class="core-claim">${esc(r.logicMap.coreClaim)}</div>
    ${logicHtml}
  </div>

  <div class="two-col">
    <div class="bull-box">
      <div class="bull-label">▲ Bull Case</div>
      ${nl2p(r.bullCase)}
    </div>
    <div class="bear-box">
      <div class="bear-label">▼ Bear Case</div>
      ${nl2p(r.bearCase)}
    </div>
  </div>

  <div class="section">
    <div class="section-label">◈ Blind Spot Analysis</div>
    <div class="blind-box">${nl2p(r.blindSpot)}</div>
  </div>

  <div class="section">
    <div class="section-label">? Unasked Questions</div>
    ${questionsHtml}
  </div>

  <div class="doc-footer">
    <span>Generated by UNSEEN</span>
    <span>${date}</span>
    <span>Confidential — For Advisor Use Only</span>
  </div>

</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

async function runAnalysis(jobId, text, analysisType, clientName) {
  const update = (stage, progress) => {
    const job = jobs.get(jobId);
    if (!job) {
      return;
    }
    job.stage = stage;
    job.progress = progress;
  };

  try {
    const job = jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    const result = await analyzeDocument(text, analysisType, clientName, update);
    job.status = 'complete';
    job.progress = 100;
    job.stage = 'Complete';
    job.result = result;
  } catch (err) {
    console.error('[UNSEEN] Analysis error:', err.status, err.message);
    const job = jobs.get(jobId);
    if (!job) return;
    job.status = 'error';
    // Surface Anthropic API errors clearly (wrong key, model, quota, etc.)
    if (err.status === 401) job.error = 'Invalid API key. Check your .env file.';
    else if (err.status === 404) job.error = 'Model not found. Check model name in agents.js.';
    else if (err.status === 429) job.error = 'Rate limit or quota exceeded.';
    else job.error = err.message || 'Unknown error during analysis.';
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > 24 * 60 * 60 * 1000) {
      jobs.delete(id);
    }
  }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`UNSEEN running at http://localhost:${PORT}`);
});
