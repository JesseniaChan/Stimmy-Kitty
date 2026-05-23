const BACKEND_URL = 'https://YOUR-PROJECT.vercel.app/api/search'; // Replace with your Vercel deployment URL

const stimModeButton = document.getElementById('stimModeButton');
const searchModeButton = document.getElementById('searchModeButton');
const kittyLabel = document.getElementById('kittyLabel');
const searchPanel = document.getElementById('searchPanel');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const kittyBlock = document.querySelector('.kitty-block');
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

const PARTICLE_COLORS = ['#c9a0dc', '#f5c6e8', '#ffffff', '#e0baff', '#a0d4dc'];
const PARTICLE_COUNT = 16;
const CANVAS_SIZE = 180;

let particles = [];
let animating = false;
let activeMode = 'stim';

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;
canvas.style.width = '100%';
canvas.style.height = '100%';
ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

function setMode(mode) {
  activeMode = mode;
  if (mode === 'stim') {
    stimModeButton.classList.add('active');
    searchModeButton.classList.remove('active');
    searchPanel.classList.add('hidden');
    kittyLabel.textContent = 'tap the kitty';
    statusEl.textContent = '';
  } else {
    stimModeButton.classList.remove('active');
    searchModeButton.classList.add('active');
    searchPanel.classList.remove('hidden');
    kittyLabel.textContent = 'type a search and tap search';
  }
}

function createParticle(x, y) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 1.5 + Math.random() * 3;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1,
    decay: 0.015 + Math.random() * 0.02,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
  };
}

function spawnParticles(x, y, count = PARTICLE_COUNT) {
  for (let i = 0; i < count; i += 1) {
    particles.push(createParticle(x, y));
  }
  startAnimation();
}

function drawParticles() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  particles = particles.filter((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= particle.decay;
    const alpha = Math.max(particle.life, 0);
    if (alpha <= 0) {
      return false;
    }

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return true;
  });
}

function animationLoop() {
  if (particles.length > 0) {
    drawParticles();
    requestAnimationFrame(animationLoop);
  } else {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    animating = false;
  }
}

function startAnimation() {
  if (!animating) {
    animating = true;
    requestAnimationFrame(animationLoop);
  }
}

function triggerSparkles() {
  spawnParticles(CANVAS_SIZE / 2, CANVAS_SIZE / 2, PARTICLE_COUNT * 2);
}

kittyBlock.addEventListener('click', (event) => {
  if (activeMode !== 'stim') {
    return;
  }
  const rect = kittyBlock.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * CANVAS_SIZE;
  const y = ((event.clientY - rect.top) / rect.height) * CANVAS_SIZE;
  spawnParticles(x, y);
});

stimModeButton.addEventListener('click', () => setMode('stim'));
searchModeButton.addEventListener('click', () => setMode('search'));

async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    statusEl.textContent = 'Please enter a search query.';
    return;
  }

  statusEl.textContent = 'Searching...';
  searchButton.disabled = true;
  resultsEl.innerHTML = '';

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Search failed');
    }

    if (!Array.isArray(data.results)) {
      throw new Error('Unexpected response from backend');
    }

    data.results.forEach((item, index) => {
      setTimeout(() => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
          <p class="result-title">${item.name}</p>
          <span class="result-pill">${item.tag}</span>
          <p class="result-detail">${item.detail}</p>
        `;
        resultsEl.appendChild(card);
        requestAnimationFrame(() => card.classList.add('visible'));
      }, index * 130);
    });

    statusEl.textContent = '';
    triggerSparkles();
  } catch (error) {
    console.error(error);
    statusEl.textContent = error.message || 'Unable to complete the search.';
  } finally {
    searchButton.disabled = false;
  }
}

searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    handleSearch();
  }
});

setMode('stim');
