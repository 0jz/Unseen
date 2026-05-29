require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
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

app.post('/api/analyze', upload.single('document'), async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY in .env.' });
    }

    const { analysisType = 'strategic_review', clientName = 'Client', pastedText } = req.body;
    let rawText = '';

    if (req.file) {
      rawText = await extractText(req.file.path, req.file.originalname);
      setTimeout(() => {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }, 24 * 60 * 60 * 1000);
    } else if (pastedText) {
      rawText = pastedText;
    } else {
      return res.status(400).json({ error: 'No document or text provided.' });
    }

    if (!rawText || rawText.trim().length < 100) {
      return res.status(400).json({ error: 'Document too short or could not be read.' });
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
    if (!job) {
      return;
    }

    job.status = 'running';
    const result = await analyzeDocument(text, analysisType, clientName, update);
    job.status = 'complete';
    job.progress = 100;
    job.stage = 'Complete';
    job.result = result;
  } catch (err) {
    console.error('Analysis error:', err);
    const job = jobs.get(jobId);
    if (!job) {
      return;
    }
    job.status = 'error';
    job.error = err.message;
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
