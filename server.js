const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'candidates.json');
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');
const AI_RESULTS_DIR = path.join(__dirname, 'data', 'ai-results');

// Initialize Anthropic client
const anthropic = new Anthropic();

// Multer for transcript uploads
const transcriptStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: function(req, file, cb) {
    cb(null, 'transcript_' + Date.now() + path.extname(file.originalname));
  }
});
const transcriptUpload = multer({
  storage: transcriptStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    const allowed = ['.txt', '.doc', '.docx', '.pdf', '.vtt', '.srt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('許可されていないファイル形式です'));
  }
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    const safeName = req.params.id + '_' + Date.now() + ext;
    cb(null, safeName);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('許可されていないファイル形式です'));
    }
  }
});

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

// POST /api/candidates/:id/resume — upload resume file
app.post('/api/candidates/:id/resume', upload.single('resume'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'ファイルが選択されていません' });
  }

  const candidates = readCandidates();
  const candidate = candidates.find(c => c.id === req.params.id);
  if (!candidate) {
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ success: false, error: '候補者が見つかりません' });
  }

  candidate.resumeFile = req.file.filename;
  candidate.resumeOriginal = req.file.originalname;
  candidate.timeline.push({
    date: new Date().toISOString(),
    action: '履歴書アップロード',
    note: req.file.originalname
  });

  writeCandidates(candidates);
  res.json({ success: true, data: candidate });
});

// GET /api/candidates/:id/resume — download resume file
app.get('/api/candidates/:id/resume', (req, res) => {
  const candidates = readCandidates();
  const candidate = candidates.find(c => c.id === req.params.id);
  if (!candidate || !candidate.resumeFile) {
    return res.status(404).json({ success: false, error: 'ファイルが見つかりません' });
  }

  const filePath = path.join(UPLOADS_DIR, candidate.resumeFile);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'ファイルが見つかりません' });
  }

  res.download(filePath, candidate.resumeOriginal);
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

// GET /api/reports — report & analytics data
app.get('/api/reports', (req, res) => {
  const candidates = readCandidates();
  const total = candidates.length;
  const joined = candidates.filter(c => c.status === 'joined').length;
  const declined = candidates.filter(c => c.status === 'declined').length;
  const scored = candidates.filter(c => c.totalScore !== null && c.totalScore !== undefined);
  const avgScore = scored.length ? +(scored.reduce((s, c) => s + c.totalScore, 0) / scored.length).toFixed(1) : null;

  // Average days to hire
  const daysArr = [];
  candidates.filter(c => c.status === 'joined').forEach(c => {
    const start = new Date(c.createdAt);
    let end = null;
    (c.timeline || []).forEach(t => {
      if (t.action && (t.action.includes('入職') || t.action.includes('joined'))) end = new Date(t.date);
    });
    if (!end) end = new Date();
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (days >= 0) daysArr.push(days);
  });
  const avgDays = daysArr.length ? Math.round(daysArr.reduce((s, d) => s + d, 0) / daysArr.length) : null;

  // Monthly trends (last 12 months)
  const now = new Date();
  const monthlyTrends = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const count = candidates.filter(c => {
      if (!c.createdAt) return false;
      const cd = new Date(c.createdAt);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    }).length;
    monthlyTrends.push({ month: key, count });
  }

  res.json({
    success: true,
    data: {
      kpi: {
        total,
        joined,
        declined,
        active: total - joined - declined,
        avgScore,
        avgDays,
        scoredCount: scored.length,
        daysCount: daysArr.length
      },
      monthlyTrends
    }
  });
});

// ═══════════════════ AI ANALYSIS ENDPOINTS ═══════════════════

// Ensure AI results directory exists
function ensureAiDir() {
  if (!fs.existsSync(AI_RESULTS_DIR)) fs.mkdirSync(AI_RESULTS_DIR, { recursive: true });
}

