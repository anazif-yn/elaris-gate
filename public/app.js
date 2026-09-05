const form = document.getElementById('user-form');
const stepForm = document.getElementById('step-form');
const stepLinking = document.getElementById('step-linking');
const stepBubbles = document.getElementById('step-bubbles');
const stepStory = document.getElementById('step-story');
const bubblesGrid = document.getElementById('bubbles-grid');
const btnComplete = document.getElementById('btn-complete');
const storyContent = document.getElementById('story-content');
const toast = document.getElementById('toast');

let socket = null;
let sessionId = null;
let currentLetters = Array(9).fill('');

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

  // Enable Complete button only when at least some letters have arrived
  // (or always enable after connection – adjust as you prefer)
  const hasAny = letters.some(l => l && l.trim());
  btnComplete.disabled = !hasAny;
}

// Form submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-next');
  btn.disabled = true;
  btn.textContent = 'Connecting…';

  const data = {
    surname: document.getElementById('surname').value.trim(),
    firstName: document.getElementById('firstName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim()
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

    // Show linking message briefly
    showStep(stepLinking);

    // Connect socket and join room
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

    // After a short delay move to bubbles
    setTimeout(() => {
      showStep(stepBubbles);
      showToast('Connection established');
    }, 1800);

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Something went wrong');
    btn.disabled = false;
    btn.textContent = 'Next';
  }
});

// Complete button → show the story
btnComplete.addEventListener('click', () => {
  const story = `In the kingdom of Elaris, Princess Elowen was forbidden from leaving the palace after sunset.

No one told her why.

Every night, when the moon reached its highest point, a black horse would appear beyond the palace gates. Upon its back sat a knight dressed in silver armor, his face hidden behind a helmet without an opening.

He never spoke.

He never entered.

He simply waited.

For seven years, the knight came.

And every night, Princess Elowen watched him from her tower.

Then, on the night before her eighteenth birthday, curiosity defeated fear.

She slipped past the guards, wrapped herself in a dark cloak, and walked beyond the palace gates.

The knight was waiting.

"Who are you?" she asked.

For the first time in seven years, he moved.

Slowly, he removed his helmet.

Elowen gasped.

His face was young. Too young.

And strangely familiar.

"You know me," he whispered.

She stared at him. "I've never seen you before."

"Not in this life."

Before she could ask what he meant, the castle bells began to ring.

The knight suddenly looked terrified.

"You must return to the palace."

"Why?"

"Because when the final bell rings..." He mounted his horse. "...they will remember that I failed to save you."

The final bell echoed.

The knight began to disappear.

Elowen reached for him, but her hand passed through his armor like smoke.

"Wait!" she cried. "Save me from what?"

His voice faded with the wind.

"From me."

The next morning, the kingdom celebrated Princess Elowen's birthday.

But no one remembered the knight.

No one except her.

And beneath her bed, where there had been nothing the night before, lay an old silver helmet.

Inside it were three words carved into the metal:

I remember everything.`;

  storyContent.textContent = story;
  showStep(stepStory);
});
