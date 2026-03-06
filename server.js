const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'candidates.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

// Read candidates from file
function readCandidates() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Write candidates to file
function writeCandidates(candidates) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(candidates, null, 2), 'utf-8');
}

// ═══════════════════ API ROUTES ═══════════════════

// GET /api/candidates — list all candidates (with optional filters)
app.get('/api/candidates', (req, res) => {
  let candidates = readCandidates();
  const { job, status, source, search } = req.query;

  if (job) candidates = candidates.filter(c => c.job === job);
  if (status) candidates = candidates.filter(c => c.status === status);
  if (source) candidates = candidates.filter(c => c.source === source);
  if (search) {
    const q = search.toLowerCase();
    candidates = candidates.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.furigana || '').toLowerCase().includes(q)
    );
  }

  res.json({ success: true, data: candidates });
});

// GET /api/candidates/:id — get a single candidate
app.get('/api/candidates/:id', (req, res) => {
  const candidates = readCandidates();
  const candidate = candidates.find(c => c.id === req.params.id);
  if (!candidate) {
    return res.status(404).json({ success: false, error: '候補者が見つかりません' });
  }
  res.json({ success: true, data: candidate });
});

// POST /api/candidates — create a new candidate
app.post('/api/candidates', (req, res) => {
  const { name, furigana, job, source, interviewDate, phone, email, currentWorkplace, experience, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: '氏名は必須です' });
  }

  const candidate = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    furigana: (furigana || '').trim(),
    job: job || 'doctor',
    source: source || 'agency',
    interviewDate: interviewDate || '',
    phone: (phone || '').trim(),
    email: (email || '').trim(),
    currentWorkplace: (currentWorkplace || '').trim(),
    experience: experience || '',
    notes: (notes || '').trim(),
    status: 'scheduled',
    scores: [],
    answers: [],
    totalScore: null,
    createdAt: new Date().toISOString(),
    timeline: [{ date: new Date().toISOString(), action: '候補者登録', note: '' }]
  };

  const candidates = readCandidates();
  candidates.push(candidate);
  writeCandidates(candidates);

  res.status(201).json({ success: true, data: candidate });
});

// PUT /api/candidates/:id — update a candidate
app.put('/api/candidates/:id', (req, res) => {
  const candidates = readCandidates();
  const idx = candidates.findIndex(c => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: '候補者が見つかりません' });
  }

  const updates = req.body;
  // Merge updates into existing candidate (preserving id and createdAt)
  const existing = candidates[idx];
  Object.keys(updates).forEach(key => {
    if (key !== 'id' && key !== 'createdAt') {
      existing[key] = updates[key];
    }
  });

  candidates[idx] = existing;
  writeCandidates(candidates);

  res.json({ success: true, data: existing });
});

// PUT /api/candidates/:id/status — change candidate status
app.put('/api/candidates/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, error: 'ステータスは必須です' });
  }

  const candidates = readCandidates();
  const candidate = candidates.find(c => c.id === req.params.id);
  if (!candidate) {
    return res.status(404).json({ success: false, error: '候補者が見つかりません' });
  }

  if (candidate.status === status) {
    return res.json({ success: true, data: candidate });
  }

  candidate.status = status;
  candidate.timeline.push({
    date: new Date().toISOString(),
    action: 'ステータス変更: ' + status,
    note: ''
  });

  writeCandidates(candidates);
  res.json({ success: true, data: candidate });
});

// PUT /api/candidates/:id/interview — save interview scores and answers
app.put('/api/candidates/:id/interview', (req, res) => {
  const { scores, answers } = req.body;
  if (!scores || !Array.isArray(scores)) {
    return res.status(400).json({ success: false, error: 'スコアデータが不正です' });
  }

  const candidates = readCandidates();
  const candidate = candidates.find(c => c.id === req.params.id);
  if (!candidate) {
    return res.status(404).json({ success: false, error: '候補者が見つかりません' });
  }

  candidate.scores = scores;
  candidate.answers = answers || [];
  candidate.totalScore = scores.reduce((a, b) => a + b, 0);

  if (candidate.status === 'scheduled') {
    candidate.status = 'interviewed';
  }

  const maxScore = scores.length * 5;
  candidate.timeline.push({
    date: new Date().toISOString(),
    action: '面接評価完了',
    note: '総合スコア: ' + candidate.totalScore + '/' + maxScore
  });

  writeCandidates(candidates);
  res.json({ success: true, data: candidate });
});

// DELETE /api/candidates/:id — delete a candidate
app.delete('/api/candidates/:id', (req, res) => {
  const candidates = readCandidates();
  const idx = candidates.findIndex(c => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: '候補者が見つかりません' });
  }

  candidates.splice(idx, 1);
  writeCandidates(candidates);

  res.json({ success: true, message: '候補者を削除しました' });
});

// GET /api/stats — dashboard statistics
app.get('/api/stats', (req, res) => {
  const candidates = readCandidates();
  const total = candidates.length;
  const byStatus = {};
  candidates.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });

  res.json({
    success: true,
    data: {
      total,
      active: total - (byStatus.declined || 0) - (byStatus.joined || 0),
      interviewed: (byStatus.interviewed || 0) + (byStatus.offer || 0) + (byStatus.negotiating || 0) + (byStatus.accepted || 0) + (byStatus.joined || 0),
      offer: (byStatus.offer || 0) + (byStatus.negotiating || 0) + (byStatus.accepted || 0),
      joined: byStatus.joined || 0,
      pipeline: {
        scheduled: byStatus.scheduled || 0,
        interviewed: byStatus.interviewed || 0,
        offer: byStatus.offer || 0,
        negotiating: (byStatus.negotiating || 0) + (byStatus.waiting || 0),
        accepted: byStatus.accepted || 0,
        joined: byStatus.joined || 0
      }
    }
  });
});

// Serve recruitment.html as the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'recruitment.html'));
});

// Start server
app.listen(PORT, () => {
  console.log('採用管理システム サーバー起動: http://localhost:' + PORT);
});