// POST /api/ai/resume-analyze — AI analysis of resume text
app.post('/api/ai/resume-analyze', async (req, res) => {
  const { candidateId, resumeText, candidateName, job } = req.body;
  if (!resumeText || !resumeText.trim()) {
    return res.status(400).json({ success: false, error: '履歴書テキストが必要です' });
  }

  const JOB_JP = { doctor: '医師', nurse: '看護師', clerk: '医療事務' };
  const jobLabel = JOB_JP[job] || '医療従事者';

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `あなたは医療法人の採用コンサルタントです。以下の履歴書テキストを分析し、JSON形式で結果を返してください。

応募職種: ${jobLabel}
候補者名: ${candidateName || '不明'}

【履歴書テキスト】
${resumeText}

以下のJSON形式で回答してください（日本語で）:
{
  "summary": "候補者の概要（2-3文）",
  "strengths": [
    {"title": "強み1のタイトル", "detail": "具体的な説明", "score": 5},
    {"title": "強み2のタイトル", "detail": "具体的な説明", "score": 4}
  ],
  "risks": [
    {"title": "リスク1のタイトル", "detail": "具体的な説明", "severity": "high|medium|low"},
    {"title": "リスク2のタイトル", "detail": "具体的な説明", "severity": "high|medium|low"}
  ],
  "retentionRisk": {
    "level": "high|medium|low",
    "reason": "離職リスクの根拠（転職回数、在籍期間パターンなど）"
  },
  "philosophyFit": {
    "score": 4,
    "comment": "医療理念との適合性コメント"
  },
  "suggestedQuestions": [
    {"question": "面接で確認すべき質問1", "intent": "この質問で確認したいポイント"},
    {"question": "面接で確認すべき質問2", "intent": "この質問で確認したいポイント"},
    {"question": "面接で確認すべき質問3", "intent": "この質問で確認したいポイント"},
    {"question": "面接で確認すべき質問4", "intent": "この質問で確認したいポイント"},
    {"question": "面接で確認すべき質問5", "intent": "この質問で確認したいポイント"}
  ],
  "overallScore": 75,
  "recommendation": "採用推奨度コメント（合格/要検討/不推奨）"
}

必ず有効なJSONのみを返してください。マークダウンやコードブロックは不要です。`
      }]
    });

    const responseText = message.content[0].text.trim();
    let analysis;
    try {
      // Try to parse, strip markdown code fences if present
      const cleaned = responseText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = { raw: responseText, parseError: true };
    }

    // Save result
    if (candidateId) {
      ensureAiDir();
      const resultFile = path.join(AI_RESULTS_DIR, candidateId + '_resume.json');
      const result = { ...analysis, analyzedAt: new Date().toISOString(), candidateId };
      fs.writeFileSync(resultFile, JSON.stringify(result, null, 2), 'utf-8');

      // Update candidate timeline
      const candidates = readCandidates();
      const candidate = candidates.find(c => c.id === candidateId);
      if (candidate) {
        candidate.resumeAnalysis = result;
        candidate.timeline.push({
          date: new Date().toISOString(),
          action: 'AI履歴書分析完了',
          note: '総合スコア: ' + (analysis.overallScore || '--') + '/100'
        });
        writeCandidates(candidates);
      }
    }

    res.json({ success: true, data: analysis });
  } catch (err) {
    console.error('AI Resume Analysis Error:', err.message);
    res.status(500).json({ success: false, error: 'AI分析に失敗しました: ' + err.message });
  }
});

