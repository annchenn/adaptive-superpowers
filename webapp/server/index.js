const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

const mockEvents = require('./mock-events');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Serve static client build in production
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Paths relative to this file (server/)
const EVENTS_FILE = path.join(__dirname, '..', '..', 'events.jsonl');
const EVAL_LOG_FILE = path.join(__dirname, '..', '..', 'evaluation-log.json');
const SKILLS_DIR = path.join(__dirname, '..', '..', 'skills');

const USE_MOCK = process.env.MOCK === 'true';

/**
 * Read all events from events.jsonl.
 * Returns parsed array (or mock data if MOCK=true).
 */
function readAllEvents() {
  if (USE_MOCK) {
    return mockEvents;
  }
  if (!fs.existsSync(EVENTS_FILE)) {
    return [];
  }
  const content = fs.readFileSync(EVENTS_FILE, 'utf8').trim();
  if (!content) return [];
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Read the last line of events.jsonl and parse it as JSON.
 * Returns null if file is empty or doesn't exist.
 */
function readLastEvent() {
  if (!fs.existsSync(EVENTS_FILE)) return null;
  const content = fs.readFileSync(EVENTS_FILE, 'utf8').trim();
  if (!content) return null;
  const lines = content.split('\n').filter(line => line.trim());
  const lastLine = lines[lines.length - 1];
  try {
    return JSON.parse(lastLine);
  } catch {
    return null;
  }
}

// --- REST endpoints ---

app.get('/api/events', (req, res) => {
  res.json(readAllEvents());
});

app.get('/api/evaluation-log', (req, res) => {
  if (USE_MOCK) {
    return res.json({
      skill: "data-migration",
      winner: "v2.md",
      candidates: [
        { file: "v1.md", scores: { compliance: 30, coverage: 22, conciseness: 20 }, total: 72 },
        { file: "v2.md", scores: { compliance: 38, coverage: 28, conciseness: 22 }, total: 88 },
        { file: "v3.md", scores: { compliance: 25, coverage: 20, conciseness: 25 }, total: 70 },
      ]
    });
  }
  if (!fs.existsSync(EVAL_LOG_FILE)) {
    return res.json(null);
  }
  try {
    const content = fs.readFileSync(EVAL_LOG_FILE, 'utf8');
    res.json(JSON.parse(content));
  } catch {
    res.json(null);
  }
});

app.get('/api/skills', (req, res) => {
  if (!fs.existsSync(SKILLS_DIR)) {
    return res.json([]);
  }
  try {
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory())
      .map(e => e.name);
    res.json(dirs);
  } catch {
    res.json([]);
  }
});

app.get('/api/step-detail/:skill', (req, res) => {
  const { skill } = req.params;
  const events = readAllEvents();
  const filtered = events.filter(e => e && e.skill === skill);
  res.json(filtered);
});

app.post('/api/event', (req, res) => {
  const { skill, status, data } = req.body;
  if (!skill || !status) {
    return res.status(400).json({ ok: false, error: 'skill and status are required' });
  }
  const timestamp = new Date().toISOString();
  const event = { timestamp, skill, status, data: data ?? {} };
  const line = JSON.stringify(event) + '\n';
  try {
    fs.appendFileSync(EVENTS_FILE, line, 'utf8');
    io.emit('new-event', event);
    console.log(`[api/event] ${skill} → ${status}`);
    res.json({ ok: true, event });
  } catch (err) {
    console.error('[api/event] write error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/control/clear', (req, res) => {
  try {
    if (fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, '', 'utf8');
    io.emit('init-events', []);
    console.log('[api/control/clear] events cleared');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/control/gap-detection', (req, res) => {
  res.json({ ok: true, message: 'Gap detection triggered' });
});

app.post('/api/control/evaluate', (req, res) => {
  res.json({ ok: true, message: 'Evaluation triggered' });
});

app.post('/api/control/deploy', (req, res) => {
  res.json({ ok: true, message: 'Deployment approved' });
});

// --- Socket.io ---

io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  // Send all existing events immediately
  const allEvents = readAllEvents();
  socket.emit('init-events', allEvents);

  socket.on('disconnect', () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
  });
});

// --- File watcher ---

if (!USE_MOCK) {
  // Watch the events.jsonl file for changes
  const watcher = chokidar.watch(EVENTS_FILE, {
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    interval: 500
  });

  watcher.on('change', () => {
    const lastEvent = readLastEvent();
    if (lastEvent) {
      console.log('[watcher] new event:', lastEvent);
      io.emit('new-event', lastEvent);
    }
  });

  watcher.on('add', () => {
    console.log('[watcher] events.jsonl created');
  });

  console.log(`[watcher] watching: ${EVENTS_FILE}`);
} else {
  console.log('[mock] MOCK=true — using mock events, file watcher disabled');
}

// --- Start server ---

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] MOCK mode: ${USE_MOCK}`);
});