// POST /api/ai/transcript-analyze — AI analysis of interview transcript
app.post('/api/ai/transcript-analyze', async (req, res) => {
  const { candidateId, transcript, candidateName, job } = req.body;
  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ success: false, error: '文字起こしテキストが必要です' });
  }

  const JOB_JP = { doctor: '医師', nurse: '看護師', clerk: '医療事務' };
  const jobLabel = JOB_JP[job] || '医療従事者';

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 5000,
      messages: [{
        role: 'user',
        content: `あなたは医療法人の採用面接の専門評価者です。以下のGoogle Meet面接の文字起こしを分析し、JSON形式で詳細な評価結果を返してください。

応募職種: ${jobLabel}
候補者名: ${candidateName || '不明'}

【面接文字起こし】
${transcript}

以下のJSON形式で回答してください（日本語で）:
{
  "summary": "面接全体の概要（3-4文）",
  "categories": [
    {
      "name": "理念・価値観",
      "score": 5,
      "maxScore": 5,
      "findings": "この分野での候補者の回答内容と評価理由",
      "quotes": ["関連する発言の引用"]
    },
    {
      "name": "患者対応・ケア",
      "score": 4,
      "maxScore": 5,
      "findings": "この分野での候補者の回答内容と評価理由",
      "quotes": ["関連する発言の引用"]
    },
    {
      "name": "チームワーク",
      "score": 4,
      "maxScore": 5,
      "findings": "この分野での候補者の回答内容と評価理由",
      "quotes": ["関連する発言の引用"]
    },
    {
      "name": "成長意欲",
      "score": 3,
      "maxScore": 5,
      "findings": "この分野での候補者の回答内容と評価理由",
      "quotes": ["関連する発言の引用"]
    },
    {
      "name": "専門性・スキル",
      "score": 4,
      "maxScore": 5,
      "findings": "この分野での候補者の回答内容と評価理由",
      "quotes": ["関連する発言の引用"]
    }
  ],
  "philosophyAlignment": {
    "score": 8,
    "maxScore": 10,
    "detail": "法人理念との整合性について詳しく分析"
  },
  "retentionPrediction": {
    "risk": "low|medium|high",
    "detail": "この候補者が長期間働き続ける可能性について分析。面接の中で見られた定着に関する兆候",
    "positiveSignals": ["定着に繋がるポジティブな発言や態度"],
    "warningSignals": ["離職リスクを示唆する発言や態度"]
  },
  "organizationBenefit": {
    "score": 8,
    "maxScore": 10,
    "detail": "この候補者が法人にもたらす具体的なプラスの効果",
    "contributions": ["具体的な貢献ポイント"]
  },
  "communicationSkills": {
    "score": 4,
    "maxScore": 5,
    "detail": "コミュニケーション能力の評価"
  },
  "redFlags": [
    {"flag": "懸念点の内容", "severity": "high|medium|low", "detail": "具体的な説明"}
  ],
  "totalScore": 82,
  "maxTotalScore": 100,
  "verdict": "合格|要検討|不合格",
  "verdictReason": "最終判定の理由（3-4文）",
  "followUpActions": ["今後のアクション1", "今後のアクション2"]
}

必ず有効なJSONのみを返してください。マークダウンやコードブロックは不要です。`
      }]
    });

    const responseText = message.content[0].text.trim();
    let analysis;
    try {
      const cleaned = responseText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = { raw: responseText, parseError: true };
    }

    // Save result
    if (candidateId) {
      ensureAiDir();
      const resultFile = path.join(AI_RESULTS_DIR, candidateId + '_transcript.json');
      const result = { ...analysis, analyzedAt: new Date().toISOString(), candidateId };
      fs.writeFileSync(resultFile, JSON.stringify(result, null, 2), 'utf-8');

      // Update candidate
      const candidates = readCandidates();
      const candidate = candidates.find(c => c.id === candidateId);
      if (candidate) {
        candidate.transcriptAnalysis = result;
        candidate.timeline.push({
          date: new Date().toISOString(),
          action: 'AI面接分析完了',
          note: '総合スコア: ' + (analysis.totalScore || '--') + '/' + (analysis.maxTotalScore || 100)
        });
        writeCandidates(candidates);
      }
    }

    res.json({ success: true, data: analysis });
  } catch (err) {
    console.error('AI Transcript Analysis Error:', err.message);
    res.status(500).json({ success: false, error: 'AI分析に失敗しました: ' + err.message });
  }
});

// GET /api/ai/results/:candidateId — get AI analysis results for a candidate
app.get('/api/ai/results/:candidateId', (req, res) => {
  const candidates = readCandidates();
  const candidate = candidates.find(c => c.id === req.params.candidateId);
  if (!candidate) {
    return res.status(404).json({ success: false, error: '候補者が見つかりません' });
  }

  res.json({
    success: true,
    data: {
      resumeAnalysis: candidate.resumeAnalysis || null,
      transcriptAnalysis: candidate.transcriptAnalysis || null
    }
  });
});

// POST /api/ai/transcript-upload — upload transcript file and extract text
app.post('/api/ai/transcript-upload', transcriptUpload.single('transcript'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'ファイルが選択されていません' });
  }
  try {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    // Clean up uploaded file after reading
    fs.unlinkSync(req.file.path);
    res.json({ success: true, data: { text: content, filename: req.file.originalname } });
  } catch {
    res.status(500).json({ success: false, error: 'ファイルの読み込みに失敗しました' });
  }
});

// Serve recruitment.html as the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'recruitment.html'));
});

// Start server
app.listen(PORT, () => {
  console.log('採用管理システム サーバー起動: http://localhost:' + PORT);
});
